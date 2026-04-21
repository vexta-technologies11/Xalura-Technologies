import { NextResponse } from "next/server";
import { resolveEmployeeForApiKey } from "@/lib/agentUpdateResolveEmployee";
import { isAgentIngestSecurityActive } from "@/lib/agentUpdateIngestBootstrap";
import {
  extractIngestBearerToken,
  getSharedIngestSecret,
  isAgentUpdateAcceptAny,
  isAgentUpdateOpenIngest,
} from "@/lib/ingestAuth";
import { parseAgentUpdateBody } from "@/lib/parseAgentUpdateBody";
import { responseBodyForSupabaseWriteError } from "@/lib/supabaseIngestErrors";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type Body = {
  agent_id?: string;
  activity_text?: string;
  activity_type?: string;
};

export async function POST(request: Request) {
  const openForce = isAgentUpdateOpenIngest();
  const acceptAny = isAgentUpdateAcceptAny();
  const token = extractIngestBearerToken(request);

  const service = createServiceClient();
  if (!service) {
    return NextResponse.json(
      { error: "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 },
    );
  }

  const securityActive = await isAgentIngestSecurityActive(service);
  const allowRelaxed = !securityActive || openForce || acceptAny;

  if (securityActive && !openForce && !acceptAny && !token) {
    return NextResponse.json(
      {
        error:
          "Missing credentials: send Authorization: Bearer <token> or header X-Xalura-Ingest-Token (same value as AGENT_INGEST_SECRET in Vercel). Ingest was locked after the first review in Admin — use the shared secret or an xal_ key.",
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
    const { data: inserted, error: insErr } = await service
      .from("agent_updates")
      .insert({
        employee_id: null,
        agent_external_id: agentId,
        activity_text: activityText,
        activity_type: activityType,
        review_status: "pending",
      })
      .select("id")
      .single();

    if (insErr) {
      const mapped = responseBodyForSupabaseWriteError(insErr);
      return NextResponse.json(mapped.body, { status: mapped.status });
    }

    return NextResponse.json({
      ok: true,
      id: inserted?.id,
      mode: "shared_secret",
    });
  }

  if (token) {
    const authToken = token;
    const { data: keyRow, error: keyErr } = await service
      .from("agent_api_keys")
      .select("id, employee_id, is_active, api_key")
      .eq("api_key", authToken)
      .maybeSingle();

    if (keyRow && !keyRow.is_active) {
      if (!acceptAny) {
        return NextResponse.json({ error: "API key is inactive" }, { status: 403 });
      }
    } else if (keyRow && keyRow.is_active) {
      const resolved = await resolveEmployeeForApiKey(service, keyRow, agentId);
      if (resolved.ok) {
        const { data: emp } = await service
          .from("employees")
          .select("name")
          .eq("id", resolved.employeeId)
          .maybeSingle();

        const externalLabel = (emp?.name || agentId).trim().slice(0, 200);

        const { data: inserted, error: insErr } = await service
          .from("agent_updates")
          .insert({
            employee_id: resolved.employeeId,
            agent_external_id: externalLabel,
            activity_text: activityText,
            activity_type: activityType,
            review_status: "pending",
          })
          .select("id")
          .single();

        if (insErr) {
          const mapped = responseBodyForSupabaseWriteError(insErr);
          return NextResponse.json(mapped.body, { status: mapped.status });
        }

        return NextResponse.json({ ok: true, id: inserted?.id, mode: "api_key" });
      }
      if (!acceptAny) {
        return NextResponse.json({ error: resolved.message }, { status: 403 });
      }
    }

    if (keyErr || !keyRow) {
      if (securityActive && !openForce && !acceptAny) {
        if (!sharedSecret) {
          return NextResponse.json(
            {
              error:
                "Ingest not configured: set AGENT_INGEST_SECRET (or XALURA_INGEST_TOKEN / XALURA_AGENT_BEARER) on this Vercel project and redeploy. Admin UI does not show this value — set it in Vercel → Environment Variables.",
            },
            { status: 401 },
          );
        }
        if (authToken.startsWith("xal_")) {
          return NextResponse.json(
            {
              error: "Unknown xal_ key",
              detail:
                "Your Authorization Bearer starts with xal_ but that exact key is not in this site's database. Common fixes: (1) Xalura Admin → AI Dashboard → Settings → Generate key for the agent, copy the full key into GearMedic/Vercel with no extra spaces. (2) If you rotated keys, update the new xal_… everywhere. (3) If you meant SHARED ingest (one token for all agents), use AGENT_INGEST_SECRET from Vercel as Bearer — it does NOT start with xal_. (4) Confirm GearMedic points at the same Supabase project as www.xaluratech.com.",
            },
            { status: 401 },
          );
        }
        return NextResponse.json(
          {
            error:
              "Invalid API key: token did not match AGENT_INGEST_SECRET / X-Xalura-Ingest-Token (compare length + last 4 chars in Admin → AI Dashboard) and is not a valid xal_ key.",
          },
          { status: 401 },
        );
      }
    }
  }

  if (allowRelaxed) {
    const { data: inserted, error: insErr } = await service
      .from("agent_updates")
      .insert({
        employee_id: null,
        agent_external_id: agentId,
        activity_text: activityText,
        activity_type: activityType,
        review_status: "pending",
      })
      .select("id")
      .single();

    if (insErr) {
      const mapped = responseBodyForSupabaseWriteError(insErr);
      return NextResponse.json(mapped.body, { status: mapped.status });
    }

    const mode = acceptAny
      ? "accept_any"
      : openForce
        ? "open_ingest"
        : "bootstrap";

    return NextResponse.json({
      ok: true,
      id: inserted?.id,
      mode,
    });
  }

  return NextResponse.json(
    { error: "Unexpected ingest routing — report this response to Xalura." },
    { status: 500 },
  );
}
