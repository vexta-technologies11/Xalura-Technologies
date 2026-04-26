import { createServiceClient } from "@/lib/supabase/service";
import type { AgentNamesConfig } from "@/xalura-agentic/lib/agentNames";

const TABLE = "agentic_agent_names";
const ROW_ID = "default";

function isValidAgentNamesPayload(raw: unknown): raw is Partial<AgentNamesConfig> {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return (
    typeof o.departments === "object" &&
    o.departments != null &&
    typeof o.chiefAI === "object" &&
    o.chiefAI != null
  );
}

/**
 * Load full agent names from Supabase (service role). Returns null if missing, invalid, or no service key.
 */
export async function fetchAgentNamesFromSupabase(): Promise<Partial<AgentNamesConfig> | null> {
  const supabase = createServiceClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select("data")
    .eq("id", ROW_ID)
    .maybeSingle();
  if (error) {
    console.error("[agentic_agent_names] select:", error.message);
    return null;
  }
  const raw = data?.data;
  if (!isValidAgentNamesPayload(raw)) return null;
  return raw;
}

export async function upsertAgentNamesToSupabase(
  config: AgentNamesConfig,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceClient();
  if (!supabase) {
    return {
      ok: false,
      error:
        "Supabase service client unavailable (set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the worker).",
    };
  }
  const { error } = await supabase.from(TABLE).upsert(
    {
      id: ROW_ID,
      data: config as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
