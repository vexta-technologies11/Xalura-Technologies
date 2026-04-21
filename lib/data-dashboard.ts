import { createClient } from "@/lib/supabase/server";
import type { AgentUpdateRow, AgentWorkloadDayRow } from "@/types/agent-dashboard";

function hasSupabaseEnv() {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** Public: approved activity only (RLS). */
export async function getApprovedAgentUpdates(
  limit = 50,
): Promise<AgentUpdateRow[]> {
  if (!hasSupabaseEnv()) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("agent_updates")
      .select("*")
      .eq("review_status", "approved")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data as AgentUpdateRow[];
  } catch {
    return [];
  }
}

/** Public: daily workload totals (RLS allows anon read). */
export async function getWorkloadDailySince(
  sinceIsoDate: string,
): Promise<AgentWorkloadDayRow[]> {
  if (!hasSupabaseEnv()) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("agent_workload_daily")
      .select("employee_id, day, update_count")
      .gte("day", sinceIsoDate)
      .order("day", { ascending: true });
    if (error || !data) return [];
    return data.map((r) => ({
      employee_id: r.employee_id as string,
      day: r.day as string,
      update_count: Number(r.update_count),
    }));
  } catch {
    return [];
  }
}
