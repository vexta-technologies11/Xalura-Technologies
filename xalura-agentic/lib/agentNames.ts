import path from "path";
import type { DepartmentId } from "../engine/departments";
import {
  isAgenticDiskWritable,
  readFileUtf8Agentic,
  writeFileUtf8Agentic,
} from "./agenticDisk";
import { getAgenticRoot } from "./paths";

/** Display name, optional org title, optional avatar URL (`.jpg` / `/public/…` path / https). */
export type NameTitleAvatar = {
  name: string;
  title?: string;
  avatar?: string;
};

export type DepartmentNameEntry = {
  worker: NameTitleAvatar;
  manager: NameTitleAvatar;
  executive: NameTitleAvatar;
  /**
   * Ten fixed content-pillar lanes (`sc-…` ids) — one SEO Worker and one Publishing Worker
   * per public library column; used by the live hierarchy and `assignedName` overrides.
   */
  workersByPillar?: Record<string, NameTitleAvatar>;
};

export type AgentNamesConfig = {
  note?: string;
  departments: Record<DepartmentId, DepartmentNameEntry>;
  chiefAI: NameTitleAvatar;
  /** Post-publish compliance advisory; optional — empty keeps generic UI label. */
  complianceOfficer?: NameTitleAvatar;
  /** Publishing hero (Imagen) step; optional — empty keeps generic UI label. */
  graphicDesigner?: NameTitleAvatar;
};

const defaultName = (): NameTitleAvatar => ({ name: "" });

const DEFAULT: AgentNamesConfig = {
  departments: {
    marketing: { worker: defaultName(), manager: defaultName(), executive: defaultName() },
    publishing: { worker: defaultName(), manager: defaultName(), executive: defaultName() },
    seo: { worker: defaultName(), manager: defaultName(), executive: defaultName() },
  },
  chiefAI: defaultName(),
  complianceOfficer: defaultName(),
  graphicDesigner: defaultName(),
};

function mergeNtaFromPartial(
  base: NameTitleAvatar,
  p: Partial<NameTitleAvatar> | undefined,
): NameTitleAvatar {
  if (!p) return base;
  return {
    name: p.name !== undefined ? p.name.trim().slice(0, 120) : base.name,
    title: p.title !== undefined ? p.title.trim().slice(0, 200) : base.title,
    avatar: p.avatar !== undefined ? p.avatar.trim().slice(0, 500) : base.avatar,
  };
}

function mergeWorkersByPillar(
  a: Record<string, NameTitleAvatar> | undefined,
  b: Record<string, NameTitleAvatar> | undefined,
): Record<string, NameTitleAvatar> | undefined {
  const hasA = a && Object.keys(a).length > 0;
  const hasB = b && Object.keys(b).length > 0;
  if (!hasA && !hasB) return undefined;
  const union = { ...a, ...b };
  const out: Record<string, NameTitleAvatar> = {};
  for (const k of Object.keys(union)) {
    out[k] = mergeNtaFromPartial(a?.[k] ?? { name: "" }, b?.[k]);
  }
  return out;
}

function mergeConfig(parsed: Partial<AgentNamesConfig>): AgentNamesConfig {
  const d = (id: DepartmentId) => ({
    ...DEFAULT.departments[id],
    ...parsed.departments?.[id],
    worker: mergeNtaFromPartial(
      DEFAULT.departments[id].worker,
      parsed.departments?.[id]?.worker,
    ),
    manager: mergeNtaFromPartial(
      DEFAULT.departments[id].manager,
      parsed.departments?.[id]?.manager,
    ),
    executive: mergeNtaFromPartial(
      DEFAULT.departments[id].executive,
      parsed.departments?.[id]?.executive,
    ),
    workersByPillar: mergeWorkersByPillar(
      DEFAULT.departments[id].workersByPillar,
      parsed.departments?.[id]?.workersByPillar,
    ),
  });
  return {
    ...DEFAULT,
    ...parsed,
    note: typeof parsed.note === "string" ? parsed.note : DEFAULT.note,
    chiefAI: mergeNtaFromPartial(DEFAULT.chiefAI, parsed.chiefAI),
    complianceOfficer: mergeNtaFromPartial(
      DEFAULT.complianceOfficer!,
      parsed.complianceOfficer,
    ),
    graphicDesigner: mergeNtaFromPartial(
      DEFAULT.graphicDesigner!,
      parsed.graphicDesigner,
    ),
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

export type PersonaFieldUpdate = { name?: string; title?: string; avatar?: string };

function mergeNta(
  prev: NameTitleAvatar | undefined,
  fields: PersonaFieldUpdate,
): NameTitleAvatar {
  const p = prev ?? { name: "" };
  return {
    name: fields.name !== undefined ? fields.name.trim().slice(0, 120) : p.name,
    title: fields.title !== undefined ? fields.title.trim().slice(0, 200) : p.title,
    avatar: fields.avatar !== undefined ? fields.avatar.trim().slice(0, 500) : p.avatar,
  };
}

/**
 * Update name / title / avatar for one hierarchy persona in a mutable `AgentNamesConfig`.
 * At least one field must be present.
 */
export function setPersonaFieldsInConfig(
  config: AgentNamesConfig,
  personaId: string,
  fields: PersonaFieldUpdate,
): void {
  if (!fields || (fields.name === undefined && fields.title === undefined && fields.avatar === undefined)) {
    throw new Error("At least one of name, title, avatar is required");
  }
  if (personaId === "chief") {
    config.chiefAI = mergeNta(config.chiefAI, fields);
    return;
  }
  if (personaId === "compliance_officer") {
    config.complianceOfficer = mergeNta(config.complianceOfficer, fields);
    return;
  }
  if (personaId === "publishing_graphic_designer") {
    config.graphicDesigner = mergeNta(config.graphicDesigner, fields);
    return;
  }
  const pw = PILLAR_WORKER_RE.exec(personaId);
  if (pw) {
    const dept = pw[1]! as "seo" | "publishing";
    const lane = pw[2]!.trim();
    if (!config.departments[dept].workersByPillar) {
      config.departments[dept].workersByPillar = {};
    }
    const prev = config.departments[dept].workersByPillar![lane];
    config.departments[dept].workersByPillar![lane] = mergeNta(prev, fields);
    return;
  }
  const m = PERSONA_ID_RE.exec(personaId);
  if (m) {
    const dept = m[1]! as DepartmentId;
    const role = m[2]! as "worker" | "manager" | "executive";
    const prev = config.departments[dept][role];
    config.departments[dept][role] = mergeNta(prev, fields);
    return;
  }
  throw new Error(`Unknown persona id: ${personaId}`);
}

/** @deprecated use setPersonaFieldsInConfig with `{ name }` */
export function setPersonaNameInConfig(
  config: AgentNamesConfig,
  personaId: string,
  name: string,
): void {
  setPersonaFieldsInConfig(config, personaId, { name });
}
