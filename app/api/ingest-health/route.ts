import { NextResponse } from "next/server";
import { isAgentKvConfigured } from "@/lib/agentKvConfig";
import { isIngestBootstrapCompleteKv } from "@/lib/agentUpdatesStore";
import {
  getSharedIngestSecret,
  isAgentUpdateAcceptAny,
  isAgentUpdateOpenIngest,
} from "@/lib/ingestAuth";

export const dynamic = "force-dynamic";

/** Public sanity check: no secrets returned. */
export async function GET(request: Request) {
  const sharedConfigured = !!getSharedIngestSecret();
  const openIngest = isAgentUpdateOpenIngest();
  const acceptAny = isAgentUpdateAcceptAny();
  const kvOk = isAgentKvConfigured();

  const ingestLocked = kvOk ? await isIngestBootstrapCompleteKv() : false;

  const host = request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const postUrl = `${proto}://${host}/api/agent-update`;

  const unauthenticatedOk =
    kvOk && (openIngest || !ingestLocked || acceptAny);

  const instructions = (() => {
    if (!kvOk) {
      return "Add Vercel KV / Redis (Marketplace) and set KV_REST_API_URL + KV_REST_API_TOKEN on this project, then redeploy. Agent ingest no longer uses Supabase.";
    }
    if (acceptAny) {
      return "TEST MODE: AGENT_UPDATE_ACCEPT_ANY=true — wrong/missing Bearer can still insert pending rows. Disable after testing.";
    }
    if (!ingestLocked) {
      return "Bootstrap: POST without Bearer allowed until first approve/decline in Admin → AI Dashboard. Then use INGEST_PASSWORD (or AGENT_INGEST_SECRET).";
    }
    if (openIngest) {
      return "DANGER: AGENT_UPDATE_OPEN_INGEST=true — unauthenticated ingest enabled.";
    }
    if (sharedConfigured) {
      return "POST JSON to post_url with Authorization: Bearer <same as INGEST_PASSWORD or AGENT_INGEST_SECRET> plus agent_id + activity_text.";
    }
    return "Set INGEST_PASSWORD (or AGENT_INGEST_SECRET) in project env and redeploy.";
  })();

  return NextResponse.json({
    ok: true,
    agent_ingest_storage: "vercel_kv",
    kv_configured: kvOk,
    shared_ingest_secret_configured: sharedConfigured,
    agent_update_open_ingest: openIngest,
    ingest_credentials_required: ingestLocked && !openIngest && !acceptAny,
    agent_update_accept_any: acceptAny,
    unauthenticated_ingest_allowed: unauthenticatedOk,
    post_url: postUrl,
    instructions,
    note: "Supabase is not used for agent POST /api/agent-update. Human admin login still uses Supabase Auth.",
  });
}
