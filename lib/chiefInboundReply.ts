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
import {
  clipChiefEmailWords,
  finishChiefPlainBody,
  pickChiefEmailSalutation,
  wrapChiefEmailHtml,
} from "@/lib/chiefEmailBranding";
import { normalizeRfcMessageId } from "@/lib/chiefEmailIds";
import {
  buildReferencesForReply,
  loadThreadTranscriptForPrompt,
  newOutboundRfcMessageId,
  recordInboundAndResolveThread,
  recordOutboundMessage,
  type RecordInboundResult,
} from "@/lib/chiefEmailThreadSupabase";
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

type ThreadingForSend = {
  parentRfc: string;
  references: string;
  outboundRfc: string;
  shouldRecord: boolean;
  threadId: string | null;
};

async function prepareThreadingForSend(
  rec: RecordInboundResult,
  row: ResendReceivedEmailRow,
  chiefFrom: string,
): Promise<ThreadingForSend> {
  const outboundRfc = newOutboundRfcMessageId(chiefFrom);
  if (rec.kind !== "recorded") {
    const pr = normalizeRfcMessageId(row.message_id) || "";
    return {
      parentRfc: pr,
      references: pr,
      outboundRfc,
      shouldRecord: false,
      threadId: null,
    };
  }
  const references = await buildReferencesForReply(rec.threadId, rec.inboundRfc);
  return {
    parentRfc: rec.inboundRfc,
    references,
    outboundRfc,
    shouldRecord: true,
    threadId: rec.threadId,
  };
}

/** Plain + HTML, memo + signature; RFC `Message-ID` + thread headers; optional Supabase log. */
async function sendHtmlChiefReply(
  mainBody: string,
  subject: string,
  args: {
    row: ResendReceivedEmailRow;
    toUserAddr: string;
    chiefFrom: string;
    th: ThreadingForSend;
  },
): Promise<{ error?: string }> {
  const textBody = finishChiefPlainBody(mainBody.replace(/\r\n/g, "\n").trim(), true);
  const htmlBody = wrapChiefEmailHtml({
    bodyPlain: mainBody.replace(/\r\n/g, "\n").trim(),
    includeMemo: true,
  });
  const fromUsed =
    args.chiefFrom.trim() ||
    (await resolveWorkerEnv("CHIEF_RESEND_FROM"))?.trim() ||
    (await resolveWorkerEnv("RESEND_FROM"))?.trim() ||
    "";
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
  const headers: Record<string, string> = { "Message-ID": args.th.outboundRfc };
  if (args.th.parentRfc) {
    headers["In-Reply-To"] = args.th.parentRfc;
    headers["References"] = args.th.references || args.th.parentRfc;
  }
  const res = await sendResendEmail({
    from: fromUsed,
    to: [args.toUserAddr],
    cc,
    subject: replySubject.slice(0, 998),
    text: textBody,
    html: htmlBody,
    headers,
  });
  if (res.error) return { error: res.error };
  if (args.th.shouldRecord && args.th.threadId) {
    await recordOutboundMessage({
      threadId: args.th.threadId,
      rfcMessageId: args.th.outboundRfc,
      inReplyTo: args.th.parentRfc,
      fromAddr: fromUsed,
      toAddr: args.toUserAddr,
      subject: replySubject.slice(0, 500),
      bodyText: mainBody,
      resendOutboundId: res.id,
    });
  }
  return {};
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

const sharedSend = (
  row: ResendReceivedEmailRow,
  toUser: string,
  chiefFrom: string,
  th: ThreadingForSend,
) =>
  ({ main, sub }: { main: string; sub: string }) =>
    sendHtmlChiefReply(clipChiefEmailWords(main), sub, {
      row,
      toUserAddr: toUser,
      chiefFrom,
      th,
    });

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

  const inboundRec = await recordInboundAndResolveThread(
    params.row,
    bodyText,
    fromAddr,
    subject,
    { inbox: "chief" },
  );
  if (inboundRec.kind === "duplicate") {
    return { ok: true };
  }

  const historyText =
    inboundRec.kind === "recorded"
      ? await loadThreadTranscriptForPrompt(inboundRec.threadId, {
          excludeMessageId: inboundRec.inboundMessageDbId,
          maxMessages: 24,
          maxChars: 8_000,
        })
      : "";

  const chiefFromBase =
    (await resolveWorkerEnv("CHIEF_RESEND_FROM"))?.trim() ||
    (await resolveWorkerEnv("RESEND_FROM"))?.trim() ||
    "";
  const th = await prepareThreadingForSend(
    inboundRec,
    params.row,
    chiefFromBase,
  );

  const doSend = sharedSend(params.row, fromAddr, chiefFromBase, th);

  const actionsRaw = (await resolveWorkerEnv("CHIEF_INBOUND_ACTIONS_SENDERS"))?.trim();
  const actionSenders = actionsRaw
    ? actionsRaw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
    : null;
  const canRunActions = actionSenders
    ? actionSenders.includes(fromAddr)
    : true;

  const threadIsReply = Boolean(historyText.trim());
  const preface = (body: string) => {
    const s = pickChiefEmailSalutation(threadIsReply ? "reply" : "opening");
    return `${s}\n\n${body}`;
  };

  const cmd = parseChiefInboundCommand(bodyText);
  if (cmd.kind === "error") {
    const s = await doSend({
      main: preface(
        `Command block unreadable (${cmd.error}). Use CHIEF_COMMAND lines or write me without that block — I’ll reply normally.`,
      ),
      sub: subject,
    });
    if (s.error) return { ok: false, error: s.error };
    return { ok: true };
  }
  if (cmd.kind === "need_approve") {
    const s = await doSend({
      main: preface(
        `Saw: ${cmd.description}. Not run yet — reply with a line that says only: approve.`,
      ),
      sub: subject,
    });
    if (s.error) return { ok: false, error: s.error };
    return { ok: true };
  }
  if (cmd.kind === "ready") {
    if (!canRunActions) {
      const s = await doSend({
        main: preface(
          `Automation not allowed for this address. Remove the command block; I’ll reply normally, or get added to CHIEF_INBOUND_ACTIONS_SENDERS.`,
        ),
        sub: subject,
      });
      if (s.error) return { ok: false, error: s.error };
      return { ok: true };
    }
    const ex = await executeChiefInboundCommand(cmd.action, { cwd, fromEmail: fromAddr });
    const bodyOut = ex.ok
      ? `Done. ${ex.text.replace(/\s+/g, " ").trim()}`
      : `Failed: ${ex.error?.replace(/\s+/g, " ").trim() ?? "unknown"}`;
    const s = await doSend({ main: preface(bodyOut), sub: subject });
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
    ? "Sender may use email command+approve for runs."
    : "Sender cannot trigger email automation from this address.";

  const executiveBlock = isExecutiveOperator
    ? "Executive operator: be decisive on marketing/publishing/SEO; never invent runs or URLs."
    : "Scope: org ops only; redirect other topics in one line.";

  const historyBlock = historyText.trim()
    ? `**Earlier in this email thread (newest at bottom):**
${historyText}
`
    : `**(No prior thread in log — new topic or logging disabled.)**
`;
  const requiredSalutation = pickChiefEmailSalutation(
    threadIsReply ? "reply" : "opening",
  );

  const chiefRaw = await runChiefAI({
    department: "All",
    task: `You are **Ryzen Qi**, **CAI | Head of Operations** at Xalura Tech, emailing the CEO.

**Your first line of the reply (before anything else) must be exactly this line, punctuation and capitalization as written:**
${requiredSalutation}

**Hard rule: your entire reply body must be at most 100 words (including that first line).** No run/approval/CHIEF_COMMAND instructions **unless** they explicitly ask how to trigger automation — then a short hint only, still under 100 words total.

Summarize what matters from their message + earlier thread + snapshot: answer the question, or the most important operational fact. Use the thread to stay consistent; do not contradict prior agreements. ${automationNote} ${executiveBlock}

${historyBlock}
**Their current email** — Subject: ${subject}
${forConversation.slice(0, 8_000)}

**Snapshot (facts only)**
${snapshot}

Write **only** the reply body (no signature). **≤100 words including the required first line.**`,
    context: { channel: "chief_inbound_email", subject },
    assignedName: chiefN,
  });

  const chiefMd = clipChiefEmailWords(chiefRaw);
  const sent = await doSend({ main: chiefMd, sub: subject });
  if (sent.error) return { ok: false, error: sent.error };
  return { ok: true };
}
