import { NextResponse } from "next/server";
import { isAgentIngestSecurityActive } from "@/lib/agentUpdateIngestBootstrap";
import {
  getSharedIngestSecret,
  isAgentUpdateAcceptAny,
  isAgentUpdateOpenIngest,
} from "@/lib/ingestAuth";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

/** Public sanity check: no secrets returned. Use after setting Vercel env + redeploy. */
export async function GET(request: Request) {
  const sharedConfigured = !!getSharedIngestSecret();
  const openIngest = isAgentUpdateOpenIngest();
  const acceptAny = isAgentUpdateAcceptAny();
  const service = createServiceClient();
  const serviceOk = !!service;
  const probe = service
    ? await service.from("agent_updates").select("id").limit(1)
    : { error: { message: "no client" } as { message: string } };
  const supabaseAcceptsServiceRole = serviceOk && !probe.error;
  const probeMsg = probe.error?.message ?? "";
  const probeCode =
    probe.error && typeof probe.error === "object" && "code" in probe.error
      ? String((probe.error as { code?: string }).code ?? "")
      : "";

  const ingestLocked =
    supabaseAcceptsServiceRole && service
      ? await isAgentIngestSecurityActive(service)
      : false;

  const host = request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const postUrl = `${proto}://${host}/api/agent-update`;

  const unauthenticatedOk =
    supabaseAcceptsServiceRole &&
    (openIngest || !ingestLocked || acceptAny);

  const instructions = (() => {
    if (!serviceOk) {
      return "Set SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL on Vercel and redeploy.";
    }
    if (acceptAny) {
      return "TEST MODE: AGENT_UPDATE_ACCEPT_ANY=true — wrong/missing Bearer still inserts pending rows. Disable after GearMedic works.";
    }
    if (!supabaseAcceptsServiceRole) {
      return /invalid api key/i.test(probeMsg)
        ? "Supabase rejected SUPABASE_SERVICE_ROLE_KEY (wrong project, revoked, or truncated). Paste service_role from Supabase → Settings → API. Redeploy. HTTP 500 {\"error\":\"Invalid API key\"} on POST usually means this — not your ingest Bearer."
        : `Supabase query failed: ${probeMsg}. Fix env and redeploy.`;
    }
    if (openIngest) {
      return "DANGER: AGENT_UPDATE_OPEN_INGEST=true — unauthenticated ingest is enabled. Anyone can POST. Turn off when integrations work.";
    }
    if (!ingestLocked) {
      return "Bootstrap: POST without Bearer is allowed until you approve or decline any item in Admin → AI Dashboard. Then set AGENT_INGEST_SECRET and send Authorization: Bearer.";
    }
    if (sharedConfigured) {
      return "POST JSON to post_url with Authorization: Bearer <AGENT_INGEST_SECRET> (or X-Xalura-Ingest-Token) plus agent_id + activity_text.";
    }
    return "Set AGENT_INGEST_SECRET on this Vercel project and redeploy. Value is chosen by you — not shown in admin.";
  })();

  return NextResponse.json({
    ok: true,
    shared_ingest_secret_configured: sharedConfigured,
    agent_update_open_ingest: openIngest,
    /** After any agent update is approved or declined in Admin, Bearer is required (unless open ingest or accept_any). */
    ingest_credentials_required: ingestLocked && !openIngest && !acceptAny,
    agent_update_accept_any: acceptAny,
    unauthenticated_ingest_allowed: unauthenticatedOk,
    supabase_service_role_configured: serviceOk,
    /** False when PostgREST rejects the key (same root cause as 500 Invalid API key on insert). */
    supabase_service_role_accepted_by_api: supabaseAcceptsServiceRole,
    /** Verbatim PostgREST error when probe fails (no secrets). Use to confirm "Invalid API key" vs missing table. */
    supabase_probe_error: supabaseAcceptsServiceRole ? null : probeMsg || null,
    supabase_probe_code: supabaseAcceptsServiceRole ? null : probeCode || null,
    post_url: postUrl,
    instructions,
  });
}
