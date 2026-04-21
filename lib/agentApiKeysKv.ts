import { createHash } from "crypto";
import { kv } from "@vercel/kv";

export type AgentApiKeyRecord = {
  employee_id: string;
  /** Snapshot at key creation — used to validate agent_id without hitting Supabase. */
  employee_display_name: string;
  is_active: boolean;
};

export function apiKeyKvId(token: string): string {
  return `xalura:v1:ak:${createHash("sha256").update(token, "utf8").digest("hex")}`;
}

export async function getAgentApiKeyRecord(
  token: string,
): Promise<AgentApiKeyRecord | null> {
  const raw = await kv.get<string>(apiKeyKvId(token));
  if (!raw || typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as AgentApiKeyRecord;
  } catch {
    return null;
  }
}

export async function putAgentApiKeyRecord(
  token: string,
  rec: AgentApiKeyRecord,
): Promise<void> {
  await kv.set(apiKeyKvId(token), JSON.stringify(rec));
}

const empSecretKey = (employeeId: string) => `xalura:v1:emp:${employeeId}:secret`;

/**
 * One active xal_ key per employee: removes previous token mapping when rotating.
 */
export async function putAgentApiKeyForEmployee(
  employeeId: string,
  token: string,
  rec: AgentApiKeyRecord,
): Promise<void> {
  const oldToken = await kv.get<string>(empSecretKey(employeeId));
  if (oldToken && oldToken !== token) {
    await kv.del(apiKeyKvId(oldToken));
  }
  await kv.set(empSecretKey(employeeId), token);
  await putAgentApiKeyRecord(token, rec);
  await kv.set(`xalura:v1:emp:${employeeId}:has_api_key`, "1");
}

/**
 * agent_id must match employee UUID or display name (case-insensitive), same rules as before.
 */
export function resolveAgentIdForKvKey(
  rec: AgentApiKeyRecord,
  agentIdRaw: string,
): { ok: true; employeeId: string } | { ok: false; message: string } {
  const agentId = agentIdRaw.trim();
  if (!agentId) {
    return { ok: false, message: "agent_id is empty" };
  }
  if (rec.employee_id === agentId) {
    return { ok: true, employeeId: rec.employee_id };
  }
  const name = (rec.employee_display_name ?? "").trim();
  if (name && name.toLowerCase() === agentId.toLowerCase()) {
    return { ok: true, employeeId: rec.employee_id };
  }
  return {
    ok: false,
    message: `agent_id must be this employee's UUID (${rec.employee_id}) or display name "${name}" (case-insensitive). Received: "${agentId.slice(0, 80)}${agentId.length > 80 ? "…" : ""}"`,
  };
}
