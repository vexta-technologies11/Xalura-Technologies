import { fetchAgenticPipelineLogsForAdminFeedByDepartment } from "@/lib/agenticPipelineLogSupabase";
import { formatNewsRunEventForEmailSnapshot } from "@/lib/newsRunEventDisplay";
import { fetchNewsRunEventsForAdminFeed } from "@/lib/newsRunEvents";
import { AGENTIC_RELEASE_ID } from "@/xalura-agentic/engine/version";

function humanizeNewsStage(stage: string): string {
  switch (stage) {
    case "preprod_worker":
      return "Pre-Production";
    case "preprod_manager":
      return "Selection";
    case "news_writer":
      return "News Desk";
    case "writer_manager":
      return "Editorial Review";
    case "chief_of_audit":
      return "Chief of Audit";
    case "head_of_news":
      return "Head of News";
    case "photographer":
      return "Photographer";
    default:
      return stage.replace(/_/g, " ");
  }
}

/**
 * Text block for News team inbound email (Head of News / Chief of Audit) — Supabase + run timeline.
 */
export async function buildNewsTeamEmailSnapshot(): Promise<string> {
  const [pipe, runs] = await Promise.all([
    fetchAgenticPipelineLogsForAdminFeedByDepartment("news", 30),
    fetchNewsRunEventsForAdminFeed(24),
  ]);
  const supaBlock =
    pipe.length === 0
      ? "(no `news` pipeline log rows yet.)"
      : pipe
          .map((r) => {
            const t = r.created_at?.slice(0, 19)?.replace("T", " ") ?? "?";
            return `- [${t}] ${r.department} / ${humanizeNewsStage(r.stage)} / ${r.event}: ${r.summary.slice(0, 220)}`;
          })
          .join("\n");
  const runLines =
    runs.length === 0
      ? "(none)"
      : runs.map((e) => formatNewsRunEventForEmailSnapshot(e)).join("\n\n");
  return [
    `release_id: ${AGENTIC_RELEASE_ID}`,
    "Recent `agentic_pipeline_stage_log` (department=news) — all worker/manager/executive/chief_of_audit pipeline stages:",
    supaBlock,
    "",
    "Recent `news_run_events` (Head of News run timeline):",
    runLines,
  ].join("\n");
}
