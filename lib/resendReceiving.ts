import { resolveWorkerEnv } from "@/xalura-agentic/lib/resolveWorkerEnv";

export type ResendReceivedEmailRow = {
  id?: string;
  from?: string;
  to?: string[];
  subject?: string | null;
  text?: string | null;
  html?: string | null;
  message_id?: string | null;
  /** If Resend includes it, or from `headers`["In-Reply-To"] in merge. */
  in_reply_to?: string | null;
  /** Raw email headers (case may vary) from `GET /emails/receiving/:id`. */
  headers?: Record<string, string> | null;
};

/** `GET /emails/receiving/:id` — full body after `email.received` webhook. */
export async function resendFetchReceivedEmail(
  emailId: string,
): Promise<ResendReceivedEmailRow | null> {
  const key = await resolveWorkerEnv("RESEND_API_KEY");
  if (!key) return null;
  const res = await fetch(
    `https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${key}` },
    },
  );
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    console.warn(
      "[resendReceiving] GET /emails/receiving failed",
      res.status,
      msg.slice(0, 200),
    );
    return null;
  }
  try {
    return (await res.json()) as ResendReceivedEmailRow;
  } catch {
    return null;
  }
}

/**
 * The `email.received` webhook only carries metadata; the app usually GETs the full message.
 * If the GET fails (key scope, timing) or returns no `from`, fall back to webhook `data` so
 * Chief can still run with best-effort body.
 */
export function mergeResendReceivedWithWebhook(
  emailId: string,
  data: Record<string, unknown> | undefined,
  api: ResendReceivedEmailRow | null,
): ResendReceivedEmailRow {
  const wFrom = typeof data?.["from"] === "string" ? data["from"] : undefined;
  const wTo = Array.isArray(data?.["to"])
    ? (data!["to"] as unknown[]).filter((x): x is string => typeof x === "string")
    : undefined;
  const wSubject = data?.["subject"];
  const wMsg =
    typeof data?.["message_id"] === "string" ? data["message_id"] : undefined;
  const subjectVal =
    typeof wSubject === "string" || wSubject == null
      ? (wSubject as string | null)
      : null;

  const base = api ?? { id: emailId };
  const baseHeaders =
    base.headers && typeof base.headers === "object"
      ? (base.headers as Record<string, string>)
      : undefined;
  const inFromHeaders = (h: Record<string, string> | undefined): string | null => {
    if (!h) return null;
    for (const k of Object.keys(h)) {
      if (k.toLowerCase() === "in-reply-to" && h[k] != null && String(h[k]).trim()) {
        return String(h[k]);
      }
    }
    return null;
  };
  const baseIrt = base.in_reply_to?.trim()
    ? base.in_reply_to
    : inFromHeaders(baseHeaders);

  return {
    ...base,
    id: base.id ?? emailId,
    from: (base.from?.trim() && base.from) || wFrom,
    to: wTo?.length ? wTo : base.to,
    subject:
      base.subject != null && base.subject !== ""
        ? base.subject
        : (subjectVal ?? null),
    message_id: base.message_id?.trim() ? base.message_id : wMsg ?? null,
    in_reply_to: baseIrt ?? null,
  };
}
