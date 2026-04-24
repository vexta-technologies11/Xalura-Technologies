import fs from "fs";
import path from "path";
import type { AgenticLiveSnapshot } from "@/lib/agenticLiveSnapshot";
import type { AgenticLiveDeptId } from "@/lib/agenticLiveSnapshot";
import { getAgenticRoot } from "@/xalura-agentic/lib/paths";

export type HierarchySource = "live" | "example";

export type HierarchyPersona = {
  id: string;
  displayName: string;
  /** e.g. "Chief AI", "Manager · SEO" */
  position: string;
  /** Short desk line under the name */
  subtitle: string;
  /** Deterministic pipeline summary (always shown as fallback / under Gemini) */
  facts: string;
  /** Parsed Manager Decision block from latest `logs/{dept}/cycle-*.md` (managers only) */
  managerChecklist?: string;
  source: HierarchySource;
};

export type HierarchyLane = {
  deptId: AgenticLiveDeptId;
  deptLabel: string;
  executive: HierarchyPersona;
  manager: HierarchyPersona;
  worker: HierarchyPersona;
};

export type HierarchyChartPayload = {
  chief: HierarchyPersona;
  lanes: HierarchyLane[];
  /** Optional first-person blurbs keyed by `HierarchyPersona.id` — from Gemini */
  narratives?: Record<string, string>;
};

function readLatestCycleMd(dept: string, cwd: string): string | null {
  const dir = path.join(getAgenticRoot(cwd), "logs", dept);
  try {
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir).filter((f) => /^cycle-\d+\.md$/i.test(f));
    if (!files.length) return null;
    let bestN = -1;
    let bestFile = "";
    for (const f of files) {
      const m = f.match(/cycle-(\d+)\.md/i);
      const n = m ? parseInt(m[1]!, 10) : 0;
      if (n >= bestN) {
        bestN = n;
        bestFile = f;
      }
    }
    return fs.readFileSync(path.join(dir, bestFile), "utf8");
  } catch {
    return null;
  }
}

export function parseManagerBlockFromCycleMd(md: string): {
  approved: boolean | null;
  reason: string;
  checklistBlock: string;
} {
  const decision = md.match(/## Manager Decision([\s\S]*?)(?=## Notes|$)/i);
  const block = decision?.[1]?.trim() ?? "";
  const rejected = /-\s*\[\s*x\s*\]\s*Rejected/i.test(block);
  const approved = /-\s*\[\s*x\s*\]\s*Approved/i.test(block);
  const reasonM = md.match(/\*\*Reason:\*\*\s*([\s\S]*?)(?=\n## Notes|\n## [A-Z]|\z)/im);
  const reason = reasonM?.[1]?.replace(/\s+/g, " ").trim().slice(0, 600) ?? "";
  return {
    approved: rejected ? false : approved ? true : null,
    reason,
    checklistBlock: block.slice(0, 1200),
  };
}

function deptLabel(id: AgenticLiveDeptId): string {
  if (id === "seo") return "SEO";
  if (id === "marketing") return "Marketing";
  return "Publishing";
}

function lanePersonas(
  dept: AgenticLiveDeptId,
  d: AgenticLiveSnapshot["departments"][number],
  cwd: string,
): HierarchyLane {
  const label = deptLabel(dept);
  const cycleMd = readLatestCycleMd(dept, cwd);
  const parsed = cycleMd ? parseManagerBlockFromCycleMd(cycleMd) : null;
  const mgrCheck = parsed?.checklistBlock
    ? `**Manager checklist (latest cycle log)**\n${parsed.checklistBlock}`
    : undefined;
  const mgrFacts =
    parsed?.reason && parsed.reason.length > 0
      ? `${d.manager} — Reason: ${parsed.reason}`
      : d.manager;

  return {
    deptId: dept,
    deptLabel: label,
    executive: {
      id: `${dept}_executive`,
      displayName: `${label} Executive`,
      position: `Executive · ${label}`,
      subtitle: "Handoff & cross-desk visibility",
      facts: d.executive,
      source: d.source,
    },
    manager: {
      id: `${dept}_manager`,
      displayName: `${label} Manager`,
      position: `Manager · ${label}`,
      subtitle: "Quality gate · checklist in cycle log",
      facts: mgrFacts,
      managerChecklist: mgrCheck,
      source: d.source,
    },
    worker: {
      id: `${dept}_worker`,
      displayName: `${label} Worker`,
      position: `Worker · ${label}`,
      subtitle: "Research, drafting, tooling",
      facts: d.worker,
      source: d.source,
    },
  };
}

function chiefPersona(snap: AgenticLiveSnapshot): HierarchyPersona {
  const tail = snap.tail.slice(-5);
  const tailText = tail.map((t) => `${t.type}: ${t.summary}`).join(" · ");
  const fail = snap.failed_hint ? ` Last issue: ${snap.failed_hint}` : "";
  const facts =
    tailText.length > 0
      ? `Recent pipeline: ${tailText}.${fail}`
      : `No recent events in queue.${fail}`.trim();
  return {
    id: "chief",
    displayName: "Chief AI",
    position: "Chief AI",
    subtitle: "Fleet read · audits & cadence",
    facts,
    source: snap.departments.some((x) => x.source === "live") ? "live" : "example",
  };
}

export function buildHierarchyChartPayload(
  cwd: string,
  snap: AgenticLiveSnapshot,
): HierarchyChartPayload {
  const lanes = snap.departments.map((d) => lanePersonas(d.id, d, cwd));
  return {
    chief: chiefPersona(snap),
    lanes,
  };
}
