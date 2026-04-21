import { kv } from "@vercel/kv";
import { createClient } from "@/lib/supabase/server";
import { AiSettingsClient } from "@/components/admin/AiSettingsClient";
import { IngestConfigBanner } from "@/components/admin/IngestConfigBanner";
import { isAgentKvConfigured } from "@/lib/agentKvConfig";
import { getIngestSecretFingerprint } from "@/lib/ingestAuth";

export default async function AiDashboardSettingsPage() {
  const supabase = createClient();
  const { data: employees } = await supabase
    .from("employees")
    .select("id, name, role")
    .order("display_order");

  const list = employees ?? [];
  const hasKeyByEmployee: Record<string, boolean> = {};
  if (isAgentKvConfigured()) {
    for (const e of list) {
      hasKeyByEmployee[e.id] =
        (await kv.get(`xalura:v1:emp:${e.id}:has_api_key`)) === "1";
    }
  }

  const fp = getIngestSecretFingerprint();

  return (
    <>
      <IngestConfigBanner fp={fp} kvConfigured={isAgentKvConfigured()} />
      <AiSettingsClient employees={list} hasKeyByEmployee={hasKeyByEmployee} />
    </>
  );
}
