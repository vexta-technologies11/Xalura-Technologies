import { createServiceClient } from "@/lib/supabase/service";
import { formatZernioTimeAmericaChicago } from "@/lib/marketingZernioChiefContext";
import { resolveWorkerEnv } from "@/xalura-agentic/lib/resolveWorkerEnv";

const DEFAULT_HOURS = 3;

/**
 * Public docs + Chief — must match `triggers.crons` + `cloudflare/custom-worker` mapping for the news run.
 * Override only if you change the Worker cron to a different interval.
 */
export function resolveNewsCronIntervalHours(): Promise<number> {
  return (async () => {
    const raw = (await resolveWorkerEnv("NEWS_CRON_INTERVAL_HOURS"))?.trim();
    if (!raw) return DEFAULT_HOURS;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1) return DEFAULT_HOURS;
    return Math.min(24, n);
  })();
}

/**
 * For Chief ops snapshot: scheduled News pipeline (single POST = full end-to-end run, same as manual admin "Publish").
 * Cron is **UTC** (Cloudflare). Last run from `news_run_events` where `stage` = `start` when available.
 */
export async function getNewsPipelineScheduleForChief(): Promise<string> {
  const intervalH = await resolveNewsCronIntervalHours();
  const supabase = createServiceClient();
  let lastStartIso: string | null = null;
  if (supabase) {
    const { data, error } = await supabase
      .from("news_run_events")
      .select("created_at")
      .eq("stage", "start")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error && data?.created_at) {
      const s = String(data.created_at);
      if (s) lastStartIso = s;
    }
  }

  const lastLine = lastStartIso
    ? `  last_pipeline_start_utc: ${lastStartIso}  (${formatZernioTimeAmericaChicago(new Date(lastStartIso))})`
    : "  last_pipeline_start: (no `start` row in `news_run_events` yet)";

  return [
    `Head of News: same full pipeline as admin (one \`POST /api/cron/news-run\` per **${intervalH}h** tick — see “Cloudflare Worker crons” block above for UTC schedule).`,
    lastLine,
  ].join("\n");
}
