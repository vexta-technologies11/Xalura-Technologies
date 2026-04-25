import {
  clipChiefEmailWords,
  finishChiefPlainBody,
  pickChiefEmailSalutation,
  plainToHtmlParagraphs,
  wrapChiefEmailHtml,
} from "@/lib/chiefEmailBranding";
import { normalizeRfcMessageId } from "@/lib/chiefEmailIds";
import {
  buildReferencesForReply,
  newOutboundRfcMessageId,
  recordOutboundMessage,
  type RecordInboundResult,
} from "@/lib/chiefEmailThreadSupabase";
import { sendResendEmail } from "@/xalura-agentic/lib/phase7Clients";
import { resolveWorkerEnv } from "@/xalura-agentic/lib/resolveWorkerEnv";
import type { ResendReceivedEmailRow } from "@/lib/resendReceiving";

/** Slightly longer than Chief — two exec roles, more context. */
export const NEWS_TEAM_INBOUND_MAX_WORDS = 120;

export function clipNewsEmailWords(s: string, max: number = NEWS_TEAM_INBOUND_MAX_WORDS): string {
  return clipChiefEmailWords(s, max);
}

type ThreadingForSend = {
  parentRfc: string;
  references: string;
  outboundRfc: string;
  shouldRecord: boolean;
  threadId: string | null;
};

export async function prepareNewsThreadingForSend(
  rec: RecordInboundResult,
  row: ResendReceivedEmailRow,
  fromAddr: string,
): Promise<ThreadingForSend> {
  const outboundRfc = newOutboundRfcMessageId(fromAddr);
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

/**
 * Resend HTML reply for News team personas — optional memo; same logo/shell as Chief when memo off, else minimal.
 */
export async function sendNewsTeamHtmlReply(
  mainBody: string,
  subject: string,
  args: {
    row: ResendReceivedEmailRow;
    toUserAddr: string;
    fromAddr: string;
    th: ThreadingForSend;
    /** When true, use Chief-style memo + signature block (shared branding). */
    useFullChiefBranding?: boolean;
  },
): Promise<{ error?: string }> {
  const plain = mainBody.replace(/\r\n/g, "\n").trim();
  const useFull = args.useFullChiefBranding === true;
  const textBody = useFull
    ? finishChiefPlainBody(plain, true)
    : `${plain}\n`;
  const htmlBody = useFull
    ? wrapChiefEmailHtml({ bodyPlain: plain, includeMemo: true })
    : `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"></head><body style="margin:0;padding:16px;font-family:system-ui,-apple-system,sans-serif;color:#0f172a;">${plainToHtmlParagraphs(plain)}</body></html>`;

  const fromUsed = args.fromAddr.trim();
  const ccRaw = (await resolveWorkerEnv("NEWS_TEAM_EMAIL_CC"))?.trim();
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

export { pickChiefEmailSalutation };
