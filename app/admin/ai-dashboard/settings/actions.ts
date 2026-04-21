"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { putAgentApiKeyForEmployee } from "@/lib/agentApiKeysKv";
import { createClient } from "@/lib/supabase/server";

export async function generateAgentApiKey(employeeId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Unauthorized" };
  }

  const { data: emp, error: empErr } = await supabase
    .from("employees")
    .select("name")
    .eq("id", employeeId)
    .single();

  if (empErr || !emp) {
    return { ok: false as const, error: "Employee not found" };
  }

  const apiKey = `xal_${randomBytes(24).toString("hex")}`;
  await putAgentApiKeyForEmployee(employeeId, apiKey, {
    employee_id: employeeId,
    employee_display_name: emp.name.trim(),
    is_active: true,
  });

  revalidatePath("/admin/ai-dashboard/settings");
  revalidatePath("/admin/ai-dashboard");
  return { ok: true as const, apiKey };
}
