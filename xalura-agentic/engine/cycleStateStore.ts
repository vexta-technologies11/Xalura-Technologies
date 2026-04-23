import fs from "fs";
import path from "path";
import type { DepartmentId } from "./departments";
import { DEPARTMENT_IDS } from "./departments";
import { isAgenticDiskWritable, writeFileUtf8Agentic } from "../lib/agenticDisk";
import { getAgenticRoot } from "../lib/paths";

export type DepartmentCycleState = {
  /** Approvals recorded in the current 1–10 window (0 = none yet). */
  approvalsInWindow: number;
  /** How many full audit files have been written for this department. */
  auditsCompleted: number;
};

export type CycleStateFile = {
  version: 2;
  departments: Record<DepartmentId, DepartmentCycleState>;
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
  return { version: 2, departments };
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
    if (parsed.version !== 2 || !parsed.departments) {
      return defaultState();
    }
    const merged = defaultState();
    for (const id of DEPARTMENT_IDS) {
      const d = parsed.departments[id];
      if (d && typeof d.approvalsInWindow === "number") {
        merged.departments[id] = {
          approvalsInWindow: Math.max(0, Math.min(10, d.approvalsInWindow)),
          auditsCompleted: Math.max(0, d.auditsCompleted ?? 0),
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
  writeFileUtf8Agentic(p, JSON.stringify(state, null, 2));
}
