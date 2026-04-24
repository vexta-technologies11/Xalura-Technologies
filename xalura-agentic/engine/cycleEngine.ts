import path from "path";
import type { DepartmentId } from "./departments";
import { mkdirRecursiveAgentic, writeFileUtf8Agentic } from "../lib/agenticDisk";
import { isValidAgentLaneId } from "../lib/agentLaneIds";
import {
  agentLaneStateKey,
  loadCycleState,
  saveCycleState,
  type DepartmentCycleState,
} from "./cycleStateStore";
import { getAgenticRoot } from "../lib/paths";
import { withCycleLock } from "../lib/cycleLock";
import { renderAuditLog, renderCycleLog } from "../lib/templates";
import { AGENTIC_IMPLEMENTATION_PHASE } from "./version";

export { AGENTIC_IMPLEMENTATION_PHASE };

const CYCLES_PER_AUDIT = 10;

export type RecordApprovalInput = {
  department: DepartmentId;
  /** For markdown — optional */
  taskType?: string;
  inputSummary?: string;
  outputSummary?: string;
  managerApproved?: boolean;
  managerReason?: string;
  executiveName?: string;
  /**
   * `seo` / `publishing` only: isolated ladder per **topic** (topic bank id, preferred) or
   * catalog `vertical_id` (legacy). Logs: `logs/{dept}/lanes/{id}/`.
   */
  agentLaneId?: string;
};

export type RecordApprovalResult = {
  cycleIndex: number;
  cycleFileRelative: string;
  auditTriggered: boolean;
  auditFileRelative?: string;
};

function logsDir(dept: DepartmentId, cwd: string, agentLaneId?: string): string {
  const base = path.join(getAgenticRoot(cwd), "logs", dept);
  const vid = agentLaneId?.trim();
  if (vid && (dept === "seo" || dept === "publishing") && isValidAgentLaneId(vid)) {
    return path.join(base, "lanes", vid);
  }
  return base;
}

function resolveLaneKey(
  dept: DepartmentId,
  agentLaneId: string | undefined,
): string | null {
  const k = agentLaneStateKey(dept, agentLaneId);
  if (!k || !agentLaneId?.trim() || !isValidAgentLaneId(agentLaneId.trim())) {
    return null;
  }
  return k;
}

function ensureBucket(
  state: ReturnType<typeof loadCycleState>,
  dept: DepartmentId,
  laneKey: string | null,
): DepartmentCycleState {
  if (laneKey) {
    if (!state.agentLanes) state.agentLanes = {};
    if (!state.agentLanes[laneKey]) {
      state.agentLanes[laneKey] = { approvalsInWindow: 0, auditsCompleted: 0 };
    }
    return state.agentLanes[laneKey];
  }
  return state.departments[dept];
}

/**
 * Call when a Manager **approves** Worker output (one increment toward 10).
 * Writes `logs/{dept}/cycle-{n}.md` or `logs/{dept}/lanes/{vertical}/cycle-{n}.md`.
 * At n=10, writes `audit-cycle-{k}.md` in the same directory and resets that bucket.
 */
export async function recordApproval(
  input: RecordApprovalInput,
  cwd: string = process.cwd(),
): Promise<RecordApprovalResult> {
  return withCycleLock(() => {
    const state = loadCycleState(cwd);
    const laneKey = resolveLaneKey(input.department, input.agentLaneId);
    const bucket = ensureBucket(state, input.department, laneKey);

    bucket.approvalsInWindow += 1;
    const cycleIndex = bucket.approvalsInWindow;

    const dateIso = new Date().toISOString().slice(0, 10);
    const dir = logsDir(input.department, cwd, input.agentLaneId);
    mkdirRecursiveAgentic(dir);

    const laneNotes =
      laneKey && input.agentLaneId
        ? `**Agent lane (one article / topic):** \`${laneKey}\` — separate 10-cycle window from department default.`
        : undefined;

    const cycleBody = renderCycleLog({
      department: input.department,
      cycleNumber: cycleIndex,
      dateIso,
      agentRole: "Worker",
      taskType: input.taskType ?? "status",
      inputBlock: input.inputSummary ?? "<!-- What was given to the agent -->",
      outputBlock: input.outputSummary ?? "<!-- What the agent produced -->",
      managerApproved: input.managerApproved ?? true,
      managerReason: input.managerReason ?? "Approved (engine)",
      notes: laneNotes,
    });

    const relDir =
      laneKey && input.agentLaneId
        ? path.join("logs", input.department, "lanes", input.agentLaneId.trim())
        : path.join("logs", input.department);
    const cycleRel = path.join(relDir, `cycle-${cycleIndex}.md`);
    writeFileUtf8Agentic(path.join(getAgenticRoot(cwd), cycleRel), cycleBody);

    let auditTriggered = false;
    let auditRel: string | undefined;

    if (cycleIndex === CYCLES_PER_AUDIT) {
      auditTriggered = true;
      bucket.auditsCompleted += 1;
      const auditSeq = bucket.auditsCompleted;
      bucket.approvalsInWindow = 0;

      const rows = Array.from({ length: CYCLES_PER_AUDIT }, (_, i) => ({
        cycle: String(i + 1),
        output: "—",
        result: "approved",
        score: "—",
      }));

      const auditBody = renderAuditLog({
        department: input.department,
        auditSequence: auditSeq,
        dateIso,
        cyclesReviewed: `1–${CYCLES_PER_AUDIT}`,
        executiveName: input.executiveName ?? "(unnamed)",
        rows,
        chiefScore: "[1–10] (stub until Phase 7)",
        directive: "(stub — Chief AI in Phase 7)",
        strategyAdjustment: "(stub — Executive adjusts next window)",
        agentLaneLabel: laneKey ?? undefined,
      });

      auditRel = path.join(relDir, `audit-cycle-${auditSeq}.md`);
      writeFileUtf8Agentic(path.join(getAgenticRoot(cwd), auditRel), auditBody);
    }

    saveCycleState(state, cwd);

    return {
      cycleIndex,
      cycleFileRelative: cycleRel.replace(/\\/g, "/"),
      auditTriggered,
      auditFileRelative: auditRel?.replace(/\\/g, "/"),
    };
  });
}

/** Read-only snapshot for Chief stub / health. */
export function getCycleSnapshot(cwd: string = process.cwd()) {
  return loadCycleState(cwd);
}
