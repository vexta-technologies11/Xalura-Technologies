"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Approve a pending update. If it has no `employee_id` yet, links to an existing
 * employee with the same display name (case-insensitive) or creates a new row
 * in `employees`, then marks the update approved (triggers workload).
 */
export async function approveAgentUpdate(updateId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Unauthorized" };
  }

  const { data: row, error: fetchErr } = await supabase
    .from("agent_updates")
    .select("id, employee_id, agent_external_id, review_status")
    .eq("id", updateId)
    .single();

  if (fetchErr || !row || row.review_status !== "pending") {
    return { ok: false as const, error: "Update not found or not pending" };
  }

  let employeeId = row.employee_id as string | null;

  if (!employeeId) {
    const label = String(row.agent_external_id ?? "")
      .trim()
      .slice(0, 200);
    if (!label) {
      return { ok: false as const, error: "Missing agent identifier" };
    }

    const { data: emps } = await supabase.from("employees").select("id, name");
    const match = emps?.find(
      (e) => e.name.trim().toLowerCase() === label.toLowerCase(),
    );
    if (match) {
      employeeId = match.id;
    } else {
      const { data: maxRow } = await supabase
        .from("employees")
        .select("display_order")
        .order("display_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextOrder = (maxRow?.display_order ?? 0) + 1;
      const { data: created, error: insErr } = await supabase
        .from("employees")
        .insert({
          name: label,
          role: "AI Agent",
          role_badge: "AI",
          description: "",
          icon_type: "writer",
          display_order: nextOrder,
          is_active: true,
        })
        .select("id")
        .single();

      if (insErr || !created) {
        return {
          ok: false as const,
          error: insErr?.message ?? "Failed to register employee",
        };
      }
      employeeId = created.id;
    }
  }

  const { error: upErr } = await supabase
    .from("agent_updates")
    .update({
      employee_id: employeeId,
      review_status: "approved",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", updateId);

  if (upErr) {
    return { ok: false as const, error: upErr.message };
  }

  revalidatePath("/admin/ai-dashboard");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
