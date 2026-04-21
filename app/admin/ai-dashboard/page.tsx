import { createClient } from "@/lib/supabase/server";
import { AiDashboardClient } from "@/components/admin/AiDashboardClient";
import type { AgentUpdateRow } from "@/types/agent-dashboard";

export default async function AdminAiDashboardPage() {
  const supabase = createClient();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 21);
  const sinceStr = since.toISOString().slice(0, 10);

  const [
    { data: employees, error: employeesError },
    { data: updates, error: updatesError },
    { data: workload, error: workloadError },
  ] = await Promise.all([
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

  const loadError =
    employeesError?.message ||
    updatesError?.message ||
    workloadError?.message ||
    null;

  return (
    <>
      {loadError ? (
        <div
          className="admin-card admin-card-pad"
          style={{
            marginBottom: 20,
            borderColor: "#fecaca",
            background: "#fef2f2",
            color: "#991b1b",
          }}
        >
          <strong>Could not load dashboard data from Supabase.</strong>
          <p style={{ margin: "8px 0 0", fontSize: "0.875rem", lineHeight: 1.5 }}>
            {loadError}
          </p>
          <p style={{ margin: "12px 0 0", fontSize: "0.8125rem", opacity: 0.9 }}>
            If you see “relation agent_updates does not exist”, run{" "}
            <code>supabase/schema.sql</code> in the SQL editor. If ingest returns 200 but
            this list stays empty with no error, confirm Vercel{" "}
            <code>NEXT_PUBLIC_SUPABASE_URL</code> matches the project where you run SQL.
          </p>
        </div>
      ) : null}
      <AiDashboardClient
        initialUpdates={(updates ?? []) as AgentUpdateRow[]}
        employees={employees ?? []}
        workload={wl}
      />
    </>
  );
}
