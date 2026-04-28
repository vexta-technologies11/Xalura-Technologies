import fs from "fs";
import path from "path";
import type { DepartmentId } from "./departments";
import { DEPARTMENT_IDS } from "./departments";
import { isAgenticDiskWritable, writeFileUtf8Agentic } from "../lib/agenticDisk";
import { isValidAgentLaneId } from "../lib/agentLaneIds";
import { getAgenticRoot } from "../lib/paths";

export type DepartmentCycleState = {
  /** Approvals recorded in the current 1–10 window (0 = none yet). */
  approvalsInWindow: number;
  /** How many full audit files have been written for this department. */
  auditsCompleted: number;
  /** Chief AI pause: ISO timestamp when pause expires, or null. */
  pausedUntil?: string | null;
  /** Chief AI pause: human-readable reason. */
  pausedReason?: string;
};

export type CycleStateFile = {
  /** v2: department-wide only. v3: + per-vertical agents for seo & publishing. */
  version: 2 | 3;
  departments: Record<DepartmentId, DepartmentCycleState>;
  /**
   * Isolated 10-cycle ladders per agent lane (`seo` / `publishing` only).
   * Key: `${department}:${laneId}` — **content pillar** `sc-…` (10 subcategory agents, preferred when
   * the article uses a public label), **topic bank id** `tp-…`, or catalog `vertical_id` (legacy).
   */
  agentLanes?: Record<string, DepartmentCycleState>;
};

/** In-process cycle state when Workers have no sync fs (see `agenticDisk.ts`). */
let memoryCycleState: CycleStateFile | null = null;

const FILE = "cycle-state.json";

function defaultDept(): DepartmentCycleState {
  return { approvalsInWindow: 0, auditsCompleted: 0 };
}

function defaultState(): CycleStateFile {
  const departments = {} as Record<DepartmentId, DepartmentCycleState>;
  for (const id of DEPARTMENT_IDS) {
    departments[id] = defaultDept();
  }
  return { version: 3, departments, agentLanes: {} };
}

/** When set for `seo` | `publishing`, approvals use an isolated lane (separate Chief ladder). */
export function agentLaneStateKey(
  dept: DepartmentId,
  laneId: string | undefined,
): string | null {
  const id = laneId?.trim();
  if (!id || (dept !== "seo" && dept !== "publishing")) return null;
  if (!isValidAgentLaneId(id)) return null;
  return `${dept}:${id.toLowerCase()}`;
}

export function getCycleStatePath(cwd: string = process.cwd()): string {
  return path.join(getAgenticRoot(cwd), "data", FILE);
}

export function loadCycleState(cwd: string = process.cwd()): CycleStateFile {
  if (!isAgenticDiskWritable()) {
    if (!memoryCycleState) memoryCycleState = defaultState();
    return memoryCycleState;
  }
  const p = getCycleStatePath(cwd);
  if (!fs.existsSync(p)) {
    return defaultState();
  }
  try {
    const raw = fs.readFileSync(p, "utf8");
    const parsed = JSON.parse(raw) as Partial<CycleStateFile>;
    if (!parsed.departments) {
      return defaultState();
    }
    if (parsed.version !== 2 && parsed.version !== 3) {
      return defaultState();
    }
    const merged = defaultState();
    for (const id of DEPARTMENT_IDS) {
      const d = parsed.departments[id];
      if (d && typeof d.approvalsInWindow === "number") {
        merged.departments[id] = {
          approvalsInWindow: Math.max(0, Math.min(10, d.approvalsInWindow)),
          auditsCompleted: Math.max(0, d.auditsCompleted ?? 0),
          pausedUntil: typeof d.pausedUntil === "string" ? d.pausedUntil : undefined,
          pausedReason: typeof d.pausedReason === "string" ? d.pausedReason : undefined,
        };
      }
    }
    const lanes = parsed.agentLanes;
    if (parsed.version === 3 && lanes && typeof lanes === "object") {
      for (const [k, v] of Object.entries(lanes)) {
        if (!k || typeof v !== "object" || v === null) continue;
        const d = v as Partial<DepartmentCycleState>;
        if (typeof d.approvalsInWindow !== "number") continue;
        merged.agentLanes![k] = {
          approvalsInWindow: Math.max(0, Math.min(10, d.approvalsInWindow)),
          auditsCompleted: Math.max(0, d.auditsCompleted ?? 0),
          pausedUntil: typeof d.pausedUntil === "string" ? d.pausedUntil : undefined,
          pausedReason: typeof d.pausedReason === "string" ? d.pausedReason : undefined,
        };
      }
    }
    return merged;
  } catch {
    return defaultState();
  }
}

export function saveCycleState(state: CycleStateFile, cwd: string = process.cwd()): void {
  if (!isAgenticDiskWritable()) {
    memoryCycleState = state;
    return;
  }
  const p = getCycleStatePath(cwd);
  const normalized: CycleStateFile = {
    version: 3,
    departments: state.departments,
    agentLanes: state.agentLanes ?? {},
  };
  writeFileUtf8Agentic(p, JSON.stringify(normalized, null, 2));
}

