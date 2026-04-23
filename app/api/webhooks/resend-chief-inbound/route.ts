import { Webhook } from "svix";
import { NextRequest, NextResponse } from "next/server";
import { waitUntilAfterResponse } from "@/xalura-agentic/lib/cloudflareWaitUntil";
import { resolveWorkerEnv } from "@/xalura-agentic/lib/resolveWorkerEnv";
import { chiefReplyToInboundEmail } from "@/lib/chiefInboundReply";
import { resendFetchReceivedEmail } from "@/lib/resendReceiving";

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
  const toList = Array.isArray(data?.["to"])
    ? (data["to"] as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  if (
    toFilter &&
    toList.length > 0 &&
    !toList.some((t) => t.toLowerCase().includes(toFilter))
  ) {
    return NextResponse.json({ ok: true, ignored: true, reason: "to_filter" });
  }

  waitUntilAfterResponse(
    (async () => {
      try {
        const row = await resendFetchReceivedEmail(emailId);
        if (!row?.from?.trim()) {
          console.warn("[resend-chief-inbound] missing row or from after fetch");
          return;
        }
        const out = await chiefReplyToInboundEmail({ row });
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
