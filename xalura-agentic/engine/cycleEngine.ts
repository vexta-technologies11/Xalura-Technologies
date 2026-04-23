import path from "path";
import type { DepartmentId } from "./departments";
import { mkdirRecursiveAgentic, writeFileUtf8Agentic } from "../lib/agenticDisk";
import { loadCycleState, saveCycleState } from "./cycleStateStore";
import { getAgenticRoot } from "../lib/paths";
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
};

export type RecordApprovalResult = {
  cycleIndex: number;
  cycleFileRelative: string;
  auditTriggered: boolean;
  auditFileRelative?: string;
};

function logsDir(dept: DepartmentId, cwd: string): string {
  return path.join(getAgenticRoot(cwd), "logs", dept);
}

/**
 * Call when a Manager **approves** Worker output (one increment toward 10).
 * Writes `logs/{dept}/cycle-{n}.md`. At n=10, writes `audit-cycle-{k}.md` and resets window.
 */
export function recordApproval(
  input: RecordApprovalInput,
  cwd: string = process.cwd(),
): RecordApprovalResult {
  const state = loadCycleState(cwd);
  const d = state.departments[input.department];
  d.approvalsInWindow += 1;
  const cycleIndex = d.approvalsInWindow;

  const dateIso = new Date().toISOString().slice(0, 10);
  const dir = logsDir(input.department, cwd);
  mkdirRecursiveAgentic(dir);

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
  });

  const cycleRel = path.join("logs", input.department, `cycle-${cycleIndex}.md`);
  writeFileUtf8Agentic(path.join(getAgenticRoot(cwd), cycleRel), cycleBody);

  let auditTriggered = false;
  let auditRel: string | undefined;

  if (cycleIndex === CYCLES_PER_AUDIT) {
    auditTriggered = true;
    d.auditsCompleted += 1;
    const auditSeq = d.auditsCompleted;
    d.approvalsInWindow = 0;

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
    });

    auditRel = path.join("logs", input.department, `audit-cycle-${auditSeq}.md`);
    writeFileUtf8Agentic(path.join(getAgenticRoot(cwd), auditRel), auditBody);
  }

  saveCycleState(state, cwd);

  return {
    cycleIndex,
    cycleFileRelative: cycleRel.replace(/\\/g, "/"),
    auditTriggered,
    auditFileRelative: auditRel?.replace(/\\/g, "/"),
  };
}

/** Read-only snapshot for Chief stub / health. */
export function getCycleSnapshot(cwd: string = process.cwd()) {
  return loadCycleState(cwd);
}
