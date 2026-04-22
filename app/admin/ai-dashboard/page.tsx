import { createClient } from "@/lib/supabase/server";
import { AiDashboardClient } from "@/components/admin/AiDashboardClient";
import { isAgentKvConfigured } from "@/lib/agentKvConfig";
import { getTrafficLog, listAgentUpdatesRecent } from "@/lib/agentUpdatesStore";
import type { AgentUpdateRow } from "@/types/agent-dashboard";

export default async function AdminAiDashboardPage() {
  const supabase = createClient();
  const kvOk = isAgentKvConfigured();

  const { data: employees } = await supabase
    .from("employees")
    .select("id, name")
    .order("display_order");

  const updates = kvOk ? await listAgentUpdatesRecent(200) : [];
  const traffic = kvOk ? await getTrafficLog(40) : [];

  return (
    <AiDashboardClient
      initialUpdates={(updates ?? []) as AgentUpdateRow[]}
      employees={employees ?? []}
      initialTraffic={traffic}
    />
  );
}
