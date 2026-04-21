import { createClient } from "@/lib/supabase/server";
import { AiDashboardClient } from "@/components/admin/AiDashboardClient";
import type { AgentUpdateRow } from "@/types/agent-dashboard";

export default async function AdminAiDashboardPage() {
  const supabase = createClient();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 21);
  const sinceStr = since.toISOString().slice(0, 10);

  const [{ data: employees }, { data: updates }, { data: workload }] =
    await Promise.all([
      supabase.from("employees").select("id, name").order("display_order"),
      supabase
        .from("agent_updates")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("agent_workload_daily")
        .select("employee_id, day, update_count")
        .gte("day", sinceStr)
        .order("day", { ascending: true }),
    ]);

  const wl =
    workload?.map((w) => ({
      employee_id: w.employee_id as string,
      day: w.day as string,
      update_count: Number(w.update_count),
    })) ?? [];

  return (
    <AiDashboardClient
      initialUpdates={(updates ?? []) as AgentUpdateRow[]}
      employees={employees ?? []}
      workload={wl}
    />
  );
}
