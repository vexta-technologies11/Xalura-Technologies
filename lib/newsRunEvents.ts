import { createServiceClient } from "@/lib/supabase/service";

/**
 * Head of News: append a pipeline stage row to `news_run_events` (service role).
 */
export async function insertNewsRunEvent(
  runId: string,
  stage: string,
  summary: string,
  detail?: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceClient();
  if (!supabase) {
    return { ok: false, error: "Supabase service client unavailable" };
  }
  const { error } = await supabase.from("news_run_events").insert({
    run_id: runId,
    stage: stage.slice(0, 120),
    summary: summary.slice(0, 2000),
    detail: detail === undefined ? null : (detail as object),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type NewsRunEventRow = {
  id: string;
  run_id: string;
  stage: string;
  summary: string;
  created_at: string;
  detail: Record<string, unknown> | null;
};

/**
 * Newest-first rows for the News team admin feed (auth’d route uses user session; data via service client).
 */
export async function fetchNewsRunEventsForAdminFeed(limit: number): Promise<NewsRunEventRow[]> {
  const supabase = createServiceClient();
  if (!supabase) return [];
  const n = Math.min(Math.max(1, limit), 500);
  const { data, error } = await supabase
    .from("news_run_events")
    .select("id, run_id, stage, summary, created_at, detail")
    .order("created_at", { ascending: false })
    .limit(n);
  if (error) {
    console.warn("[newsRunEvents] fetch for admin", error.message);
    return [];
  }
  return (data ?? []) as NewsRunEventRow[];
}
