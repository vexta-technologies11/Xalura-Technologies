import type { DepartmentId } from "../engine/departments";
import { waitUntilAfterResponse } from "./cloudflareWaitUntil";
import type { FailedOperation } from "./failedQueue";
import { sendResendEmail } from "./phase7Clients";
import { resolveWorkerEnv } from "./resolveWorkerEnv";

/** Fire-and-forget Resend when `AGENTIC_OPS_ALERT_EMAIL` + `RESEND_API_KEY` are set. */
export function scheduleFailedOperationResend(op: FailedOperation): void {
  waitUntilAfterResponse(runFailedOperationResendWork(op));
}

async function runFailedOperationResendWork(op: FailedOperation): Promise<void> {
  const to = (await resolveWorkerEnv("AGENTIC_OPS_ALERT_EMAIL"))?.trim();
  if (!to) return;
  const subject = `[Xalura agentic] ${op.kind} failure`;
  const text = [
    op.message,
    op.detail ? `\n${op.detail}` : "",
    `\n\nid: ${op.id}`,
    `ts: ${op.ts}`,
  ].join("");
  await sendResendEmail({ to, subject, text });
}

/** After a successful live Chief audit append — optional digest email. */
export function scheduleChiefDigestEmail(params: {
  department: DepartmentId;
  auditFileRelative: string;
  cwdLabel?: string;
}): void {
  waitUntilAfterResponse(runChiefDigestEmailWork(params));
}

async function runChiefDigestEmailWork(params: {
  department: DepartmentId;
  auditFileRelative: string;
  cwdLabel?: string;
}): Promise<void> {
  const to = (await resolveWorkerEnv("AGENTIC_CHIEF_DIGEST_EMAIL"))?.trim();
  if (!to) return;
  const subject = `[Xalura agentic] Chief audit — ${params.department}`;
  const text = [
    `Department: ${params.department}`,
    `Audit file: ${params.auditFileRelative}`,
    params.cwdLabel ? `Cwd: ${params.cwdLabel}` : "",
    "",
    "Chief AI section was appended to the audit markdown on disk.",
  ]
    .filter(Boolean)
    .join("\n");
  await sendResendEmail({ to, subject, text });
}
