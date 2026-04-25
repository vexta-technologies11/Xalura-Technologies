import fs from "fs";
import path from "path";
import type { PersonaActivityEntry } from "@/lib/agenticPersonaActivity";
import type { AgenticLiveSnapshot } from "@/lib/agenticLiveSnapshot";
import type { AgenticLiveDeptId } from "@/lib/agenticLiveSnapshot";
import {
  ARTICLE_SUBCATEGORY_AGENT_LANE_ID_LIST,
  articleSubcategoryTitleForAgentLaneId,
} from "@/lib/articleSubcategoryAgentLanes";
import type { AgentNamesConfig } from "@/xalura-agentic/lib/agentNames";
import { loadAgentNamesConfig } from "@/xalura-agentic/lib/agentNames";
import { getAgenticRoot } from "@/xalura-agentic/lib/paths";

const CHART_LANE_ORDER: AgenticLiveDeptId[] = ["seo", "publishing", "marketing"];

export type HierarchySource = "live" | "example";

export type HierarchyPersona = {
  id: string;
  displayName: string;
  /** e.g. "Chief AI", "Manager · SEO" (config `title` overrides generated copy) */
  position: string;
  /** Optional card image: `/…` or `https://…` (jpg/png/webp) */
  avatarUrl?: string;
  /** Short desk line (admin cards may hide; kept for tools) */
  subtitle?: string;
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
  /**
   * One Worker (marketing) or ten fixed pillar Workers (`sc-…`) for SEO and Publishing;
   * same ids as `logs/{dept}/lanes/{id}/` and `assignedName` / `config.agents.json` `workersByPillar`.
   */
  workers: HierarchyPersona[];
};

export type HierarchyEnvHints = {
  /** `AGENTIC_COMPLIANCE_ON_PUBLISH` or `AGENTIC_FOUNDER_OVERSIGHT_ON_PUBLISH` */
  complianceOrFounderEmailOn: boolean;
  /** `AGENTIC_GRAPHIC_DESIGNER_ON_PUBLISH` */
  graphicDesignerOn: boolean;
};

export type HierarchyChartPayload = {
  chief: HierarchyPersona;
  /** Visual-only: sits under Chief; code is post-publish advisory memo to Founder (no veto). */
  complianceOfficer: HierarchyPersona;
  lanes: HierarchyLane[];
  /** Visual-only: between Publishing Manager and Worker; code is `Publishing — Graphic Designer` + Imagen. */
  publishingGraphicDesigner: HierarchyPersona;
  /**
   * One plain-English line per `HierarchyPersona.id` for the **latest** `personaActivity[0]`.
   * Filled in `/api/admin/agentic-live` via Gemini (easy-to-read) with fallback to raw line.
   */
  lastActionSummaries: Record<string, string>;
  /** Legacy shape; per-card activity removed — use Supabase `agentic_pipeline_stage_log` in the bottom feed. */
  personaActivity: Record<string, PersonaActivityEntry[]>;
  /** `config/agents.json` (for display names; dashboard may PATCH) */
  agentNames: AgentNamesConfig;
};

export function readLatestCycleMd(dept: string, cwd: string): string | null {
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

function withConfiguredName(
  defaultDisplay: string,
  nameFromFile?: string,
): string {
  const t = nameFromFile?.trim();
  return t ? t : defaultDisplay;
}

function cleanAvatarUrl(raw?: string): string | undefined {
  const t = raw?.trim();
  if (!t) return undefined;
  if (t.length > 500) return t.slice(0, 500);
  return t;
}

function titleOr(
  fromConfig: string | undefined,
  generated: string,
): string {
  const t = fromConfig?.trim();
  return t && t.length > 0 ? t : generated;
}

function pillarWorkerPersonas(
  dept: "seo" | "publishing",
  d: AgenticLiveSnapshot["departments"][number],
  names: AgentNamesConfig,
): HierarchyPersona[] {
  const label = deptLabel(dept);
  const dnames = names.departments[dept]!;
  const byPillar = dnames.workersByPillar ?? {};
  return ARTICLE_SUBCATEGORY_AGENT_LANE_ID_LIST.map((laneId) => {
    const pillar = articleSubcategoryTitleForAgentLaneId(laneId) ?? laneId;
    const entry = byPillar[laneId];
    const custom = entry?.name?.trim();
    const defaultDisplay = `${pillar} · ${label} Worker`;
    return {
      id: `${dept}_worker_${laneId}`,
      displayName: withConfiguredName(defaultDisplay, custom),
      position: titleOr(
        entry?.title,
        `Worker · ${label} · ${pillar}`,
      ),
      avatarUrl: cleanAvatarUrl(entry?.avatar),
      facts: d.worker,
      source: d.source,
    };
  });
}

function lanePersonas(
  dept: AgenticLiveDeptId,
  d: AgenticLiveSnapshot["departments"][number],
  cwd: string,
  names: AgentNamesConfig,
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
  const dnames = names.departments[dept]!;

  const workers: HierarchyPersona[] =
    dept === "seo" || dept === "publishing"
      ? pillarWorkerPersonas(dept, d, names)
      : [
          {
            id: "marketing_worker",
            displayName: withConfiguredName(`${label} Worker`, dnames.worker.name),
            position: titleOr(dnames.worker.title, `Worker · ${label}`),
            avatarUrl: cleanAvatarUrl(dnames.worker.avatar),
            facts: d.worker,
            source: d.source,
          },
        ];

  return {
    deptId: dept,
    deptLabel: label,
    executive: {
      id: `${dept}_executive`,
      displayName: withConfiguredName(`${label} Executive`, dnames.executive.name),
      position: titleOr(dnames.executive.title, `Executive · ${label}`),
      avatarUrl: cleanAvatarUrl(dnames.executive.avatar),
      facts: d.executive,
      source: d.source,
    },
    manager: {
      id: `${dept}_manager`,
      displayName: withConfiguredName(`${label} Manager`, dnames.manager.name),
      position: titleOr(dnames.manager.title, `Manager · ${label}`),
      avatarUrl: cleanAvatarUrl(dnames.manager.avatar),
      facts: mgrFacts,
      managerChecklist: mgrCheck,
      source: d.source,
    },
    workers,
  };
}

function lastArticlePublishedLine(snap: AgenticLiveSnapshot): string | null {
  for (let i = snap.tail.length - 1; i >= 0; i--) {
    const t = snap.tail[i]!;
    if (t.type === "ARTICLE_PUBLISHED") return t.summary;
  }
  return null;
}

function compliancePersona(
  snap: AgenticLiveSnapshot,
  hints: HierarchyEnvHints,
  names: AgentNamesConfig,
): HierarchyPersona {
  const lastPub = lastArticlePublishedLine(snap);
  const pubHint = lastPub ? ` Last publish in tail: ${lastPub}` : "";
  if (hints.complianceOrFounderEmailOn) {
    return {
      id: "compliance_officer",
      displayName: withConfiguredName("Head of Compliance", names.complianceOfficer?.name),
      position: titleOr(
        names.complianceOfficer?.title,
        "Head of Compliance (advisory)",
      ),
      avatarUrl: cleanAvatarUrl(names.complianceOfficer?.avatar),
      facts: `Enabled for post-publish advisory run.${pubHint} Inbox falls back: AGENTIC_COMPLIANCE_EMAIL → AGENTIC_FOUNDER_OVERSIGHT_EMAIL → AGENTIC_CHIEF_DIGEST_EMAIL.`,
      source: "live",
    };
  }
  return {
    id: "compliance_officer",
    displayName: withConfiguredName("Head of Compliance", names.complianceOfficer?.name),
    position: titleOr(
      names.complianceOfficer?.title,
      "Head of Compliance (advisory)",
    ),
    avatarUrl: cleanAvatarUrl(names.complianceOfficer?.avatar),
    facts: `Currently off. Set AGENTIC_COMPLIANCE_ON_PUBLISH or AGENTIC_FOUNDER_OVERSIGHT_ON_PUBLISH and a recipient email.${pubHint}`,
    source: "example",
  };
}

function graphicDesignerPersona(
  snap: AgenticLiveSnapshot,
  hints: HierarchyEnvHints,
  names: AgentNamesConfig,
): HierarchyPersona {
  const pub = snap.departments.find((d) => d.id === "publishing");
  const lastPub = lastArticlePublishedLine(snap);
  const pubHint = lastPub ? ` Tail: ${lastPub}` : "";
  if (hints.graphicDesignerOn) {
    return {
      id: "publishing_graphic_designer",
      displayName: withConfiguredName("Graphic Designer", names.graphicDesigner?.name),
      position: titleOr(names.graphicDesigner?.title, "Graphic Designer · Publishing"),
      avatarUrl: cleanAvatarUrl(names.graphicDesigner?.avatar),
      facts: `Enabled. Uses same GEMINI_API_KEY as text; Publishing Manager still owns publish gate.${pubHint} Publishing desk: ${pub?.worker?.slice(0, 200) ?? "—"}`,
      source: pub?.source ?? "example",
    };
  }
  return {
    id: "publishing_graphic_designer",
    displayName: withConfiguredName("Graphic Designer", names.graphicDesigner?.name),
    position: titleOr(names.graphicDesigner?.title, "Graphic Designer · Publishing"),
    avatarUrl: cleanAvatarUrl(names.graphicDesigner?.avatar),
    facts: `Off — set AGENTIC_GRAPHIC_DESIGNER_ON_PUBLISH on the Worker.${pubHint}`,
    source: "example",
  };
}

function chiefPersona(snap: AgenticLiveSnapshot, names: AgentNamesConfig): HierarchyPersona {
  const tail = snap.tail.slice(-5);
  const tailText = tail.map((t) => `${t.type}: ${t.summary}`).join(" · ");
  const fail = snap.failed_hint ? ` Last issue: ${snap.failed_hint}` : "";
  const facts =
    tailText.length > 0
      ? `Recent pipeline: ${tailText}.${fail}`
      : `No recent events in queue.${fail}`.trim();
  return {
    id: "chief",
    displayName: withConfiguredName("Chief AI", names.chiefAI.name),
    position: titleOr(names.chiefAI.title, "Chief AI"),
    avatarUrl: cleanAvatarUrl(names.chiefAI.avatar),
    facts,
    source: snap.departments.some((x) => x.source === "live") ? "live" : "example",
  };
}

export function buildHierarchyChartPayload(
  cwd: string,
  snap: AgenticLiveSnapshot,
  envHints: HierarchyEnvHints,
  options?: { names?: AgentNamesConfig },
): HierarchyChartPayload {
  const names = options?.names ?? loadAgentNamesConfig(cwd);
  const orderIdx = (id: AgenticLiveDeptId) => {
    const i = CHART_LANE_ORDER.indexOf(id);
    return i < 0 ? 99 : i;
  };
  const lanes = [...snap.departments]
    .sort((a, b) => orderIdx(a.id) - orderIdx(b.id))
    .map((d) => lanePersonas(d.id, d, cwd, names));
  return {
    chief: chiefPersona(snap, names),
    complianceOfficer: compliancePersona(snap, envHints, names),
    publishingGraphicDesigner: graphicDesignerPersona(snap, envHints, names),
    lanes,
    lastActionSummaries: {},
    personaActivity: {},
    agentNames: names,
  };
}
