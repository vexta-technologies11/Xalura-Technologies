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
  readHeadOfNewsInboundTo,
  readInboundRouteEnv,
} from "@/lib/inboundRouteEnv";
import {
  buildRoutingRecipientList,
  mergeResendReceivedWithWebhook,
  resendFetchReceivedEmail,
} from "@/lib/resendReceiving";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function header(req: NextRequest, name: string): string | null {
  return req.headers.get(name) ?? req.headers.get(name.toLowerCase());
}

export async function POST(req: NextRequest) {
  const chiefSecret = (await resolveWorkerEnv("RESEND_WEBHOOK_SECRET"))?.trim();
  const newsSecret = (await resolveWorkerEnv("RESEND_WEBHOOK_SECRET_2"))?.trim();
  if (!chiefSecret && !newsSecret) {
    return NextResponse.json(
      {
        error:
          "Set RESEND_WEBHOOK_SECRET (Chief webhook) and/or RESEND_WEBHOOK_SECRET_2 (news team webhook)",
      },
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
  const svixInput = {
    "svix-id": svixId,
    "svix-timestamp": svixTs,
    "svix-signature": svixSig,
  } as const;

  let payload: unknown | undefined;
  for (const s of [chiefSecret, newsSecret] as const) {
    if (!s) continue;
    try {
      payload = new Webhook(s).verify(rawBody, svixInput);
      break;
    } catch {
      /* try next signing secret */
    }
  }
  if (payload === undefined) {
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

  const toFilter = (await readInboundRouteEnv("CHIEF_INBOUND_TO_FILTER")).toLowerCase();
  const toHonH = (await readHeadOfNewsInboundTo()).toLowerCase();
  const toAudH = (await readInboundRouteEnv("CHIEF_OF_AUDIT_NEWS_INBOUND_TO")).toLowerCase();
  const toHonExact = (await readInboundRouteEnv("HEAD_OF_NEWS_INBOUND_EXACT")).toLowerCase();
  const headerRecipients = buildRoutingRecipientList(
    data as Record<string, unknown> | undefined,
    undefined,
  );

  if (
    toFilter &&
    headerRecipients.length > 0 &&
    !headerRecipients.some((t) => t.includes(toFilter)) &&
    !(
      toHonH && headerRecipients.some((t) => t === toHonH || t.includes(toHonH))
    ) &&
    !(
      toAudH && headerRecipients.some((t) => t === toAudH || t.includes(toAudH))
    ) &&
    !(
      toHonExact && headerRecipients.some((t) => t === toHonExact)
    )
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
        const recipients = buildRoutingRecipientList(
          data as Record<string, unknown> | undefined,
          row.to,
        );
        const toHonI = (await readHeadOfNewsInboundTo()).toLowerCase();
        const toAudI = (await readInboundRouteEnv("CHIEF_OF_AUDIT_NEWS_INBOUND_TO")).toLowerCase();
        const toHonExI = (await readInboundRouteEnv("HEAD_OF_NEWS_INBOUND_EXACT")).toLowerCase();
        const matchHon = Boolean(
          (toHonI && recipients.some((t) => t === toHonI || t.includes(toHonI))) ||
            (toHonExI && recipients.some((t) => t === toHonExI)),
        );
        const matchAud = Boolean(
          toAudI && recipients.some((t) => t === toAudI || t.includes(toAudI)),
        );
        if (recipients.length > 0 && toHonI && !matchHon && !matchAud) {
          console.warn(
            "[resend-chief-inbound] no HON/auditor substring match; falling back to Chief. recipients=",
            JSON.stringify(recipients),
            "HEAD_OF_NEWS_INBOUND_TO/NEWS_HEAD_INBOUND_TO (nonempty)?",
            Boolean(toHonI),
            "set same vars on Vercel/Cloudflare as in .env.local",
          );
        } else if (recipients.length > 0 && !toHonI && !toAudI) {
          console.warn(
            "[resend-chief-inbound] HEAD_OF_NEWS_INBOUND_TO and CHIEF_OF_AUDIT_NEWS_INBOUND_TO are empty; all mail routes to Chief.",
          );
        }
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
