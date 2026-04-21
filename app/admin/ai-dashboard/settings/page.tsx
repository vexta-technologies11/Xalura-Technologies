import { createClient } from "@/lib/supabase/server";
import { AiSettingsClient } from "@/components/admin/AiSettingsClient";
import { IngestConfigBanner } from "@/components/admin/IngestConfigBanner";
import { getIngestSecretFingerprint } from "@/lib/ingestAuth";

export default async function AiDashboardSettingsPage() {
  const supabase = createClient();
  const [{ data: employees }, { data: keys }] = await Promise.all([
    supabase.from("employees").select("id, name, role").order("display_order"),
    supabase.from("agent_api_keys").select("employee_id, api_key, is_active, created_at"),
  ]);

  const fp = getIngestSecretFingerprint();

  return (
    <>
      <IngestConfigBanner fp={fp} />
      <AiSettingsClient employees={employees ?? []} keys={keys ?? []} />
    </>
  );
}
