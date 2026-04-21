"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function generateAgentApiKey(employeeId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Unauthorized" };
  }

  const apiKey = `xal_${randomBytes(24).toString("hex")}`;
  const { error } = await supabase.from("agent_api_keys").upsert(
    {
      employee_id: employeeId,
      api_key: apiKey,
      is_active: true,
    },
    { onConflict: "employee_id" },
  );

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/admin/ai-dashboard/settings");
  revalidatePath("/admin/ai-dashboard");
  return { ok: true as const, apiKey };
}
