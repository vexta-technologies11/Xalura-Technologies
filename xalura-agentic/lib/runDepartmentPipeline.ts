import { runExecutive } from "../agents/executive";
import { runManager } from "../agents/manager";
import { runWorker } from "../agents/worker";
import {
  recordApproval,
  type RecordApprovalResult,
} from "../engine/cycleEngine";
import type { DepartmentId } from "../engine/departments";
import { parseManagerDecision } from "./managerDecision";

export type DepartmentPipelineInput = {
  task: string;
  keyword?: string;
  cycleLog?: string;
  cwd?: string;
  executiveName?: string;
};

export type DepartmentPipelineResult =
  | {
      status: "approved";
      workerOutput: string;
      managerOutput: string;
      executiveSummary: string;
      cycle: RecordApprovalResult;
    }
  | {
      status: "rejected";
      workerOutput: string;
      managerOutput: string;
      reason: string;
    }
  | {
      status: "error";
      stage: "worker" | "manager" | "executive";
      message: string;
    };

async function guardStep<T>(
  fn: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; message: string }> {
  try {
    const value = await fn();
    return { ok: true, value };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, message };
  }
}

export type RunDepartmentPipelineConfig = {
  departmentId: DepartmentId;
  /** Prompt label, e.g. "Marketing", "Publishing", "SEO & Audit" */
  departmentLabel: string;
  /** Cycle log task type: Campaign | Article | Keyword | Audit */
  taskType: string;
  /** Short name for Executive prompt, e.g. "Marketing" */
  executiveStoreLabel: string;
  input: DepartmentPipelineInput;
};

/**
 * Worker → Manager → Executive → `recordApproval` for any of the three departments.
 */
export async function runDepartmentPipeline(
  config: RunDepartmentPipelineConfig,
): Promise<DepartmentPipelineResult> {
  const { departmentId, departmentLabel, taskType, executiveStoreLabel, input } =
    config;
  const cwd = input.cwd ?? process.cwd();
  const DEPT = departmentLabel;

  const w = await guardStep(() =>
    runWorker({
      role: "Worker",
      department: DEPT,
      task: input.task,
      context: input.keyword ? { keyword: input.keyword } : undefined,
      cycleLog: input.cycleLog,
    }),
  );
  if (!w.ok) {
    return { status: "error", stage: "worker", message: w.message };
  }
  const workerOutput = w.value;

  const managerTask = `Review the Worker output below.
First line MUST be exactly APPROVED or REJECTED.
Following lines: your reason (quality, brand, alignment with ${departmentLabel} goals).

---
${workerOutput}`;

  const m = await guardStep(() =>
    runManager({
      role: "Manager",
      department: DEPT,
      task: managerTask,
      context: workerOutput,
    }),
  );
  if (!m.ok) {
    return { status: "error", stage: "manager", message: m.message };
  }
  const managerOutput = m.value;

  const decision = parseManagerDecision(managerOutput);
  if (!decision.approved) {
    return {
      status: "rejected",
      workerOutput,
      managerOutput,
      reason: decision.reason,
    };
  }

  const e = await guardStep(() =>
    runExecutive({
      role: "Executive",
      department: DEPT,
      task: `Manager APPROVED this Worker output. Write a short executive summary (3–6 sentences) of what is being stored for the ${executiveStoreLabel} department.`,
      context: { workerOutput, managerReview: managerOutput },
    }),
  );
  if (!e.ok) {
    return { status: "error", stage: "executive", message: e.message };
  }
  const executiveSummary = e.value;

  const cycle = recordApproval(
    {
      department: departmentId,
      taskType,
      inputSummary: input.keyword
        ? `Keyword: ${input.keyword}\n\nTask:\n${input.task}`
        : input.task,
      outputSummary: workerOutput.slice(0, 12000),
      managerApproved: true,
      managerReason: decision.reason,
      executiveName: input.executiveName,
    },
    cwd,
  );

  return {
    status: "approved",
    workerOutput,
    managerOutput,
    executiveSummary,
    cycle,
  };
}
