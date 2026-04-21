import { createClient } from "@/lib/supabase/server";
import { isAgentKvConfigured } from "@/lib/agentKvConfig";
import { listApprovedAgentUpdatesKv } from "@/lib/agentUpdatesStore";
import { getWorkloadDailySinceKv } from "@/lib/agentWorkloadKv";
import type { AgentUpdateRow, AgentWorkloadDayRow } from "@/types/agent-dashboard";

function hasSupabaseEnv() {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** Public: approved agent activity from KV (not Supabase). */
export async function getApprovedAgentUpdates(
  limit = 50,
): Promise<AgentUpdateRow[]> {
  if (!isAgentKvConfigured()) return [];
  try {
    return (await listApprovedAgentUpdatesKv(limit)) as AgentUpdateRow[];
  } catch {
    return [];
  }
}

/** Public: daily workload from KV. */
export async function getWorkloadDailySince(
  sinceIsoDate: string,
): Promise<AgentWorkloadDayRow[]> {
  if (!isAgentKvConfigured()) return [];
  try {
    return await getWorkloadDailySinceKv(sinceIsoDate);
  } catch {
    return [];
  }
}

/** Enrich approved rows with employee display names from Supabase (human directory). */
export async function enrichAgentRowsWithEmployeeNames(
  rows: AgentUpdateRow[],
): Promise<AgentUpdateRow[]> {
  if (!hasSupabaseEnv() || !rows.length) return rows;
  try {
    const supabase = createClient();
    const { data: emps } = await supabase.from("employees").select("id, name");
    const nameById = new Map((emps ?? []).map((e) => [e.id, e.name]));
    return rows.map((r) => {
      if (!r.employee_id) return r;
      const n = nameById.get(r.employee_id);
      if (!n) return r;
      return {
        ...r,
        agent_external_id: n,
      };
    });
  } catch {
    return rows;
  }
}
