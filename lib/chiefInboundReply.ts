import { executeChiefInboundCommand } from "@/lib/chiefInboundCommandExecute";
import {
  parseChiefInboundCommand,
  stripChiefCommandForConversation,
} from "@/lib/chiefInboundCommandParse";
import {
  fetchRecentAgenticPipelineLogs,
  formatAgenticPipelineLogsForSnapshot,
} from "@/lib/agenticPipelineLogSupabase";
import { formatChiefStrategicForSnapshot } from "@/lib/chiefStrategicDirectives";
import { finishChiefPlainBody, wrapChiefEmailHtml } from "@/lib/chiefEmailBranding";
import { runChiefAI } from "@/xalura-agentic/agents/chiefAI";
import { AGENTIC_RELEASE_ID } from "@/xalura-agentic/engine/version";
import { chiefDisplayName } from "@/xalura-agentic/lib/agentNames";
import { loadCycleState } from "@/xalura-agentic/engine/cycleStateStore";
import { readEvents } from "@/xalura-agentic/lib/eventQueue";
import { readFailedQueue } from "@/xalura-agentic/lib/failedQueue";
import { sendResendEmail } from "@/xalura-agentic/lib/phase7Clients";
import { resolveWorkerEnv } from "@/xalura-agentic/lib/resolveWorkerEnv";
import type { ResendReceivedEmailRow } from "@/lib/resendReceiving";

function parseEmailAddress(fromHeader: string): string {
  const m = /<([^>]+)>/.exec(fromHeader);
  if (m?.[1]) return m[1].trim().toLowerCase();
  return fromHeader.replace(/"/g, "").trim().toLowerCase();
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeMessageId(mid: string): string {
  const t = mid.trim();
  if (!t) return t;
  if (t.startsWith("<") && t.endsWith(">")) return t;
  return `<${t}>`;
}

/** Plain + HTML, memo + signature, optional threading headers. */
async function sendHtmlChiefReply(
  mainBody: string,
  subject: string,
  rowParams: { row: ResendReceivedEmailRow },
): Promise<{ error?: string }> {
  const textBody = finishChiefPlainBody(mainBody.replace(/\r\n/g, "\n").trim(), true);
  const htmlBody = wrapChiefEmailHtml({
    bodyPlain: mainBody.replace(/\r\n/g, "\n").trim(),
    includeMemo: true,
  });
  const fromAddr =
    (await resolveWorkerEnv("CHIEF_RESEND_FROM"))?.trim() ||
    (await resolveWorkerEnv("RESEND_FROM"))?.trim();
  const ccRaw = (await resolveWorkerEnv("CHIEF_EMAIL_CC"))?.trim();
  const cc = ccRaw
    ? ccRaw
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    : undefined;
  const replySubject = subject.toLowerCase().startsWith("re:")
    ? subject
    : `Re: ${subject.slice(0, 900)}`;
  const mid = rowParams.row.message_id?.trim();
  const headers =
    mid && mid.length > 0
      ? { "In-Reply-To": normalizeMessageId(mid), References: normalizeMessageId(mid) }
      : undefined;
  const toAddr = parseEmailAddress(rowParams.row.from ?? "");
  if (!toAddr) return { error: "no recipient" };
  return sendResendEmail({
    from: fromAddr,
    to: [toAddr],
    cc,
    subject: replySubject.slice(0, 998),
    text: textBody,
    html: htmlBody,
    headers,
  });
}

async function buildOpsSnapshot(cwd: string): Promise<string> {
  let st: ReturnType<typeof loadCycleState>;
  let fails: ReturnType<typeof readFailedQueue>;
  let evs: ReturnType<typeof readEvents>;
  try {
    st = loadCycleState();
    fails = readFailedQueue().slice(-10);
    evs = readEvents().slice(-12);
  } catch {
    return "(snapshot unavailable on this runtime)";
  }
  const failLines =
    fails.length === 0
      ? "(none)"
      : fails.map((f) => `- ${f.kind}: ${f.message}`).join("\n");
  const evLines =
    evs.length === 0
      ? "(none)"
      : evs.map((e) => `- ${e.type} @ ${e.ts}`).join("\n");
  let strategic: string;
  try {
    strategic = formatChiefStrategicForSnapshot(cwd);
  } catch {
    strategic = "(strategic brief unavailable)";
  }
  const supaRows = await fetchRecentAgenticPipelineLogs(18);
  const supaBlock = formatAgenticPipelineLogsForSnapshot(supaRows, 18);
  return [
    `release_id: ${AGENTIC_RELEASE_ID}`,
    "Strategic direction (set via email set_strategic + approve, or ignore):",
    strategic,
    "",
    "Recent pipeline stages (Supabase `agentic_pipeline_stage_log` — worker/manager/executive awareness):",
    supaBlock,
    "",
    "Cycle counters (approvals-in-window / audits):",
    `- marketing: ${st.departments.marketing.approvalsInWindow}/10, audits ${st.departments.marketing.auditsCompleted}`,
    `- publishing: ${st.departments.publishing.approvalsInWindow}/10, audits ${st.departments.publishing.auditsCompleted}`,
    `- seo: ${st.departments.seo.approvalsInWindow}/10, audits ${st.departments.seo.auditsCompleted}`,
    "",
    "Recent failures:",
    failLines,
    "",
    "Recent events:",
    evLines,
  ].join("\n");
}

/**
 * After Resend `email.received` — Chief replies by email (plain text), strict org role.
 * Caller must have verified the webhook and allowlisted the sender.
 */
export async function chiefReplyToInboundEmail(params: {
  /** Full row from `GET /emails/receiving/:id`. */
  row: ResendReceivedEmailRow;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const cwd = process.cwd();
  const allowedRaw = (await resolveWorkerEnv("CHIEF_INBOUND_ALLOWED_SENDERS"))?.trim();
  const allowed = allowedRaw
    ? allowedRaw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
    : [];
  if (!allowed.length) {
    return { ok: false, error: "CHIEF_INBOUND_ALLOWED_SENDERS not set (refusing inbound)" };
  }

  const fromAddr = parseEmailAddress(params.row.from ?? "");
  if (!fromAddr || !allowed.includes(fromAddr)) {
    return { ok: false, error: "sender not allowlisted" };
  }

  const subject = (params.row.subject ?? "(no subject)").trim().slice(0, 200);
  const bodyText =
    params.row.text?.trim() ||
    (params.row.html ? stripHtml(params.row.html) : "") ||
    "(empty body)";

  const actionsRaw = (await resolveWorkerEnv("CHIEF_INBOUND_ACTIONS_SENDERS"))?.trim();
  const actionSenders = actionsRaw
    ? actionsRaw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
    : null;
  const canRunActions = actionSenders
    ? actionSenders.includes(fromAddr)
    : true;

  const cmd = parseChiefInboundCommand(bodyText);
  if (cmd.kind === "error") {
    const s = await sendHtmlChiefReply(
      `Quick note — I couldn’t read the command block in that email (${cmd.error}). If you were trying to trigger an automated run, the block needs to sit between the marked lines with key: value rows. If you were just writing to me, ignore this — send again without a command block and I’ll reply normally.`,
      subject,
      params,
    );
    if (s.error) return { ok: false, error: s.error };
    return { ok: true };
  }
  if (cmd.kind === "need_approve") {
    const s = await sendHtmlChiefReply(
      `Got it — I see you want to run: ${cmd.description}. I didn’t execute anything yet. When you’re ready, add a single line in a follow-up that says just: approve. (Or say the word in a new message.)`,
      subject,
      params,
    );
    if (s.error) return { ok: false, error: s.error };
    return { ok: true };
  }
  if (cmd.kind === "ready") {
    if (!canRunActions) {
      const s = await sendHtmlChiefReply(
        `This inbox isn’t on the allowlist for automated email actions, so I didn’t run the command. Drop the CHIEF_COMMAND block and I’ll answer as usual — or we can get your address added to CHIEF_INBOUND_ACTIONS_SENDERS if you need the automation path.`,
        subject,
        params,
      );
      if (s.error) return { ok: false, error: s.error };
      return { ok: true };
    }
    const ex = await executeChiefInboundCommand(cmd.action, { cwd, fromEmail: fromAddr });
    const bodyOut = ex.ok
      ? `Here’s what ran:\n\n${ex.text}\n\nPing me if you want a read on how it fits the week.`
      : `That action didn’t finish: ${ex.error}\n\nTell me what you were aiming for and I’ll help triage.`;
    const s = await sendHtmlChiefReply(bodyOut, subject, params);
    if (s.error) return { ok: false, error: s.error };
    return { ok: true };
  }

  const forConversation = stripChiefCommandForConversation(bodyText) || bodyText;
  const snapshot = (await buildOpsSnapshot(cwd)).slice(0, 8000);
  const chiefN = chiefDisplayName();

  const execRaw = (await resolveWorkerEnv("CHIEF_INBOUND_EXECUTIVE_SENDERS"))?.trim();
  const executiveList = execRaw
    ? execRaw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
    : [];
  const isExecutiveOperator =
    executiveList.length === 0
      ? true
      : executiveList.includes(fromAddr);

  const automationNote = canRunActions
    ? "This sender may use the separate email **command + approve** path for production actions when they choose to."
    : "This sender is not on CHIEF_INBOUND_ACTIONS_SENDERS — automated email actions are off; they get guidance only here.";

  const executiveBlock = isExecutiveOperator
    ? `The human is a trusted **executive operator** for this inbox. When they ask for priorities across marketing, publishing, or SEO, be decisive and aligned with their direction. Do not fabricate completed runs or site URLs — the snapshot and facts only.`
    : `Standard scope: org operations only (marketing, publishing, SEO). Redirect anything else briefly.`;

  const chiefMd = await runChiefAI({
    department: "All",
    task: `You are **Ryzen Qi**, Chief AI (CAI) and **Head of Operations** at Xalura Tech. You are writing a real email to the CEO — not a ticket, not a robot status report.

**Voice:** Warm, professional, **human**. A light greeting is fine (e.g. "Hello, Boss" or a short line). Sound like a chief of staff: conversational where it fits, never stiff corporate filler. If the snapshot says Publishing shipped an article, you might say you saw it and one honest sentence on quality or fit — only if the data supports it. **Answer their actual questions** before anything else.

**What NOT to do by default**
- Do **not** dump long **run / approval / CHIEF_COMMAND** instructions, code blocks, or copy-paste templates unless they **explicitly** ask *how* to trigger an automated run or approve a command. If they only say hi or ask a business question, stay conversational.
- No markdown tables. No "Mr President" or laboured formal openings unless that matches the thread.
- You oversee the Worker → Manager → Executive **lenses** for marketing, publishing, and SEO — you do not impersonate those roles.

**Automation (only if they ask)**
- ${automationNote}
- If and only if they **explicitly** ask how to run pipelines from email, give a **very short** pointer (one short paragraph): command block + a line with only the word \`approve\` — not a manual page. Otherwise skip.

**${executiveBlock}**

**Human email**
Subject: ${subject}
From: ${fromAddr}

${forConversation.slice(0, 12_000)}

**Operational snapshot** (use for color; if empty, say you’re light on live signals for this turn)
${snapshot}

Write the **message body only** (plain text, no signature — that is added by the system). **Max ~550 words.**`,
    context: { channel: "chief_inbound_email", subject },
    assignedName: chiefN,
  });

  const sent = await sendHtmlChiefReply(chiefMd, subject, params);
  if (sent.error) return { ok: false, error: sent.error };
  return { ok: true };
}
