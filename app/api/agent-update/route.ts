import { NextResponse } from "next/server";
import {
  getAgentApiKeyRecord,
  resolveAgentIdForKvKey,
} from "@/lib/agentApiKeysKv";
import { isAgentKvConfigured } from "@/lib/agentKvConfig";
import { isAgentIngestSecurityActive } from "@/lib/agentUpdateIngestBootstrap";
import {
  createAgentUpdate,
} from "@/lib/agentUpdatesStore";
import {
  extractIngestBearerToken,
  getSharedIngestSecret,
  isAgentUpdateAcceptAny,
  isAgentUpdateOpenIngest,
} from "@/lib/ingestAuth";
import { parseAgentUpdateBody } from "@/lib/parseAgentUpdateBody";

export const dynamic = "force-dynamic";

type Body = {
  agent_id?: string;
  activity_text?: string;
  activity_type?: string;
};

const KV_503 = {
  error:
    "Agent ingest storage is not configured. In Vercel: create a Redis/KV store (Marketplace), link it so KV_REST_API_URL and KV_REST_API_TOKEN are set, then redeploy. Agent traffic does not use Supabase.",
};

export async function POST(request: Request) {
  if (!isAgentKvConfigured()) {
    return NextResponse.json(KV_503, { status: 503 });
  }

  const openForce = isAgentUpdateOpenIngest();
  const acceptAny = isAgentUpdateAcceptAny();
  const token = extractIngestBearerToken(request);

  const securityActive = await isAgentIngestSecurityActive();
  const allowRelaxed = !securityActive || openForce || acceptAny;

  if (securityActive && !openForce && !acceptAny && !token) {
    return NextResponse.json(
      {
        error:
          "Missing credentials: send Authorization: Bearer <token> or header X-Xalura-Ingest-Token (same value as AGENT_INGEST_SECRET in Vercel). Ingest locked after the first review in Admin — use the shared secret or an xal_ key.",
      },
      { status: 401 },
    );
  }

  const parsed = await parseAgentUpdateBody(request);
  let body: Body;
  if (parsed.ok) {
    body = parsed.body as Body;
  } else if (allowRelaxed && parsed.payload.reason === "empty_body") {
    body = {};
  } else {
    return NextResponse.json(parsed.payload, { status: 400 });
  }

  const rawAgentId = typeof body.agent_id === "string" ? body.agent_id : "";
  let agentId = rawAgentId.trim().slice(0, 200);
  let activityText =
    typeof body.activity_text === "string" ? body.activity_text.trim() : "";
  const activityType =
    typeof body.activity_type === "string" && body.activity_type.trim()
      ? body.activity_type.trim()
      : "status";

  if (allowRelaxed) {
    if (!agentId) agentId = "guest";
    if (!activityText) activityText = "(no activity_text)";
  } else if (!agentId || !activityText) {
    return NextResponse.json(
      { error: "agent_id and activity_text are required" },
      { status: 400 },
    );
  }

  const sharedSecret = getSharedIngestSecret();

  if (sharedSecret && token && token === sharedSecret) {
    const res = await createAgentUpdate({
      employee_id: null,
      agent_external_id: agentId,
      activity_text: activityText,
      activity_type: activityType,
      review_status: "pending",
      ingest_mode: "shared_secret",
    });
    if ("error" in res) {
      return NextResponse.json(
        { error: res.error === "KV_NOT_CONFIGURED" ? KV_503.error : "Write failed" },
        { status: res.error === "KV_NOT_CONFIGURED" ? 503 : 500 },
      );
    }
    return NextResponse.json({
      ok: true,
      id: res.id,
      mode: "shared_secret",
    });
  }

  if (token) {
    const authToken = token;
    const keyRow = await getAgentApiKeyRecord(authToken);

    if (keyRow && !keyRow.is_active) {
      if (!acceptAny) {
        return NextResponse.json({ error: "API key is inactive" }, { status: 403 });
      }
    } else if (keyRow && keyRow.is_active) {
      const resolved = resolveAgentIdForKvKey(keyRow, agentId);
      if (resolved.ok) {
        const externalLabel = (keyRow.employee_display_name || agentId).trim().slice(0, 200);
        const ins = await createAgentUpdate({
          employee_id: resolved.employeeId,
          agent_external_id: externalLabel,
          activity_text: activityText,
          activity_type: activityType,
          review_status: "pending",
          ingest_mode: "api_key",
        });
        if ("error" in ins) {
          return NextResponse.json(
            { error: ins.error === "KV_NOT_CONFIGURED" ? KV_503.error : "Write failed" },
            { status: ins.error === "KV_NOT_CONFIGURED" ? 503 : 500 },
          );
        }
        return NextResponse.json({ ok: true, id: ins.id, mode: "api_key" });
      }
      if (!acceptAny) {
        return NextResponse.json({ error: resolved.message }, { status: 403 });
      }
    }

    if (!keyRow) {
      if (securityActive && !openForce && !acceptAny) {
        if (!sharedSecret) {
          return NextResponse.json(
            {
              error:
                "Ingest not configured: set AGENT_INGEST_SECRET (or XALURA_INGEST_TOKEN / XALURA_AGENT_BEARER) on this Vercel project and redeploy.",
            },
            { status: 401 },
          );
        }
        if (authToken.startsWith("xal_")) {
          return NextResponse.json(
            {
              error: "Unknown xal_ key",
              detail:
                "Bearer starts with xal_ but that key is not registered. Generate a new key in Admin → AI Dashboard → Settings (stored in Vercel KV, not Supabase).",
            },
            { status: 401 },
          );
        }
        return NextResponse.json(
          {
            error:
              "Invalid API key: token did not match AGENT_INGEST_SECRET / X-Xalura-Ingest-Token and is not a registered xal_ key.",
          },
          { status: 401 },
        );
      }
    }
  }

  if (allowRelaxed) {
    const ins = await createAgentUpdate({
      employee_id: null,
      agent_external_id: agentId,
      activity_text: activityText,
      activity_type: activityType,
      review_status: "pending",
      ingest_mode: acceptAny ? "accept_any" : openForce ? "open_ingest" : "bootstrap",
    });
    if ("error" in ins) {
      return NextResponse.json(
        { error: ins.error === "KV_NOT_CONFIGURED" ? KV_503.error : "Write failed" },
        { status: ins.error === "KV_NOT_CONFIGURED" ? 503 : 500 },
      );
    }
    const mode = acceptAny
      ? "accept_any"
      : openForce
        ? "open_ingest"
        : "bootstrap";
    return NextResponse.json({
      ok: true,
      id: ins.id,
      mode,
    });
  }

  return NextResponse.json(
    { error: "Unexpected ingest routing — report this response to Xalura." },
    { status: 500 },
  );
}
