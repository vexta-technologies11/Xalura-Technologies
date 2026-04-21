import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type Body = {
  agent_id?: string;
  activity_text?: string;
  activity_type?: string;
};

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const token =
    auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;

  if (!token) {
    return NextResponse.json({ error: "Missing Bearer token" }, { status: 401 });
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

  const agentId = typeof body.agent_id === "string" ? body.agent_id : "";
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

  const { data: keyRow, error: keyErr } = await service
    .from("agent_api_keys")
    .select("id, employee_id, is_active, api_key")
    .eq("api_key", token)
    .maybeSingle();

  if (keyErr || !keyRow) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  if (!keyRow.is_active) {
    return NextResponse.json({ error: "API key is inactive" }, { status: 403 });
  }

  if (keyRow.employee_id !== agentId) {
    return NextResponse.json(
      { error: "agent_id does not match this API key" },
      { status: 403 },
    );
  }

  const { data: inserted, error: insErr } = await service
    .from("agent_updates")
    .insert({
      employee_id: agentId,
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

  return NextResponse.json({ ok: true, id: inserted?.id });
}
