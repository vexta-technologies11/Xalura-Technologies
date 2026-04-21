import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Once any agent update has been approved or declined in Admin, unauthenticated
 * POST /api/agent-update is rejected (unless AGENT_UPDATE_OPEN_INGEST=true).
 */
export async function isAgentIngestSecurityActive(
  service: SupabaseClient,
): Promise<boolean> {
  const { data, error } = await service
    .from("agent_updates")
    .select("id")
    .in("review_status", ["approved", "declined"])
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[agent-update] ingest security check failed", error);
    return true;
  }
  return data != null;
}
