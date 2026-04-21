import type { SupabaseClient } from "@supabase/supabase-js";

type KeyRow = { employee_id: string };

/**
 * Per-agent `xal_` keys: `agent_id` may be the employee UUID **or** the employee's
 * display name (case-insensitive, trimmed) — matches GearMedic env like XALURA_KIMMY_ID=Kimmy.
 */
export async function resolveEmployeeForApiKey(
  service: SupabaseClient,
  keyRow: KeyRow,
  agentIdRaw: string,
): Promise<{ ok: true; employeeId: string } | { ok: false; message: string }> {
  const agentId = agentIdRaw.trim();
  if (!agentId) {
    return { ok: false, message: "agent_id is empty" };
  }

  if (keyRow.employee_id === agentId) {
    return { ok: true, employeeId: keyRow.employee_id };
  }

  const { data: emp, error } = await service
    .from("employees")
    .select("id, name")
    .eq("id", keyRow.employee_id)
    .maybeSingle();

  if (error || !emp) {
    return { ok: false, message: "Employee record missing for this API key" };
  }

  const name = (emp.name ?? "").trim();
  if (name && name.toLowerCase() === agentId.toLowerCase()) {
    return { ok: true, employeeId: keyRow.employee_id };
  }

  return {
    ok: false,
    message: `agent_id must be this employee's UUID (${keyRow.employee_id}) or display name "${name}" (case-insensitive). Received: "${agentId.slice(0, 80)}${agentId.length > 80 ? "…" : ""}"`,
  };
}
