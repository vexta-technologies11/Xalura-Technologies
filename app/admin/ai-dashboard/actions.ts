"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { incrementWorkloadForApproval } from "@/lib/agentWorkloadKv";
import { isAgentKvConfigured } from "@/lib/agentKvConfig";
import {
  getAgentUpdate,
  listPendingIds,
  setAgentUpdateReview,
} from "@/lib/agentUpdatesStore";

/**
 * Approve a pending update (KV). Registers/creates employee in Supabase for the public site.
 */
export async function approveAgentUpdate(updateId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Unauthorized" };
  }

  if (!isAgentKvConfigured()) {
    return { ok: false as const, error: "Agent KV not configured on server" };
  }

  const row = await getAgentUpdate(updateId);
  if (!row || row.review_status !== "pending") {
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

  const upd = await setAgentUpdateReview(updateId, "approved", employeeId);
  if (!upd.ok) {
    return { ok: false as const, error: upd.error };
  }

  await incrementWorkloadForApproval(employeeId!, row.created_at);

  revalidatePath("/admin/ai-dashboard");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function declineAgentUpdate(updateId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Unauthorized" };
  }
  if (!isAgentKvConfigured()) {
    return { ok: false as const, error: "Agent KV not configured on server" };
  }
  const upd = await setAgentUpdateReview(updateId, "declined");
  if (!upd.ok) {
    return { ok: false as const, error: upd.error };
  }
  revalidatePath("/admin/ai-dashboard");
  return { ok: true as const };
}

export async function approveAllPendingAgentUpdates() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Unauthorized" };
  }
  if (!isAgentKvConfigured()) {
    return { ok: false as const, error: "Agent KV not configured on server" };
  }

  const ids = await listPendingIds();
  if (!ids.length) {
    return {
      ok: true as const,
      approved: 0,
      failed: 0,
      error_samples: [] as string[],
    };
  }

  let approved = 0;
  const errors: string[] = [];
  for (const id of ids) {
    const res = await approveAgentUpdate(id);
    if (res.ok) {
      approved += 1;
    } else {
      errors.push(`${id}: ${res.error}`);
    }
  }

  revalidatePath("/admin/ai-dashboard");
  revalidatePath("/dashboard");
  return {
    ok: true as const,
    approved,
    failed: ids.length - approved,
    error_samples: errors.slice(0, 5),
  };
}
