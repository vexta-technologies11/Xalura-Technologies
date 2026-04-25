import fs from "fs";
import path from "path";
import { parseManagerBlockFromCycleMd } from "@/lib/agenticHierarchyChartData";
import type { AgenticLiveSnapshot } from "@/lib/agenticLiveSnapshot";
import { readEvents } from "@/xalura-agentic/lib/eventQueue";
import { ARTICLE_SUBCATEGORY_AGENT_LANE_ID_LIST } from "@/lib/articleSubcategoryAgentLanes";
import type { DepartmentId } from "@/xalura-agentic/engine/departments";
import { getAgenticRoot } from "@/xalura-agentic/lib/paths";

export type PersonaActivityKind =
  | "worker_output"
  | "manager_decision"
  | "executive_audit"
  | "chief_audit"
  | "publish_event"
  | "note";

export type PersonaActivityEntry = {
  at: string;
  source: string;
  kind: PersonaActivityKind;
  label: string;
  detail?: string;
};

const DEPTS: DepartmentId[] = ["marketing", "publishing", "seo"];

/** Cycle log under `logs/{dept}/lanes/{laneId}/` → `seo_worker_{laneId}`; unscoped → first pillar. */
function workerPersonaIdForCycleLog(dept: DepartmentId, rel: string): string {
  if (dept === "marketing") return "marketing_worker";
  const m = new RegExp(`^logs/${dept}/lanes/([^/]+)/`).exec(rel);
  if (m) return `${dept}_worker_${m[1]!}`;
  if (dept === "seo" || dept === "publishing") {
    return `${dept}_worker_${ARTICLE_SUBCATEGORY_AGENT_LANE_ID_LIST[0]!}`;
  }
  return "marketing_worker";
}

function relFromRoot(abs: string, root: string): string {
  const r = path.relative(root, abs).replace(/\\/g, "/");
  return r || abs;
}

function walkFiles(dir: string, match: (name: string) => boolean, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    let st: fs.Stats;
    try {
      st = fs.statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walkFiles(p, match, out);
    else if (match(name)) out.push(p);
  }
}

function listCycleMdsForDept(root: string, dept: string): { abs: string; mtime: number }[] {
  const base = path.join(root, "logs", dept);
  const out: string[] = [];
  walkFiles(base, (n) => /^cycle-\d+\.md$/i.test(n), out);
  return out
    .map((abs) => {
      let mtime = 0;
      try {
        mtime = fs.statSync(abs).mtimeMs;
      } catch {
        mtime = 0;
      }
      return { abs, mtime };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

function listAuditMdsForDept(root: string, dept: string): { abs: string; mtime: number }[] {
  const base = path.join(root, "logs", dept);
  const out: string[] = [];
  walkFiles(base, (n) => /^audit-cycle-\d+\.md$/i.test(n), out);
  return out
    .map((abs) => {
      let mtime = 0;
      try {
        mtime = fs.statSync(abs).mtimeMs;
      } catch {
        mtime = 0;
      }
      return { abs, mtime };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

function listAllAuditPaths(root: string): { abs: string; mtime: number }[] {
  const out: string[] = [];
  walkFiles(path.join(root, "logs"), (n) => /^audit-cycle-\d+\.md$/i.test(n), out);
  return out
    .map((abs) => {
      let mtime = 0;
      try {
        mtime = fs.statSync(abs).mtimeMs;
      } catch {
        mtime = 0;
      }
      return { abs, mtime };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

function parseOutputExcerpt(md: string): { excerpt: string; date: string } {
  const dateM = md.match(/\*\*Date:\*\*\s*([^\n]+)/i);
  const date = dateM?.[1]?.trim() ?? "";
  const out = md.match(/## Output\n([\s\S]*?)(?=## Manager Decision|$)/i);
  const raw = out?.[1]?.replace(/\s+/g, " ").trim() ?? "";
  const excerpt = raw.length > 420 ? `${raw.slice(0, 420)}…` : raw;
  return { excerpt, date };
}

function parseAuditExecutiveLine(md: string): string {
  const ex = md.match(/\*\*Executive Agent:\*\*\s*([^\n]+)/i);
  return ex?.[1]?.trim() ?? "";
}

function parseAuditChiefScore(md: string): string {
  const s = md.match(/## Chief AI Score:\s*([^\n]+)/i);
  return s?.[1]?.trim() ?? "";
}

function parseChiefLiveSession(md: string): string {
  const live = md.match(/## Chief AI \(live session\)\s*\n([\s\S]+?)(?=\n---\s*$|\z)/i);
  if (live?.[1]) {
    const t = live[1].replace(/\s+/g, " ").trim();
    return t.length > 500 ? `${t.slice(0, 500)}…` : t;
  }
  const alt = md.match(/## Chief score\s*\n([^\n]+)/i);
  if (alt?.[1]) return alt[1].trim();
  return "";
}

function pushUnique(
  map: Record<string, PersonaActivityEntry[]>,
  id: string,
  e: PersonaActivityEntry,
  limit: number,
) {
  if (!map[id]) map[id] = [];
  if (map[id]!.length >= limit) return;
  map[id]!.push(e);
}

/**
 * Up to `limit` recent activity lines per hierarchy card id (e.g. `seo_worker_sc-smb-automation`, `chief`).
 * Sources: `cycle-*.md`, `audit-cycle-*.md`, and `ARTICLE_PUBLISHED` from the event queue.
 */
export function buildPersonaActivity(
  cwd: string,
  _snap: AgenticLiveSnapshot,
  limit = 20,
): Record<string, PersonaActivityEntry[]> {
  const root = getAgenticRoot(cwd);
  const map: Record<string, PersonaActivityEntry[]> = {};
  const chiefAuditPaths = listAllAuditPaths(root);

  for (const dept of DEPTS) {
    const cycles = listCycleMdsForDept(root, dept);
    for (const { abs, mtime } of cycles.slice(0, limit)) {
      let md: string;
      try {
        md = fs.readFileSync(abs, "utf8");
      } catch {
        continue;
      }
      const rel = relFromRoot(abs, root);
      const { excerpt, date } = parseOutputExcerpt(md);
      const parsed = parseManagerBlockFromCycleMd(md);
      const decision =
        parsed.approved === true
          ? "APPROVED"
          : parsed.approved === false
            ? "REJECTED"
            : "PENDING/UNKNOWN";
      const workerId = workerPersonaIdForCycleLog(dept, rel);
      pushUnique(
        map,
        workerId,
        {
          at: new Date(mtime).toISOString(),
          source: rel,
          kind: "worker_output",
          label: date ? `Cycle output (${date})` : "Worker output (latest cycle file)",
          detail: excerpt || "(no ## Output block parsed)",
        },
        limit,
      );
      pushUnique(
        map,
        `${dept}_manager`,
        {
          at: new Date(mtime).toISOString(),
          source: rel,
          kind: "manager_decision",
          label: `Manager: ${decision}`,
          detail:
            parsed.reason ||
            (parsed.checklistBlock ? parsed.checklistBlock.slice(0, 400) : "—"),
        },
        limit,
      );
    }

    const audits = listAuditMdsForDept(root, dept);
    for (const { abs, mtime } of audits) {
      if (map[`${dept}_executive`]?.length >= limit) break;
      let md: string;
      try {
        md = fs.readFileSync(abs, "utf8");
      } catch {
        continue;
      }
      const rel = relFromRoot(abs, root);
      const execName = parseAuditExecutiveLine(md);
      const score = parseAuditChiefScore(md);
      pushUnique(
        map,
        `${dept}_executive`,
        {
          at: new Date(mtime).toISOString(),
          source: rel,
          kind: "executive_audit",
          label: `10-cycle audit — Executive: ${execName || "—"}`,
          detail: score ? `Stub score line: ${score} (replaced when Chief enriches live)` : undefined,
        },
        limit,
      );
    }
  }

  for (const { abs, mtime } of chiefAuditPaths.slice(0, limit)) {
    let md = "";
    try {
      md = fs.readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    pushUnique(
      map,
      "chief",
      {
        at: new Date(mtime).toISOString(),
        source: relFromRoot(abs, root),
        kind: "chief_audit",
        label: "Audit window (Chief read)",
        detail: parseChiefLiveSession(md) || parseAuditExecutiveLine(md) || md.slice(0, 400),
      },
      limit,
    );
  }

  const events = readEvents(cwd).filter((e) => e.type === "ARTICLE_PUBLISHED");
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]!;
    if (e.type !== "ARTICLE_PUBLISHED") continue;
    const title = e.payload.title;
    const t = e.ts;
    pushUnique(
      map,
      "compliance_officer",
      {
        at: t,
        source: "shared/event-queue.log",
        kind: "publish_event",
        label: `Advisory review context: “${title.slice(0, 100)}${title.length > 100 ? "…" : ""}”`,
        detail:
          "Post-publish compliance/founder path when enabled; Publishing Manager still owns the gate before go-live.",
      },
      limit,
    );
    pushUnique(
      map,
      "publishing_graphic_designer",
      {
        at: t,
        source: "shared/event-queue.log",
        kind: "publish_event",
        label: `Publish shipped: “${title.slice(0, 100)}${title.length > 100 ? "…" : ""}”`,
        detail: "Cover image (Leonardo photoreal or Imagen) runs on the publishing pipeline when AGENTIC_GRAPHIC_DESIGNER_ON_PUBLISH is on.",
      },
      limit,
    );
  }

  const staticIds: string[] = [
    "chief",
    "compliance_officer",
    "publishing_graphic_designer",
    "marketing_executive",
    "marketing_manager",
    "marketing_worker",
    "publishing_executive",
    "publishing_manager",
    "seo_executive",
    "seo_manager",
  ];
  for (const id of staticIds) {
    if (!map[id]) map[id] = [];
  }
  for (const lane of ARTICLE_SUBCATEGORY_AGENT_LANE_ID_LIST) {
    for (const d of ["seo", "publishing"] as const) {
      const id = `${d}_worker_${lane}`;
      if (!map[id]) map[id] = [];
    }
  }

  return map;
}
