import { fireAgenticPipelineLog } from "@/lib/agenticPipelineLogSupabase";
import { insertNewsRunEvent } from "@/lib/newsRunEvents";
import {
  addFirecrawlExcerpts,
  gatherPreprodNewsPool,
  fetchAiNewsChecklist30,
} from "@/xalura-agentic/lib/news/serpGoogleNews";
import { resolveWorkerEnv } from "@/xalura-agentic/lib/resolveWorkerEnv";

function intEnv(name: string, def: number): number {
  return Math.max(1, Math.min(50, parseInt(process.env[name] || String(def), 10) || def));
}

/**
 * Serp Google News pool + 30-item checklist + optional Firecrawl (same building blocks as full news pipeline, no W/M/audit/publish).
 */
export async function runNewsPreprodSerpChecklist(): Promise<
  | { ok: true; runId: string; poolSize: number; checklistSize: number }
  | { ok: false; error: string; stage: "preprod_gather" | "preprod_checklist" }
> {
  const runId = `preprod-sweep-${Date.now()}`;
  const tz = (await resolveWorkerEnv("NEWS_SERP_TIMEZONE"))?.trim() || "UTC";
  const minPreprod = intEnv("NEWS_PREPROD_MIN", 20);
  const poolRes = await gatherPreprodNewsPool({ minCount: minPreprod, timeZone: tz });
  if (!poolRes.ok) {
    return { ok: false, error: poolRes.error, stage: "preprod_gather" };
  }
  const pool = await addFirecrawlExcerpts(poolRes.items, 8);
  const ch = await fetchAiNewsChecklist30();
  if (!ch.ok) {
    return { ok: false, error: ch.error, stage: "preprod_checklist" };
  }
  const summary = `Pre-Production sweep: pool ${pool.length}, checklist ${ch.items.length} (${tz}, min ${minPreprod})`;
  void insertNewsRunEvent(runId, "preprod_serp_checklist", summary, {
    pool: pool.length,
    checklist: ch.items.length,
    timeZone: tz,
  });
  void fireAgenticPipelineLog({
    department: "news",
    stage: "preprod_sweep",
    event: "serp_checklist",
    summary: `${runId}: ${summary}`.slice(0, 1_500),
    detail: { runId, pool: pool.length, checklist: ch.items.length },
  });
  return { ok: true, runId, poolSize: pool.length, checklistSize: ch.items.length };
}
