import { runExecutive } from "../agents/executive";
import { runManager } from "../agents/manager";
import { runWorker } from "../agents/worker";
import {
  recordApproval,
  type RecordApprovalResult,
} from "../engine/cycleEngine";
import type { DepartmentId } from "../engine/departments";
import { executiveDisplayName } from "./agentNames";
import { enrichAuditWithChief } from "./chiefEnrichAudit";
import { parseManagerDecision } from "./managerDecision";

const MAX_MANAGER_ROUNDS = 3;
const MAX_ESCALATION_PHASES = 2;

export type DepartmentPipelineInput = {
  task: string;
  keyword?: string;
  cycleLog?: string;
  cwd?: string;
  executiveName?: string;
  /** When true, skip live Chief append after a 10-cycle audit (faster tests). */
  skipChiefEnrich?: boolean;
  /** Handoff wrappers only — skip KEYWORD_READY / ARTICLE_PUBLISHED gates (local tests). */
  skipUpstreamCheck?: boolean;
};

export type DepartmentPipelineResult =
  | {
      status: "approved";
      workerOutput: string;
      managerOutput: string;
      executiveSummary: string;
      cycle: RecordApprovalResult;
      managerAttempts: number;
    }
  | {
      status: "rejected";
      workerOutput: string;
      managerOutput: string;
      reason: string;
      managerAttempts: number;
    }
  | {
      status: "error";
      stage: "worker" | "manager" | "executive";
      message: string;
    }
  | {
      status: "discarded";
      workerOutput: string;
      managerOutputs: string[];
      executiveEscalation: string;
    }
  | {
      status: "rejected_after_escalation";
      workerOutput: string;
      managerOutputs: string[];
      executiveEscalation: string;
      reason: string;
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

function firstLineUpper(text: string): string {
  const line = text.trim().split(/\r?\n/)[0]?.trim().toUpperCase() ?? "";
  return line.replace(/[^A-Z_]/g, "");
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
 * Worker → Manager (up to 3 rounds) → optional Executive escalation → Executive summary → `recordApproval`.
 * After a 10-cycle audit file is written, optionally appends live Chief AI (Gemini).
 */
export async function runDepartmentPipeline(
  config: RunDepartmentPipelineConfig,
): Promise<DepartmentPipelineResult> {
  const { departmentId, departmentLabel, taskType, executiveStoreLabel, input } =
    config;
  const cwd = input.cwd ?? process.cwd();
  const DEPT = departmentLabel;
  const execName =
    input.executiveName?.trim() ||
    executiveDisplayName(departmentId, cwd);

  let escalationPhase = 0;
  let managerOutputs: string[] = [];
  let totalManagerAttempts = 0;
  let lastWorkerOutput = "";

  while (escalationPhase < MAX_ESCALATION_PHASES) {
    let workerOutput = "";
    let rejectionReasons: string[] = [];

    for (let attempt = 0; attempt < MAX_MANAGER_ROUNDS; attempt++) {
      totalManagerAttempts += 1;
      const revisionHint =
        attempt > 0
          ? `\n\n## Manager feedback (revision ${attempt + 1})\n${rejectionReasons[rejectionReasons.length - 1]}`
          : "";
      const phaseHint =
        escalationPhase > 0
          ? `\n\n## Executive instruction\nThe Executive ordered a full rewrite. Start fresh; do not assume prior drafts were acceptable.`
          : "";

      const workerTask =
        escalationPhase === 0 && attempt === 0
          ? input.task
          : `${input.task}${phaseHint}${revisionHint}`;

      const w = await guardStep(() =>
        runWorker({
          role: "Worker",
          department: DEPT,
          task: workerTask,
          context: input.keyword ? { keyword: input.keyword } : undefined,
          cycleLog: input.cycleLog,
        }),
      );
      if (!w.ok) {
        return { status: "error", stage: "worker", message: w.message };
      }
      workerOutput = w.value;
      lastWorkerOutput = workerOutput;

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
      managerOutputs.push(managerOutput);

      const decision = parseManagerDecision(managerOutput);
      if (decision.approved) {
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
            executiveName: execName,
          },
          cwd,
        );

        if (
          cycle.auditTriggered &&
          cycle.auditFileRelative &&
          !input.skipChiefEnrich
        ) {
          await enrichAuditWithChief({
            department: departmentId,
            auditFileRelative: cycle.auditFileRelative,
            cwd,
          });
        }

        return {
          status: "approved",
          workerOutput,
          managerOutput,
          executiveSummary,
          cycle,
          managerAttempts: totalManagerAttempts,
        };
      }

      rejectionReasons.push(decision.reason);
    }

    const escTask = `The Manager rejected the Worker output **${MAX_MANAGER_ROUNDS}** times for **${DEPT}**.

Rejection reasons:
${rejectionReasons.map((r, i) => `${i + 1}. ${r}`).join("\n")}

Worker's last output:
---
${workerOutput.slice(0, 8000)}
---

**Your decision:** Reply with **first line exactly** \`REWRITE\` or \`DISCARD\` (one word, uppercase).
Then a short paragraph explaining why. If REWRITE, the Worker gets one more clean attempt. If DISCARD, the task ends with no cycle increment.`;

    const esc = await guardStep(() =>
      runExecutive({
        role: "Executive",
        department: DEPT,
        task: escTask,
        context: { workerOutput, rejectionReasons },
      }),
    );
    if (!esc.ok) {
      return { status: "error", stage: "executive", message: esc.message };
    }
    const executiveEscalation = esc.value;
    const head = firstLineUpper(executiveEscalation);

    if (head.startsWith("DISCARD")) {
      return {
        status: "discarded",
        workerOutput,
        managerOutputs,
        executiveEscalation,
      };
    }

    if (!head.startsWith("REWRITE")) {
      return {
        status: "discarded",
        workerOutput,
        managerOutputs,
        executiveEscalation:
          executiveEscalation +
          "\n\n_(Executive did not issue REWRITE or DISCARD clearly — treating as DISCARD.)_",
      };
    }

    escalationPhase += 1;
  }

  return {
    status: "rejected_after_escalation",
    workerOutput: lastWorkerOutput,
    managerOutputs,
    executiveEscalation:
      "REWRITE was issued twice without approval — stopping to avoid an infinite loop.",
    reason: "Max executive-guided rewrite phases exhausted",
  };
}

