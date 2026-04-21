import { NextResponse } from "next/server";
import { getSharedIngestSecret } from "@/lib/ingestAuth";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

/** Public sanity check: no secrets returned. Use after setting Vercel env + redeploy. */
export async function GET(request: Request) {
  const sharedConfigured = !!getSharedIngestSecret();
  const serviceOk = !!createServiceClient();
  const host = request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const postUrl = `${proto}://${host}/api/agent-update`;

  return NextResponse.json({
    ok: true,
    shared_ingest_secret_configured: sharedConfigured,
    supabase_service_role_configured: serviceOk,
    post_url: postUrl,
    instructions: sharedConfigured
      ? "POST JSON to post_url with Authorization: Bearer <AGENT_INGEST_SECRET> (or X-Xalura-Ingest-Token) plus agent_id + activity_text."
      : "Set AGENT_INGEST_SECRET on this Vercel project and redeploy. Value is chosen by you — not shown in admin.",
  });
}
