import { NextResponse } from "next/server";
import { fireAgenticPipelineLog } from "@/lib/agenticPipelineLogSupabase";
import {
  ARTICLE_SUBCATEGORY_AGENT_LANE_ID_LIST,
  articleSubcategoryTitleForAgentLaneId,
} from "@/lib/articleSubcategoryAgentLanes";
import { createClient } from "@/lib/supabase/server";
import { isAgenticDiskWritable } from "@/xalura-agentic/lib/agenticDisk";
import { getIncrementalSeoTask } from "@/xalura-agentic/lib/incrementalContentCron";
import { shouldForceTopicBankForVertical } from "@/xalura-agentic/lib/contentWorkflow/topicBank";
import { refreshTopicBankForTenPillars } from "@/xalura-agentic/lib/contentWorkflow/pillarTopicBankRefresh";
import { runSeoPipeline } from "@/xalura-agentic/departments/seo";

export const dynamic = "force-dynamic";
/**
 * Pillar bank refresh: 10× (Serp + Firecrawl + Gemini) + 10× full SEO pipelines — allow a long window.
 * If your host caps lower, run from a local script or increase the platform limit.
 */
export const maxDuration = 800;

type LaneResult =
  | {
      vertical_id: string;
      vertical_label: string;
      status: "approved";
      primary_keyword: string;
      topic_id: string;
      supporting_keywords: string[];
    }
  | {
      vertical_id: string;
      vertical_label: string;
      status: "blocked" | "rejected" | "error" | "discarded" | "rejected_after_escalation" | "other";
      detail: string;
    };

/**
 * Logged-in admin. **First** refills the topic bank: Serp + Firecrawl + Gemini for **each** of the 10
 * public pillars (`sc-…`), replacing bank rows with fresh topics (aligned `vertical_id` + subcategory).
 * **Then** runs one SEO pipeline per pillar so the Worker → Manager handoff uses those new topics.
 * Writes an extra `admin_sweep` / `keywords_for_publishing` row to `agentic_pipeline_stage_log` with
 * primary + supporting keywords for handoff to Publishing (no publishing step here).
 */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cwd = process.cwd();
  const pillar = await refreshTopicBankForTenPillars(cwd, {
    skipAudit: true,
    forceSerp: true,
  });
  if (!pillar.ok) {
    return NextResponse.json(
      {
        ok: false,
        step: "pillar_topic_bank_refresh",
        error: pillar.error,
        agentic_disk_writable: isAgenticDiskWritable(),
      },
      { status: 502 },
    );
  }

  const task = getIncrementalSeoTask();
  const results: LaneResult[] = [];

  for (const verticalId of ARTICLE_SUBCATEGORY_AGENT_LANE_ID_LIST) {
    const vertical_label =
      articleSubcategoryTitleForAgentLaneId(verticalId) ?? verticalId;
    const forceTopicBankRefresh = await shouldForceTopicBankForVertical(
      cwd,
      verticalId,
    );

    const r = await runSeoPipeline({
      cwd,
      task,
      useTopicBank: true,
      contentVerticalId: verticalId,
      allowStubFallback: false,
      forceTopicBankRefresh,
      skipChiefEnrich: true,
    });

    if (r.status === "approved" && r.contentWorkflow) {
      const cw = r.contentWorkflow;
      const primary = cw.keyword?.trim() ?? "";
      const supporting = cw.supporting_keywords ?? [];
      const topicId = cw.topic_id?.trim() ?? "";
      results.push({
        vertical_id: verticalId,
        vertical_label,
        status: "approved",
        primary_keyword: primary,
        topic_id: topicId,
        supporting_keywords: supporting,
      });
      const summary = [
        `${vertical_label} (${verticalId})`,
        `primary: ${primary || "?"}`,
        topicId ? `topic_id: ${topicId}` : null,
        supporting.length ? `supporting: ${supporting.slice(0, 8).join(", ")}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      fireAgenticPipelineLog({
        department: "seo",
        agentLaneId: verticalId,
        stage: "admin_sweep",
        event: "keywords_for_publishing",
        summary: summary.slice(0, 1_800),
        detail: {
          vertical_id: verticalId,
          vertical_label,
          primary_keyword: primary,
          topic_id: topicId || null,
          supporting_keywords: supporting,
        },
      });
    } else if (r.status === "blocked") {
      results.push({
        vertical_id: verticalId,
        vertical_label,
        status: "blocked",
        detail: r.reason,
      });
    } else if (r.status === "rejected") {
      results.push({
        vertical_id: verticalId,
        vertical_label,
        status: "rejected",
        detail: r.reason,
      });
    } else if (r.status === "error") {
      results.push({
        vertical_id: verticalId,
        vertical_label,
        status: "error",
        detail: `${r.stage}: ${r.message}`.slice(0, 1_200),
      });
    } else if (r.status === "discarded" || r.status === "rejected_after_escalation") {
      results.push({
        vertical_id: verticalId,
        vertical_label,
        status: r.status,
        detail: (r as { reason?: string }).reason ?? r.status,
      });
    } else {
      results.push({
        vertical_id: verticalId,
        vertical_label,
        status: "other",
        detail: JSON.stringify(r).slice(0, 1_200),
      });
    }
  }

  const okCount = results.filter((x) => x.status === "approved").length;
  return NextResponse.json({
    ok: true,
    pillar_topic_bank: {
      ok: true,
      topicCount: pillar.topicCount,
      skippedSerp: pillar.skippedSerp === true,
    },
    agentic_disk_writable: isAgenticDiskWritable(),
    task_preview: task.slice(0, 200),
    lanes: ARTICLE_SUBCATEGORY_AGENT_LANE_ID_LIST.length,
    approved: okCount,
    results,
  });
}
