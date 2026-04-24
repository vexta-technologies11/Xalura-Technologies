import path from "path";
import type { DepartmentId } from "../engine/departments";
import {
  isAgenticDiskWritable,
  readFileUtf8Agentic,
  writeFileUtf8Agentic,
} from "./agenticDisk";
import { getAgenticRoot } from "./paths";

export type DepartmentNameEntry = {
  worker: { name: string };
  manager: { name: string };
  executive: { name: string };
  /**
   * Ten fixed content-pillar lanes (`sc-…` ids) — one SEO Worker and one Publishing Worker
   * per public library column; used by the live hierarchy and `assignedName` overrides.
   */
  workersByPillar?: Record<string, { name: string }>;
};

export type AgentNamesConfig = {
  note?: string;
  departments: Record<DepartmentId, DepartmentNameEntry>;
  chiefAI: { name: string };
  /** Post-publish compliance advisory; optional — empty keeps generic UI label. */
  complianceOfficer?: { name: string };
  /** Publishing hero (Imagen) step; optional — empty keeps generic UI label. */
  graphicDesigner?: { name: string };
};

const DEFAULT: AgentNamesConfig = {
  departments: {
    marketing: { worker: { name: "" }, manager: { name: "" }, executive: { name: "" } },
    publishing: { worker: { name: "" }, manager: { name: "" }, executive: { name: "" } },
    seo: { worker: { name: "" }, manager: { name: "" }, executive: { name: "" } },
  },
  chiefAI: { name: "" },
  complianceOfficer: { name: "" },
  graphicDesigner: { name: "" },
};

function mergeWorkersByPillar(
  a: Record<string, { name: string }> | undefined,
  b: Record<string, { name: string }> | undefined,
): Record<string, { name: string }> | undefined {
  const hasA = a && Object.keys(a).length > 0;
  const hasB = b && Object.keys(b).length > 0;
  if (!hasA && !hasB) return undefined;
  return { ...a, ...b };
}

function mergeConfig(parsed: Partial<AgentNamesConfig>): AgentNamesConfig {
  const d = (id: DepartmentId) => ({
    ...DEFAULT.departments[id],
    ...parsed.departments?.[id],
    worker: { ...DEFAULT.departments[id].worker, ...parsed.departments?.[id]?.worker },
    manager: { ...DEFAULT.departments[id].manager, ...parsed.departments?.[id]?.manager },
    executive: { ...DEFAULT.departments[id].executive, ...parsed.departments?.[id]?.executive },
    workersByPillar: mergeWorkersByPillar(
      DEFAULT.departments[id].workersByPillar,
      parsed.departments?.[id]?.workersByPillar,
    ),
  });
  return {
    ...DEFAULT,
    ...parsed,
    note: typeof parsed.note === "string" ? parsed.note : DEFAULT.note,
    chiefAI: { ...DEFAULT.chiefAI, ...parsed.chiefAI },
    complianceOfficer: {
      name: parsed.complianceOfficer?.name?.trim() ?? DEFAULT.complianceOfficer?.name ?? "",
    },
    graphicDesigner: {
      name: parsed.graphicDesigner?.name?.trim() ?? DEFAULT.graphicDesigner?.name ?? "",
    },
    departments: {
      marketing: d("marketing"),
      publishing: d("publishing"),
      seo: d("seo"),
    },
  };
}

export function loadAgentNamesConfig(cwd: string = process.cwd()): AgentNamesConfig {
  const p = path.join(getAgenticRoot(cwd), "config", "agents.json");
  try {
    const raw = readFileUtf8Agentic(p);
    if (raw == null) return { ...mergeConfig({}) };
    const parsed = JSON.parse(raw) as Partial<AgentNamesConfig>;
    if (!parsed?.departments || !parsed.chiefAI) return { ...mergeConfig({}) };
    return mergeConfig(parsed);
  } catch {
    return { ...mergeConfig({}) };
  }
}

/** Persist dashboard edits to `config/agents.json` (no-op on read-only Workers / edge). */
export function saveAgentNamesConfig(
  cwd: string,
  config: AgentNamesConfig,
): { ok: true } | { ok: false; error: string } {
  if (!isAgenticDiskWritable()) {
    return { ok: false, error: "Agentic config volume is not writable in this environment." };
  }
  const p = path.join(getAgenticRoot(cwd), "config", "agents.json");
  const merged = mergeConfig(config);
  const body = `${JSON.stringify(merged, null, 2)}\n`;
  try {
    writeFileUtf8Agentic(p, body);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

export function chiefDisplayName(cwd: string = process.cwd()): string | undefined {
  const n = loadAgentNamesConfig(cwd).chiefAI.name?.trim();
  return n || undefined;
}

export function complianceOfficerDisplayName(cwd: string = process.cwd()): string | undefined {
  const n = loadAgentNamesConfig(cwd).complianceOfficer?.name?.trim();
  return n || undefined;
}

export function graphicDesignerDisplayName(cwd: string = process.cwd()): string | undefined {
  const n = loadAgentNamesConfig(cwd).graphicDesigner?.name?.trim();
  return n || undefined;
}

/**
 * Configured executive name for prompts — omit when unset (unlike `executiveDisplayName` which falls back to "(unnamed)").
 */
export function getExecutiveAssignedName(
  dept: DepartmentId,
  cwd: string = process.cwd(),
  override?: string,
): string | undefined {
  const o = override?.trim();
  if (o) return o;
  const n = loadAgentNamesConfig(cwd).departments[dept]?.executive?.name?.trim();
  return n || undefined;
}

/**
 * Worker `assignedName` for Gemini: per-pillar override when `agentLaneId` is set (e.g. `sc-…`),
 * else department `worker.name`.
 */
export function getWorkerAssignedNameForLane(
  dept: DepartmentId,
  agentLaneId: string | undefined,
  dn: DepartmentNameEntry,
): string | undefined {
  const base = dn.worker.name?.trim();
  if (!agentLaneId?.trim() || (dept !== "seo" && dept !== "publishing")) {
    return base || undefined;
  }
  const lane = agentLaneId.trim();
  const pillar = dn.workersByPillar?.[lane]?.name?.trim();
  return (pillar || base) || undefined;
}

/**
 * `articles.author` for agentic site publish (Publishing Worker output).
 * When the dashboard name is empty, matches previous behavior: "Xalura Agentic".
 */
export function publishingWorkerArticleByline(cwd: string = process.cwd()): string {
  const n = loadAgentNamesConfig(cwd).departments.publishing.worker.name?.trim();
  return n || "Xalura Agentic";
}

/** Executive display name for audit markdown; falls back to "(unnamed)". */
export function executiveDisplayName(
  dept: DepartmentId,
  cwd: string = process.cwd(),
): string {
  const n = loadAgentNamesConfig(cwd).departments[dept]?.executive?.name?.trim();
  return n || "(unnamed)";
}

const PERSONA_ID_RE = /^(marketing|publishing|seo)_(worker|manager|executive)$/;
const PILLAR_WORKER_RE = /^(seo|publishing)_worker_(.+)$/;

/** Update a single `HierarchyPersona.id` entry in a mutable `AgentNamesConfig` (for dashboard saves). */
export function setPersonaNameInConfig(
  config: AgentNamesConfig,
  personaId: string,
  name: string,
): void {
  const t = name.trim().slice(0, 120);
  if (personaId === "chief") {
    config.chiefAI = { name: t };
    return;
  }
  if (personaId === "compliance_officer") {
    config.complianceOfficer = { name: t };
    return;
  }
  if (personaId === "publishing_graphic_designer") {
    config.graphicDesigner = { name: t };
    return;
  }
  const pw = PILLAR_WORKER_RE.exec(personaId);
  if (pw) {
    const dept = pw[1]! as "seo" | "publishing";
    const lane = pw[2]!.trim();
    if (!config.departments[dept].workersByPillar) {
      config.departments[dept].workersByPillar = {};
    }
    config.departments[dept].workersByPillar![lane] = { name: t };
    return;
  }
  const m = PERSONA_ID_RE.exec(personaId);
  if (m) {
    const dept = m[1]! as DepartmentId;
    const role = m[2]! as "worker" | "manager" | "executive";
    config.departments[dept][role] = { name: t };
    return;
  }
  throw new Error(`Unknown persona id: ${personaId}`);
}
