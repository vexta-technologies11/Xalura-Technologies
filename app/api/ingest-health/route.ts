import { NextResponse } from "next/server";
import { isAgentIngestSecurityActive } from "@/lib/agentUpdateIngestBootstrap";
import { getSharedIngestSecret, isAgentUpdateOpenIngest } from "@/lib/ingestAuth";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

/** Public sanity check: no secrets returned. Use after setting Vercel env + redeploy. */
export async function GET(request: Request) {
  const sharedConfigured = !!getSharedIngestSecret();
  const openIngest = isAgentUpdateOpenIngest();
  const service = createServiceClient();
  const serviceOk = !!service;
  const ingestLocked =
    serviceOk && (await isAgentIngestSecurityActive(service));
  const host = request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const postUrl = `${proto}://${host}/api/agent-update`;

  const unauthenticatedOk = openIngest || !ingestLocked;

  return NextResponse.json({
    ok: true,
    shared_ingest_secret_configured: sharedConfigured,
    agent_update_open_ingest: openIngest,
    /** After any agent update is approved or declined in Admin, Bearer is required (unless open ingest). */
    ingest_credentials_required: ingestLocked && !openIngest,
    unauthenticated_ingest_allowed: unauthenticatedOk,
    supabase_service_role_configured: serviceOk,
    post_url: postUrl,
    instructions: openIngest
      ? "DANGER: AGENT_UPDATE_OPEN_INGEST=true — unauthenticated ingest is enabled. Anyone can POST. Turn off when integrations work."
      : !ingestLocked
        ? "Bootstrap: POST without Bearer is allowed until you approve or decline any item in Admin → AI Dashboard. Then set AGENT_INGEST_SECRET and send Authorization: Bearer."
        : sharedConfigured
          ? "POST JSON to post_url with Authorization: Bearer <AGENT_INGEST_SECRET> (or X-Xalura-Ingest-Token) plus agent_id + activity_text."
          : "Set AGENT_INGEST_SECRET on this Vercel project and redeploy. Value is chosen by you — not shown in admin.",
  });
}
