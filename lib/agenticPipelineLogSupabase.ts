import { AGENTIC_RELEASE_ID } from "@/xalura-agentic/engine/version";
import { createServiceClient, readEnvSync } from "@/lib/supabase/service";

export type AgenticPipelineLogInput = {
  department: string;
  agentLaneId?: string | null;
  stage: string;
  event: string;
  summary: string;
  detail?: Record<string, unknown>;
};

function disabled(): boolean {
  return readEnvSync("AGENTIC_PIPELINE_LOG_DISABLE")?.toLowerCase() === "true";
}

/**
 * Fire-and-forget insert into `agentic_pipeline_stage_log` (Supabase).
 * No-op when `AGENTIC_PIPELINE_LOG_DISABLE=true` or service client unavailable.
 */
export function fireAgenticPipelineLog(input: AgenticPipelineLogInput): void {
  if (disabled()) return;
  const supabase = createServiceClient();
  if (!supabase) return;

  const row = {
    release_id: AGENTIC_RELEASE_ID,
    department: input.department.slice(0, 64),
    agent_lane_id: input.agentLaneId?.trim().slice(0, 200) || null,
    stage: input.stage.slice(0, 64),
    event: input.event.slice(0, 64),
    summary: input.summary.replace(/\s+/g, " ").trim().slice(0, 2_000),
    detail: input.detail ?? {},
  };

  void supabase
    .from("agentic_pipeline_stage_log")
    .insert(row)
    .then(({ error }) => {
      if (error) {
        console.warn("[agenticPipelineLogSupabase]", error.message);
      }
    });
}

/** Recent rows for Chief / admin snapshot (service role). */
export async function fetchRecentAgenticPipelineLogs(
  limit: number,
): Promise<
  { created_at: string; department: string; stage: string; event: string; summary: string }[]
> {
  if (disabled()) return [];
  const supabase = createServiceClient();
  if (!supabase) return [];
  const n = Math.min(Math.max(1, limit), 50);
  const { data, error } = await supabase
    .from("agentic_pipeline_stage_log")
    .select("created_at, department, stage, event, summary")
    .order("created_at", { ascending: false })
    .limit(n);
  if (error) {
    console.warn("[agenticPipelineLogSupabase] fetch", error.message);
    return [];
  }
  return (data ?? []) as {
    created_at: string;
    department: string;
    stage: string;
    event: string;
    summary: string;
  }[];
}

export function formatAgenticPipelineLogsForSnapshot(
  rows: Awaited<ReturnType<typeof fetchRecentAgenticPipelineLogs>>,
  maxLines: number,
): string {
  if (rows.length === 0) {
    return "(no Supabase pipeline stage rows yet — run the SQL in `supabase/schema.sql` and ensure SUPABASE_SERVICE_ROLE_KEY is set on the Worker.)";
  }
  return rows
    .slice(0, maxLines)
    .map((r) => {
      const t = r.created_at?.slice(0, 19)?.replace("T", " ") ?? "?";
      return `- [${t}] ${r.department} / ${r.stage} / ${r.event}: ${r.summary.slice(0, 220)}`;
    })
    .join("\n");
}
