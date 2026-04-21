import { kv } from "@vercel/kv";
import { isAgentKvConfigured } from "@/lib/agentKvConfig";
import type { AgentUpdateRow } from "@/types/agent-dashboard";

const NS = "xalura:v1";
const KEY_TIMELINE = `${NS}:upd:timeline`;
const KEY_APPROVED = `${NS}:upd:approved`;
const KEY_BOOTSTRAP = `${NS}:bootstrap:done`;
const KEY_TRAFFIC = `${NS}:traffic:log`;

export type StoredAgentUpdate = AgentUpdateRow & {
  ingest_mode?: string;
};

function rowKey(id: string) {
  return `${NS}:upd:${id}`;
}

export async function createAgentUpdate(input: {
  employee_id: string | null;
  agent_external_id: string;
  activity_text: string;
  activity_type: string;
  review_status: "pending";
  ingest_mode?: string;
}): Promise<{ id: string } | { error: string }> {
  if (!isAgentKvConfigured()) {
    return { error: "KV_NOT_CONFIGURED" };
  }
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  const row: StoredAgentUpdate = {
    id,
    employee_id: input.employee_id,
    agent_external_id: input.agent_external_id,
    activity_text: input.activity_text,
    activity_type: input.activity_type,
    review_status: "pending",
    reviewed_at: null,
    created_at,
    ingest_mode: input.ingest_mode,
  };
  await kv.set(rowKey(id), JSON.stringify(row));
  await kv.zadd(KEY_TIMELINE, { score: Date.now(), member: id });
  await logTrafficEvent({ action: "ingest", updateId: id });
  return { id };
}

export async function getAgentUpdate(id: string): Promise<StoredAgentUpdate | null> {
  if (!isAgentKvConfigured()) return null;
  const raw = await kv.get<string>(rowKey(id));
  if (!raw || typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as StoredAgentUpdate;
  } catch {
    return null;
  }
}

export async function listAgentUpdatesRecent(limit: number): Promise<StoredAgentUpdate[]> {
  if (!isAgentKvConfigured()) return [];
  const ids = await kv.zrange(KEY_TIMELINE, 0, limit - 1, { rev: true });
  if (!ids?.length) return [];
  const rows: StoredAgentUpdate[] = [];
  for (const id of ids) {
    const r = await getAgentUpdate(id as string);
    if (r) rows.push(r);
  }
  return rows;
}

export async function listPendingIds(): Promise<string[]> {
  if (!isAgentKvConfigured()) return [];
  const recent = await listAgentUpdatesRecent(500);
  return recent.filter((u) => u.review_status === "pending").map((u) => u.id);
}

export async function setAgentUpdateReview(
  id: string,
  status: "approved" | "declined",
  employeeId?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isAgentKvConfigured()) {
    return { ok: false, error: "KV not configured" };
  }
  const row = await getAgentUpdate(id);
  if (!row || row.review_status !== "pending") {
    return { ok: false, error: "Update not found or not pending" };
  }
  const reviewed_at = new Date().toISOString();
  const next: StoredAgentUpdate = {
    ...row,
    employee_id:
      status === "approved"
        ? (employeeId ?? row.employee_id)
        : row.employee_id,
    review_status: status,
    reviewed_at,
  };
  await kv.set(rowKey(id), JSON.stringify(next));
  await kv.set(KEY_BOOTSTRAP, "1");
  if (status === "approved") {
    await kv.zadd(KEY_APPROVED, { score: Date.now(), member: id });
  }
  await logTrafficEvent({
    action: status === "approved" ? "approved" : "declined",
    updateId: id,
  });
  return { ok: true };
}

/** After any approve/decline, shared ingest requires credentials (unless env overrides). */
export async function isIngestBootstrapCompleteKv(): Promise<boolean> {
  if (!isAgentKvConfigured()) return false;
  const v = await kv.get<string>(KEY_BOOTSTRAP);
  return v === "1";
}

export async function listApprovedAgentUpdatesKv(
  limit: number,
): Promise<StoredAgentUpdate[]> {
  if (!isAgentKvConfigured()) return [];
  const ids = await kv.zrange(KEY_APPROVED, 0, limit - 1, { rev: true });
  if (!ids?.length) return [];
  const rows: StoredAgentUpdate[] = [];
  for (const id of ids) {
    const r = await getAgentUpdate(id as string);
    if (r && r.review_status === "approved") rows.push(r);
  }
  return rows;
}

export type TrafficEvent = {
  t: number;
  action: "ingest" | "approved" | "declined";
  updateId: string;
};

async function logTrafficEvent(e: {
  action: TrafficEvent["action"];
  updateId: string;
}): Promise<void> {
  const ev: TrafficEvent = { t: Date.now(), ...e };
  await kv.lpush(KEY_TRAFFIC, JSON.stringify(ev));
  await kv.ltrim(KEY_TRAFFIC, 0, 199);
}

export async function getTrafficLog(limit = 50): Promise<TrafficEvent[]> {
  if (!isAgentKvConfigured()) return [];
  const raw = await kv.lrange(KEY_TRAFFIC, 0, limit - 1);
  const out: TrafficEvent[] = [];
  for (const line of raw ?? []) {
    try {
      out.push(JSON.parse(line as string) as TrafficEvent);
    } catch {
      /* skip */
    }
  }
  return out;
}
