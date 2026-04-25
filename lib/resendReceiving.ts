import { resolveWorkerEnv } from "@/xalura-agentic/lib/resolveWorkerEnv";

/**
 * Resend `email.received` may send `to` as a string, string[], or list of objects.
 * Also handles `"Name" <a@b.com>` so routing env substrings can match the bare address.
 */
export function extractWebhookToStrings(to: unknown): string[] {
  if (to == null) return [];
  if (typeof to === "string" && to.trim()) return [to];
  if (!Array.isArray(to)) return [];
  return to
    .map((x) => {
      if (typeof x === "string" && x.trim()) return x;
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        for (const k of ["email", "address", "value", "name"] as const) {
          const e = o[k];
          if (typeof e === "string" && e.trim() && e.includes("@")) return e;
        }
        const s = JSON.stringify(x);
        const m = s.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
        if (m?.[0]) return m[0]!;
      }
      return "";
    })
    .filter((s): s is string => Boolean(s));
}

function normalizeForRouting(s: string): string {
  const t = s.trim();
  const m = /<([^>\s]+@[^>]+)>/.exec(t);
  return (m ? m[1]! : t).toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Resend `data` (webhook) may carry `to` / `cc` / `bcc` — all count for routing
 * (some clients put the only recipient in a non-to field).
 * API `rowTo` is merged; pass `string[]` or normalize via `extractWebhookToStrings`.
 */
export function buildRoutingRecipientList(
  data: Record<string, unknown> | undefined,
  rowTo: unknown,
): string[] {
  const fromWh = data
    ? [
        ...extractWebhookToStrings(data["to"]),
        ...extractWebhookToStrings(data["cc"]),
        ...extractWebhookToStrings(data["bcc"]),
      ]
    : [];
  const fromRow = Array.isArray(rowTo)
    ? extractWebhookToStrings(rowTo)
    : extractWebhookToStrings(rowTo);
  const raw = [...fromWh, ...fromRow];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw) {
    const n = normalizeForRouting(r);
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}

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
  const wRaw = extractWebhookToStrings(data?.["to"]);
  const wTo = wRaw.length > 0 ? wRaw : undefined;
  const apiTo =
    extractWebhookToStrings((api as { to?: unknown } | null)?.to) || [];
  const wOrApiTo = wTo?.length ? wTo : apiTo.length > 0 ? apiTo : undefined;
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
    to: wOrApiTo?.length
      ? wOrApiTo
      : base.to
        ? extractWebhookToStrings(base.to)
        : undefined,
    subject:
      base.subject != null && base.subject !== ""
        ? base.subject
        : (subjectVal ?? null),
    message_id: base.message_id?.trim() ? base.message_id : wMsg ?? null,
    in_reply_to: baseIrt ?? null,
  };
}
