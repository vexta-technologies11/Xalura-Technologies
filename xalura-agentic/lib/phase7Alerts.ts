import type { DepartmentId } from "../engine/departments";
import { waitUntilAfterResponse } from "./cloudflareWaitUntil";
import type { FailedOperation } from "./failedQueue";
import { humanChiefDigestEmailBody, humanOpsAlertEmailBody } from "./pipelineFailureHumanize";
import { sendResendEmail } from "./phase7Clients";
import { resolveWorkerEnv } from "./resolveWorkerEnv";

/** Fire-and-forget Resend when `AGENTIC_OPS_ALERT_EMAIL` + `RESEND_API_KEY` are set. */
export function scheduleFailedOperationResend(op: FailedOperation): void {
  waitUntilAfterResponse(runFailedOperationResendWork(op));
}

async function runFailedOperationResendWork(op: FailedOperation): Promise<void> {
  const to = (await resolveWorkerEnv("AGENTIC_OPS_ALERT_EMAIL"))?.trim();
  if (!to) return;
  const subject = "[Xalura agentic] Pipeline needs attention";
  const text = humanOpsAlertEmailBody(op);
  await sendResendEmail({ to, subject, text });
}

/** After a successful live Chief audit append — optional digest email. */
export function scheduleChiefDigestEmail(params: {
  department: DepartmentId;
  auditFileRelative: string;
  cwdLabel?: string;
  agentLaneKey?: string;
}): void {
  waitUntilAfterResponse(runChiefDigestEmailWork(params));
}

async function runChiefDigestEmailWork(params: {
  department: DepartmentId;
  auditFileRelative: string;
  cwdLabel?: string;
  agentLaneKey?: string;
}): Promise<void> {
  const to = (await resolveWorkerEnv("AGENTIC_CHIEF_DIGEST_EMAIL"))?.trim();
  if (!to) return;
  const { subject, text } = humanChiefDigestEmailBody({
    department: params.department,
    auditFileRelative: params.auditFileRelative,
    agentLaneKey: params.agentLaneKey,
    cwdLabel: params.cwdLabel,
  });
  const footer = [
    "",
    "--- reference ---",
    `department: ${params.department}`,
    params.agentLaneKey ? `lane: ${params.agentLaneKey}` : "",
    `audit: ${params.auditFileRelative}`,
    params.cwdLabel ? `cwd: ${params.cwdLabel}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  await sendResendEmail({ to, subject: `[Xalura agentic] ${subject}`, text: `${text}${footer}` });
}
