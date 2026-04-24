import type { DepartmentId } from "../engine/departments";

/** PDF: Cycle Log Template */
export function renderCycleLog(input: {
  department: DepartmentId;
  cycleNumber: number;
  dateIso: string;
  agentRole: "Worker" | "Manager" | "Executive";
  taskType: string;
  inputBlock: string;
  outputBlock: string;
  managerApproved: boolean;
  managerReason: string;
  notes?: string;
}): string {
  const decision = input.managerApproved
    ? "- [x] Approved\n- [ ] Rejected"
    : "- [ ] Approved\n- [x] Rejected";
  const deptLabel =
    input.department === "seo"
      ? "SEO & Audit"
      : input.department.charAt(0).toUpperCase() + input.department.slice(1);
  return `# ${deptLabel} — Cycle ${input.cycleNumber}
**Date:** ${input.dateIso}
**Agent Role:** ${input.agentRole}
**Task Type:** ${input.taskType}
## Input
${input.inputBlock}
## Output
${input.outputBlock}
## Manager Decision
${decision}
**Reason:** ${input.managerReason}
## Notes
${input.notes ?? "<!-- Any additional context -->"}
`;
}

/** PDF: Audit Log Template */
export function renderAuditLog(input: {
  department: DepartmentId;
  auditSequence: number;
  dateIso: string;
  cyclesReviewed: string;
  executiveName: string;
  rows: Array<{ cycle: string; output: string; result: string; score: string }>;
  chiefScore: string;
  directive: string;
  strategyAdjustment: string;
  /** e.g. `seo:cloud-infrastructure` — isolated vertical agent ladder */
  agentLaneLabel?: string;
}): string {
  const deptLabel =
    input.department === "seo"
      ? "SEO & Audit"
      : input.department.charAt(0).toUpperCase() + input.department.slice(1);
  const header = `| Cycle | Output | Result | Score |
|---|---|---|---|
`;
  const body = input.rows
    .map((r) => `| ${r.cycle} | ${r.output} | ${r.result} | ${r.score} |`)
    .join("\n");
  const laneLine = input.agentLaneLabel
    ? `**Agent lane:** ${input.agentLaneLabel}\n`
    : "";
  return `# ${deptLabel} — Audit Report — Cycle ${input.auditSequence}
**Date:** ${input.dateIso}
${laneLine}**Cycles Reviewed:** ${input.cyclesReviewed}
**Executive Agent:** ${input.executiveName}
## Performance Summary
${header}${body}

## Chief AI Score: ${input.chiefScore}
## Directive
${input.directive}
## Strategy Adjustment
${input.strategyAdjustment}
`;
}
