import { NextResponse } from "next/server";
import { fetchAgenticPipelineLogsForAdminFeedByDepartment } from "@/lib/agenticPipelineLogSupabase";
import { fetchNewsRunEventsForAdminFeed, type NewsRunEventRow } from "@/lib/newsRunEvents";
import { createClient } from "@/lib/supabase/server";
import type { AgenticPipelineLogRow } from "@/lib/agenticPipelineLogSupabase";
import { AGENTIC_RELEASE_ID } from "@/xalura-agentic/engine/version";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 400;

function runEventToPipelineRow(r: NewsRunEventRow, releaseId: string): AgenticPipelineLogRow {
  return {
    id: r.id,
    created_at: r.created_at,
    release_id: releaseId,
    department: "news",
    agent_lane_id: r.run_id,
    stage: r.stage,
    event: "news_run_event",
    summary: r.summary,
    detail: (r.detail ?? {}) as Record<string, unknown>,
  };
}

/**
 * Merged: `agentic_pipeline_stage_log` (department=news) + `news_run_events`, newest first.
 */
export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = new URL(req.url).searchParams.get("limit");
  const n = Math.min(
    500,
    Math.max(1, raw ? parseInt(raw, 10) || DEFAULT_LIMIT : DEFAULT_LIMIT),
  );
  const half = Math.min(500, Math.max(n, Math.ceil(n * 1.2)));

  const [pipe, runs] = await Promise.all([
    fetchAgenticPipelineLogsForAdminFeedByDepartment("news", half),
    fetchNewsRunEventsForAdminFeed(half),
  ]);
  const mapped = runs.map((e) => runEventToPipelineRow(e, AGENTIC_RELEASE_ID));
  const byId = new Map<string, AgenticPipelineLogRow>();
  for (const r of pipe) {
    byId.set(`p:${r.id}`, r);
  }
  for (const r of mapped) {
    byId.set(`m:${r.id}`, r);
  }
  const merged = Array.from(byId.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  return NextResponse.json({ ok: true, count: merged.length, rows: merged.slice(0, n) });
}
