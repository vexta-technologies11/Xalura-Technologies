import { finishChiefPlainBody, wrapChiefEmailHtml } from "@/lib/chiefEmailBranding";
import type { DepartmentId } from "../engine/departments";
import { waitUntilAfterResponse } from "./cloudflareWaitUntil";
import { humanChiefDigestEmailBody } from "./pipelineFailureHumanize";
import { sendResendEmail } from "./phase7Clients";
import { resolveWorkerEnv } from "./resolveWorkerEnv";

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
