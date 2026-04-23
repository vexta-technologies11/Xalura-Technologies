import { resolveWorkerEnv } from "@/xalura-agentic/lib/resolveWorkerEnv";

export type ResendReceivedEmailRow = {
  id?: string;
  from?: string;
  to?: string[];
  subject?: string | null;
  text?: string | null;
  html?: string | null;
  message_id?: string | null;
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
  if (!res.ok) return null;
  try {
    return (await res.json()) as ResendReceivedEmailRow;
  } catch {
    return null;
  }
}
