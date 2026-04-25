import { Webhook } from "svix";
import { NextRequest, NextResponse } from "next/server";
import { waitUntilAfterResponse } from "@/xalura-agentic/lib/cloudflareWaitUntil";
import { resolveWorkerEnv } from "@/xalura-agentic/lib/resolveWorkerEnv";
import { chiefReplyToInboundEmail } from "@/lib/chiefInboundReply";
import {
  headOfNewsReplyToInboundEmail,
  chiefOfAuditNewsReplyToInboundEmail,
} from "@/lib/newsTeamInboundReplies";
import {
  mergeResendReceivedWithWebhook,
  resendFetchReceivedEmail,
} from "@/lib/resendReceiving";

export const dynamic = "force-dynamic";

function header(req: NextRequest, name: string): string | null {
  return req.headers.get(name) ?? req.headers.get(name.toLowerCase());
}

export async function POST(req: NextRequest) {
  const secret = (await resolveWorkerEnv("RESEND_WEBHOOK_SECRET"))?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "RESEND_WEBHOOK_SECRET not configured" },
      { status: 503 },
    );
  }

  const svixId = header(req, "svix-id");
  const svixTs = header(req, "svix-timestamp");
  const svixSig = header(req, "svix-signature");
  if (!svixId || !svixTs || !svixSig) {
    return NextResponse.json({ error: "missing svix headers" }, { status: 400 });
  }

  const rawBody = await req.text();

  let payload: unknown;
  try {
    const wh = new Webhook(secret);
    payload = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTs,
      "svix-signature": svixSig,
    });
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const obj = payload as Record<string, unknown>;
  if (obj["type"] !== "email.received") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const data = obj["data"] as Record<string, unknown> | undefined;
  const emailId = typeof data?.["email_id"] === "string" ? data["email_id"] : "";
  if (!emailId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const toFilter = (await resolveWorkerEnv("CHIEF_INBOUND_TO_FILTER"))?.trim().toLowerCase();
  const toHon = (await resolveWorkerEnv("HEAD_OF_NEWS_INBOUND_TO"))?.trim().toLowerCase();
  const toAud = (await resolveWorkerEnv("CHIEF_OF_AUDIT_NEWS_INBOUND_TO"))?.trim().toLowerCase();
  const toList = Array.isArray(data?.["to"])
    ? (data["to"] as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const toLower = (a: string[]) => a.map((t) => t.toLowerCase());

  if (
    toFilter &&
    toList.length > 0 &&
    !toLower(toList).some((t) => t.includes(toFilter)) &&
    !(toHon && toLower(toList).some((t) => t.includes(toHon))) &&
    !(toAud && toLower(toList).some((t) => t.includes(toAud)))
  ) {
    return NextResponse.json({ ok: true, ignored: true, reason: "to_filter" });
  }

  waitUntilAfterResponse(
    (async () => {
      try {
        const api = await resendFetchReceivedEmail(emailId);
        const row = mergeResendReceivedWithWebhook(
          emailId,
          data,
          api,
        );
        if (!row.from?.trim()) {
          console.warn(
            "[resend-chief-inbound] missing from (webhook + API)",
            { emailId },
          );
          return;
        }
        if (!api?.from?.trim() && data?.["from"]) {
          console.warn(
            "[resend-chief-inbound] using webhook metadata only; receiving GET failed or no from in API",
            { emailId },
          );
        }
        const rawTo = row.to?.length ? row.to : toList;
        const recipients = toLower(rawTo);
        const matchHon = Boolean(toHon && recipients.some((t) => t.includes(toHon)));
        const matchAud = Boolean(toAud && recipients.some((t) => t.includes(toAud)));
        const out = matchHon
          ? await headOfNewsReplyToInboundEmail({ row })
          : matchAud
            ? await chiefOfAuditNewsReplyToInboundEmail({ row })
            : await chiefReplyToInboundEmail({ row });
        if (!out.ok) {
          console.warn("[resend-chief-inbound]", out.error);
        }
      } catch (e) {
        console.error("[resend-chief-inbound] background error", e);
      }
    })(),
  );

  return NextResponse.json({ ok: true, queued: true });
}
