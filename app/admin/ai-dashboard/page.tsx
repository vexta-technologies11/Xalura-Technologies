import { createClient } from "@/lib/supabase/server";
import { AiDashboardClient } from "@/components/admin/AiDashboardClient";
import { IngestConfigBanner } from "@/components/admin/IngestConfigBanner";
import { isAgentKvConfigured } from "@/lib/agentKvConfig";
import { getWorkloadDailySinceKv } from "@/lib/agentWorkloadKv";
import { getIngestSecretFingerprint } from "@/lib/ingestAuth";
import {
  getTrafficLog,
  listAgentUpdatesRecent,
} from "@/lib/agentUpdatesStore";
import type { AgentUpdateRow } from "@/types/agent-dashboard";

export default async function AdminAiDashboardPage() {
  const supabase = createClient();
  const ingestFp = getIngestSecretFingerprint();
  const kvOk = isAgentKvConfigured();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 21);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data: employees, error: employeesError } = await supabase
    .from("employees")
    .select("id, name")
    .order("display_order");

  const updates = kvOk ? await listAgentUpdatesRecent(200) : [];
  const workload = kvOk ? await getWorkloadDailySinceKv(sinceStr) : [];
  const traffic = kvOk ? await getTrafficLog(40) : [];

  const wl = workload.map((w) => ({
    employee_id: w.employee_id,
    day: w.day,
    update_count: w.update_count,
  }));

  const loadError = !kvOk
    ? "Agent ingest KV is not configured. Add Vercel KV / Redis and set KV_REST_API_URL + KV_REST_API_TOKEN, then redeploy."
    : employeesError?.message || null;

  const stats = {
    pending: updates.filter((u) => u.review_status === "pending").length,
    approved: updates.filter((u) => u.review_status === "approved").length,
    declined: updates.filter((u) => u.review_status === "declined").length,
  };

  return (
    <>
      <IngestConfigBanner fp={ingestFp} kvConfigured={kvOk} />
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
          <strong>Agent pipeline</strong>
          <p style={{ margin: "8px 0 0", fontSize: "0.875rem", lineHeight: 1.5 }}>
            {loadError}
          </p>
        </div>
      ) : null}
      <AiDashboardClient
        initialUpdates={(updates ?? []) as AgentUpdateRow[]}
        employees={employees ?? []}
        workload={wl}
        initialTraffic={traffic}
        trafficStats={stats}
      />
    </>
  );
}
