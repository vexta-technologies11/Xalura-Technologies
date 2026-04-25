import { buildNewsTeamEmailSnapshot } from "@/lib/newsTeamEmailSnapshot";
import { recordInboundAndResolveThread, loadThreadTranscriptForPrompt } from "@/lib/chiefEmailThreadSupabase";
import {
  clipNewsEmailWords,
  pickChiefEmailSalutation,
  prepareNewsThreadingForSend,
  sendNewsTeamHtmlReply,
} from "@/lib/newsTeamEmailSend";
import { runAgent } from "@/xalura-agentic/lib/gemini";
import { getExecutiveAssignedName, loadAgentNamesConfig } from "@/xalura-agentic/lib/agentNames";
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

/**
 * `NEWS_TEAM_INBOUND_ALLOWED_SENDERS` (comma) or, if unset, `CHIEF_INBOUND_ALLOWED_SENDERS`.
 */
async function newsTeamAllowedSenders(): Promise<string[]> {
  const raw = (await resolveWorkerEnv("NEWS_TEAM_INBOUND_ALLOWED_SENDERS"))?.trim();
  if (raw) {
    return raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }
  const chief = (await resolveWorkerEnv("CHIEF_INBOUND_ALLOWED_SENDERS"))?.trim();
  return chief ? chief.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) : [];
}

async function resolveFromHeadOfNews(cwd: string): Promise<string> {
  const n = loadAgentNamesConfig(cwd).headOfNews?.name?.trim();
  if (n) return n;
  return "Head of News";
}

async function resolveFromAuditor(cwd: string): Promise<string> {
  const n = getExecutiveAssignedName("news", cwd);
  if (n) return n;
  return "Chief of Audit (News)";
}

/**
 * Inbound to **Head of News** (separate Resend `to` — see `HEAD_OF_NEWS_INBOUND_TO` + webhook).
 */
export async function headOfNewsReplyToInboundEmail(params: {
  row: ResendReceivedEmailRow;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const cwd = process.cwd();
  const allowed = await newsTeamAllowedSenders();
  if (!allowed.length) {
    return { ok: false, error: "NEWS_TEAM_INBOUND_ALLOWED_SENDERS and CHIEF_INBOUND_ALLOWED_SENDERS both unset" };
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
    { inbox: "head_of_news" },
  );
  if (inboundRec.kind === "duplicate") {
    return { ok: true };
  }

  const honName = await resolveFromHeadOfNews(cwd);
  const fromHead =
    (await resolveWorkerEnv("HEAD_OF_NEWS_RESEND_FROM"))?.trim() ||
    (await resolveWorkerEnv("CHIEF_RESEND_FROM"))?.trim() ||
    (await resolveWorkerEnv("RESEND_FROM"))?.trim() ||
    "";

  const historyText =
    inboundRec.kind === "recorded"
      ? await loadThreadTranscriptForPrompt(inboundRec.threadId, {
          excludeMessageId: inboundRec.inboundMessageDbId,
          maxMessages: 24,
          maxChars: 8_000,
          outboundPersonaLabel: `${honName} (Head of News)`,
        })
      : "";

  const th = await prepareNewsThreadingForSend(inboundRec, params.row, fromHead);
  const threadIsReply = Boolean(historyText.trim());
  const sal = pickChiefEmailSalutation(threadIsReply ? "reply" : "opening");
  const snapshot = (await buildNewsTeamEmailSnapshot()).slice(0, 8_000);

  const historyBlock = historyText.trim()
    ? `**Earlier in this email thread:**\n${historyText}\n\n`
    : `**(New thread in our log.)**\n\n`;

  const raw = await runAgent({
    role: "Head of News",
    department: "News",
    task: `You are **${honName}**, **Head of News** at Xalura. The CEO emails you. You have full awareness of the News team pipeline: Pre-Production, Writers, your digest runs, and publishing — see the **Snapshot** below (Supabase + run events).

**Your first line of the reply must be exactly (copy salutation, punctuation as given):**
${sal}

**Your entire reply (including that line) must be at most 120 words.** Be concise, operational, and specific to the News desk. You may refer to the snapshot. Do not invent events not supported by the snapshot. No email signature after your text (system adds branding).

${historyBlock}**Current email** — Subject: ${subject}
${bodyText.slice(0, 8_000)}

**Snapshot (facts)**
${snapshot}

Write the reply body only, ≤120 words including the first line.`,
    context: { channel: "head_of_news_inbound_email", subject },
    assignedName: honName,
  });

  const out = clipNewsEmailWords(raw, 120);
  const err = await sendNewsTeamHtmlReply(out, subject, {
    row: params.row,
    toUserAddr: fromAddr,
    fromAddr: fromHead,
    th,
    useFullChiefBranding: true,
  });
  if (err.error) return { ok: false, error: err.error };
  return { ok: true };
}

/**
 * Inbound to **Chief of Audit (News)** — same snapshot; persona focuses on truthfulness, sourcing, and beat relevancy.
 */
export async function chiefOfAuditNewsReplyToInboundEmail(params: {
  row: ResendReceivedEmailRow;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const cwd = process.cwd();
  const allowed = await newsTeamAllowedSenders();
  if (!allowed.length) {
    return { ok: false, error: "NEWS_TEAM_INBOUND_ALLOWED_SENDERS and CHIEF_INBOUND_ALLOWED_SENDERS both unset" };
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
    { inbox: "chief_of_audit_news" },
  );
  if (inboundRec.kind === "duplicate") {
    return { ok: true };
  }

  const auditorName = await resolveFromAuditor(cwd);
  const fromAuditor =
    (await resolveWorkerEnv("CHIEF_OF_AUDIT_NEWS_RESEND_FROM"))?.trim() ||
    (await resolveWorkerEnv("CHIEF_RESEND_FROM"))?.trim() ||
    (await resolveWorkerEnv("RESEND_FROM"))?.trim() ||
    "";

  const historyText =
    inboundRec.kind === "recorded"
      ? await loadThreadTranscriptForPrompt(inboundRec.threadId, {
          excludeMessageId: inboundRec.inboundMessageDbId,
          maxMessages: 24,
          maxChars: 8_000,
          outboundPersonaLabel: `${auditorName} (Chief of Audit)`,
        })
      : "";

  const th = await prepareNewsThreadingForSend(inboundRec, params.row, fromAuditor);
  const threadIsReply = Boolean(historyText.trim());
  const sal = pickChiefEmailSalutation(threadIsReply ? "reply" : "opening");
  const snapshot = (await buildNewsTeamEmailSnapshot()).slice(0, 8_000);

  const historyBlock = historyText.trim()
    ? `**Earlier in this email thread:**\n${historyText}\n\n`
    : `**(New thread in our log.)**\n\n`;

  const raw = await runAgent({
    role: "Executive",
    department: "News — Chief of Audit",
    task: `You are **${auditorName}**, **Chief of Audit (News)**. You check whether our drafts are **grounded in real reporting** and **relevant** to the AI industry news beat. The CEO is emailing you. Use the **Snapshot** for what the team actually logged (stages, audit results in summaries).

**Your first line of the reply must be exactly (copy salutation, punctuation as given):**
${sal}

**Entire reply ≤120 words** including that line. Address questions about **verification, legitimacy, sourcing, and how you would score relevancy** to our checklist when asked. If they ask for a number, give a **0–100 relevancy** score in one line when appropriate. Be honest about limits of remote verification. No signature (system adds branding).

${historyBlock}**Current email** — Subject: ${subject}
${bodyText.slice(0, 8_000)}

**Snapshot (facts)**
${snapshot}

Write the reply body only, ≤120 words including the first line.`,
    context: { channel: "chief_of_audit_news_inbound_email", subject },
    assignedName: auditorName,
  });

  const out = clipNewsEmailWords(raw, 120);
  const e = await sendNewsTeamHtmlReply(out, subject, {
    row: params.row,
    toUserAddr: fromAddr,
    fromAddr: fromAuditor,
    th,
    useFullChiefBranding: true,
  });
  if (e.error) return { ok: false, error: e.error };
  return { ok: true };
}
