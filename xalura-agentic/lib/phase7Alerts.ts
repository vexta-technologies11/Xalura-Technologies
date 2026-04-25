import { finishChiefPlainBody, wrapChiefEmailHtml } from "@/lib/chiefEmailBranding";
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
  const plain = finishChiefPlainBody(text.trim(), true);
  const html = wrapChiefEmailHtml({ bodyPlain: text.trim(), includeMemo: true });
  await sendResendEmail({
    to,
    subject: `[Xalura] ${subject}`,
    text: plain,
    html,
  });
}
