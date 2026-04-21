import { kv } from "@vercel/kv";
import { isAgentKvConfigured } from "@/lib/agentKvConfig";
import type { AgentWorkloadDayRow } from "@/types/agent-dashboard";

/** UTC date string YYYY-MM-DD from ISO timestamp. */
function dayUtc(iso: string): string {
  return iso.slice(0, 10);
}

export async function incrementWorkloadForApproval(
  employeeId: string,
  createdAtIso: string,
): Promise<void> {
  if (!isAgentKvConfigured()) return;
  const d = dayUtc(createdAtIso);
  const key = `xalura:v1:wl:day:${d}`;
  await kv.hincrby(key, employeeId, 1);
}

export async function getWorkloadDailySinceKv(
  sinceIsoDate: string,
): Promise<AgentWorkloadDayRow[]> {
  if (!isAgentKvConfigured()) return [];
  const out: AgentWorkloadDayRow[] = [];
  const end = new Date();
  const start = new Date(sinceIsoDate + "T00:00:00.000Z");
  const cur = new Date(start);
  while (cur <= end) {
    const ds = cur.toISOString().slice(0, 10);
    const key = `xalura:v1:wl:day:${ds}`;
    const hash = await kv.hgetall<Record<string, string>>(key);
    if (hash) {
      for (const [employee_id, count] of Object.entries(hash)) {
        out.push({
          employee_id,
          day: ds,
          update_count: Number(count) || 0,
        });
      }
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out.sort((a, b) => a.day.localeCompare(b.day));
}
