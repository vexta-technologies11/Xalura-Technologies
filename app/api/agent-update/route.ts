import { NextResponse } from "next/server";
import { extractIngestBearerToken, getSharedIngestSecret } from "@/lib/ingestAuth";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type Body = {
  agent_id?: string;
  activity_text?: string;
  activity_type?: string;
};

export async function POST(request: Request) {
  const token = extractIngestBearerToken(request);

  if (!token) {
    return NextResponse.json(
      {
        error:
          "Missing credentials: send Authorization: Bearer <token> or header X-Xalura-Ingest-Token (same value as AGENT_INGEST_SECRET in Vercel).",
      },
      { status: 401 },
    );
  }

  const service = createServiceClient();
  if (!service) {
    return NextResponse.json(
      { error: "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawAgentId = typeof body.agent_id === "string" ? body.agent_id : "";
  const agentId = rawAgentId.trim().slice(0, 200);
  const activityText =
    typeof body.activity_text === "string" ? body.activity_text.trim() : "";
  const activityType =
    typeof body.activity_type === "string" && body.activity_type.trim()
      ? body.activity_type.trim()
      : "status";

  if (!agentId || !activityText) {
    return NextResponse.json(
      { error: "agent_id and activity_text are required" },
      { status: 400 },
    );
  }

  const sharedSecret = getSharedIngestSecret();

  if (sharedSecret && token === sharedSecret) {
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
      return NextResponse.json(
        { error: insErr.message ?? "Insert failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      id: inserted?.id,
      mode: "shared_secret",
    });
  }

  const { data: keyRow, error: keyErr } = await service
    .from("agent_api_keys")
    .select("id, employee_id, is_active, api_key")
    .eq("api_key", token)
    .maybeSingle();

  if (keyErr || !keyRow) {
    if (!sharedSecret) {
      return NextResponse.json(
        {
          error:
            "Ingest not configured: set AGENT_INGEST_SECRET (or XALURA_INGEST_TOKEN / XALURA_AGENT_BEARER) on this Vercel project and redeploy. Admin UI does not show this value — set it in Vercel → Environment Variables.",
        },
        { status: 401 },
      );
    }
    if (token.startsWith("xal_")) {
      return NextResponse.json(
        {
          error:
            "Invalid per-agent key: no xal_ key in this Supabase project, or key was rotated. Regenerate in Admin → AI Dashboard → Settings. JSON agent_id must be that employee's UUID (not the display name). Shared AGENT_INGEST_SECRET is a different token — do not mix them.",
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

  if (!keyRow.is_active) {
    return NextResponse.json({ error: "API key is inactive" }, { status: 403 });
  }

  if (keyRow.employee_id !== agentId) {
    return NextResponse.json(
      { error: "agent_id must match the UUID for this per-agent API key" },
      { status: 403 },
    );
  }

  const { data: emp } = await service
    .from("employees")
    .select("name")
    .eq("id", keyRow.employee_id)
    .maybeSingle();

  const externalLabel = (emp?.name || agentId).trim().slice(0, 200);

  const { data: inserted, error: insErr } = await service
    .from("agent_updates")
    .insert({
      employee_id: keyRow.employee_id,
      agent_external_id: externalLabel,
      activity_text: activityText,
      activity_type: activityType,
      review_status: "pending",
    })
    .select("id")
    .single();

  if (insErr) {
    return NextResponse.json(
      { error: insErr.message ?? "Insert failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: inserted?.id, mode: "api_key" });
}
