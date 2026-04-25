import { createServiceClient, readEnvSync } from "@/lib/supabase/service";
import type { ResendReceivedEmailRow } from "@/lib/resendReceiving";
import {
  joinReferencesRfc,
  normalizeRfcMessageId,
  parseSyntheticInboundResendId,
  syntheticInboundRfcMessageId,
} from "@/lib/chiefEmailIds";

export { newOutboundRfcMessageId } from "@/lib/chiefEmailIds";

const TABLE_THREAD = "chief_email_threads";
const TABLE_MSG = "chief_email_messages";

function disabled(): boolean {
  return readEnvSync("CHIEF_EMAIL_THREAD_LOG_DISABLE")?.toLowerCase() === "true";
}

export function extractInReplyToFromResendRow(row: ResendReceivedEmailRow): string {
  if (row.in_reply_to && row.in_reply_to.trim()) {
    return normalizeRfcMessageId(row.in_reply_to);
  }
  const h = row.headers;
  if (h) {
    for (const k of Object.keys(h)) {
      if (k.toLowerCase() === "in-reply-to") {
        return normalizeRfcMessageId(h[k] as string);
      }
    }
  }
  return "";
}

function trimBody(s: string, max: number): string {
  const t = s.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export type RecordInboundResult =
  | { kind: "disabled" }
  | { kind: "duplicate" }
  | {
      kind: "recorded";
      threadId: string;
      inboundMessageDbId: string;
      inboundRfc: string;
      resendEmailId: string;
    };

/**
 * Idempotent: same Resend `email_id` (receiving) only inserts once; retries return `duplicate`.
 */
export async function recordInboundAndResolveThread(
  row: ResendReceivedEmailRow,
  bodyText: string,
  fromAddr: string,
  subject: string,
): Promise<RecordInboundResult> {
  if (disabled()) return { kind: "disabled" };
  const supabase = createServiceClient();
  if (!supabase) return { kind: "disabled" };

  const resendEmailId = (row.id ?? "").trim();
  if (!resendEmailId) return { kind: "disabled" };

  const { data: existingByResend } = await supabase
    .from(TABLE_MSG)
    .select("id")
    .eq("resend_inbound_id", resendEmailId)
    .maybeSingle();
  if (existingByResend?.id) {
    return { kind: "duplicate" };
  }

  const rawMid = (row.message_id ?? "").trim();
  const inboundRfc = rawMid
    ? normalizeRfcMessageId(rawMid)
    : syntheticInboundRfcMessageId(resendEmailId);

  const irt = extractInReplyToFromResendRow(row);

  let threadId: string | null = null;
  if (irt) {
    const { data: parentByRfc } = await supabase
      .from(TABLE_MSG)
      .select("thread_id")
      .eq("rfc_message_id", irt)
      .maybeSingle();
    if (parentByRfc?.thread_id) {
      threadId = parentByRfc.thread_id as string;
    } else {
      const resId = parseSyntheticInboundResendId(irt);
      if (resId) {
        const { data: parentByResend } = await supabase
          .from(TABLE_MSG)
          .select("thread_id")
          .eq("resend_inbound_id", resId)
          .maybeSingle();
        if (parentByResend?.thread_id) {
          threadId = parentByResend.thread_id as string;
        }
      }
    }
  }

  if (!threadId) {
    const { data: tw, error: eT } = await supabase
      .from(TABLE_THREAD)
      .insert({})
      .select("id")
      .single();
    if (eT || !tw?.id) {
      console.warn("[chiefEmailThread] create thread", eT?.message);
      return { kind: "disabled" };
    }
    threadId = tw.id as string;
  }

  const toAddr = Array.isArray(row.to) ? row.to.join(", ") : "";
  const { data: ins, error: eIns } = await supabase
    .from(TABLE_MSG)
    .insert({
      thread_id: threadId,
      direction: "inbound",
      rfc_message_id: inboundRfc,
      in_reply_to: irt || null,
      resend_inbound_id: resendEmailId,
      from_addr: fromAddr,
      to_addr: toAddr || null,
      subject: subject.slice(0, 500),
      body_text: trimBody(bodyText, 32_000),
    })
    .select("id")
    .single();

  if (eIns) {
    if (eIns.code === "23505") {
      return { kind: "duplicate" };
    }
    console.warn("[chiefEmailThread] insert inbound", eIns.message);
    return { kind: "disabled" };
  }

  await supabase
    .from(TABLE_THREAD)
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);

  return {
    kind: "recorded",
    threadId,
    inboundMessageDbId: ins!.id as string,
    inboundRfc,
    resendEmailId,
  };
}

/**
 * Prior messages in thread (excludes the current inbound by DB id), oldest first, for the model.
 */
export async function loadThreadTranscriptForPrompt(
  threadId: string,
  opts: { excludeMessageId: string; maxMessages: number; maxChars: number },
): Promise<string> {
  if (disabled()) return "";
  const supabase = createServiceClient();
  if (!supabase) return "";

  const { data, error } = await supabase
    .from(TABLE_MSG)
    .select("created_at, direction, from_addr, body_text, id")
    .eq("thread_id", threadId)
    .neq("id", opts.excludeMessageId)
    .order("created_at", { ascending: true })
    .limit(80);

  if (error) {
    console.warn("[chiefEmailThread] load transcript", error.message);
    return "";
  }
  const rows = (data ?? []) as {
    id: string;
    created_at: string;
    direction: string;
    from_addr: string;
    body_text: string;
  }[];
  if (rows.length === 0) return "";

  const take = rows.slice(-opts.maxMessages);
  const lines: string[] = [];
  let used = 0;
  for (const r of take) {
    const who = r.direction === "inbound" ? (r.from_addr || "sender") : "Chief (Ryzen Qi)";
    const body = trimBody(r.body_text, 1_200);
    const line = `[${r.created_at.slice(0, 19)}Z] ${r.direction} — ${who}: ${body}`;
    if (used + line.length + 1 > opts.maxChars) {
      lines.push("…(earlier thread trimmed for length)");
      break;
    }
    lines.push(line);
    used += line.length + 1;
  }
  return lines.join("\n");
}

export async function buildReferencesForReply(
  threadId: string,
  latestInboundRfc: string,
): Promise<string> {
  if (disabled()) return joinReferencesRfc([latestInboundRfc]);
  const supabase = createServiceClient();
  if (!supabase) return joinReferencesRfc([latestInboundRfc]);

  const { data, error } = await supabase
    .from(TABLE_MSG)
    .select("rfc_message_id, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error || !data?.length) {
    return joinReferencesRfc([latestInboundRfc]);
  }
  const ids = (data as { rfc_message_id: string | null }[])
    .map((r) => r.rfc_message_id)
    .filter((x): x is string => Boolean(x));
  if (!ids.includes(latestInboundRfc)) {
    ids.push(latestInboundRfc);
  }
  return joinReferencesRfc(ids);
}

export type OutboundRecordInput = {
  threadId: string;
  rfcMessageId: string;
  inReplyTo: string;
  fromAddr: string;
  toAddr: string;
  subject: string;
  bodyText: string;
  resendOutboundId?: string;
};

export async function recordOutboundMessage(
  input: OutboundRecordInput,
): Promise<void> {
  if (disabled()) return;
  const supabase = createServiceClient();
  if (!supabase) return;

  const { error } = await supabase.from(TABLE_MSG).insert({
    thread_id: input.threadId,
    direction: "outbound",
    rfc_message_id: input.rfcMessageId,
    in_reply_to: input.inReplyTo,
    resend_outbound_id: input.resendOutboundId ?? null,
    from_addr: input.fromAddr,
    to_addr: input.toAddr,
    subject: input.subject.slice(0, 500),
    body_text: trimBody(input.bodyText, 32_000),
  });
  if (error) {
    console.warn("[chiefEmailThread] insert outbound", error.message);
    return;
  }
  await supabase
    .from(TABLE_THREAD)
    .update({ updated_at: new Date().toISOString() })
    .eq("id", input.threadId);
}
