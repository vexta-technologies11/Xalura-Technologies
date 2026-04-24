import { AGENTIC_ADMIN_DEFAULT_PUBLISH_TASK } from "@/lib/agenticDefaultPublishTask";
import { sitePublishFromApprovedPublishingRun } from "@/lib/agenticPublishingSite";
import { runPublishingPipelineWithHandoff, runSeoPipelineWithHandoff } from "./handoff";
import type { SeoPipelineResult } from "../departments/seo";
import type { PublishingPipelineResult } from "../departments/publishing";
import type { WaitingResult } from "./handoff";
import type { DepartmentPipelineResult } from "./runDepartmentPipeline";
import { nextVerticalForHourlyTick } from "./incrementalCadenceStore";

const DEFAULT_SEO_TASK =
  "In 2–3 short paragraphs, justify why this bank keyword matters for Xalura Tech readers (technical founders). Be concrete; no fluff.";

function incrementalSeoTask(): string {
  const t = process.env["AGENTIC_INCREMENTAL_SEO_TASK"]?.trim();
  return t || DEFAULT_SEO_TASK;
}

function incrementalPublishTask(): string {
  const t = process.env["AGENTIC_INCREMENTAL_PUBLISH_TASK"]?.trim();
  return t || AGENTIC_ADMIN_DEFAULT_PUBLISH_TASK;
}

function autoSitePublish(): boolean {
  const a = process.env["AGENTIC_INCREMENTAL_AUTO_SITE_PUBLISH"]?.trim().toLowerCase();
  if (a === "false" || a === "0") return false;
  if (a === "true" || a === "1") return true;
  return process.env["AGENTIC_AUTO_PUBLISH_TO_SITE"]?.trim().toLowerCase() === "true";
}

export type IncrementalHourlyResult =
  | {
      ok: true;
      vertical_id: string;
      vertical_label: string;
      cadence_tick: number;
      seo: Extract<SeoPipelineResult, { status: "approved" }>;
      publishing: Extract<PublishingPipelineResult, { status: "approved" }>;
      site?: { ok: true; slug: string; path: string } | { ok: false; error: string };
    }
  | {
      ok: false;
      vertical_id: string;
      vertical_label: string;
      cadence_tick: number;
      stage: "seo" | "publishing" | "site";
      detail: DepartmentPipelineResult | WaitingResult | string;
    };

/**
 * One hourly tick: round-robin vertical → SEO (topic bank, that lane) with handoff →
 * Publishing (handoff) → optional site upsert. Does **not** force Serp; min interval governs refills.
 */
export async function runIncrementalHourlyPublish(
  cwd: string = process.cwd(),
): Promise<IncrementalHourlyResult> {
  const { vertical_id, vertical_label, tick } = nextVerticalForHourlyTick(cwd);

  const seo = await runSeoPipelineWithHandoff(
    {
      cwd,
      task: incrementalSeoTask(),
      useTopicBank: true,
      contentVerticalId: vertical_id,
      allowStubFallback: false,
      forceTopicBankRefresh: false,
      skipChiefEnrich: true,
    },
    cwd,
  );

  if (seo.status !== "approved") {
    return {
      ok: false,
      vertical_id,
      vertical_label,
      cadence_tick: tick,
      stage: "seo",
      detail: seo,
    };
  }

  const pub = await runPublishingPipelineWithHandoff(
    {
      cwd,
      task: incrementalPublishTask(),
      skipChiefEnrich: true,
    },
    cwd,
  );

  if (pub.status === "waiting") {
    return {
      ok: false,
      vertical_id,
      vertical_label,
      cadence_tick: tick,
      stage: "publishing",
      detail: pub,
    };
  }

  if (pub.status !== "approved") {
    return {
      ok: false,
      vertical_id,
      vertical_label,
      cadence_tick: tick,
      stage: "publishing",
      detail: pub,
    };
  }

  if (!autoSitePublish()) {
    return {
      ok: true,
      vertical_id,
      vertical_label,
      cadence_tick: tick,
      seo,
      publishing: pub,
    };
  }

  const site = await sitePublishFromApprovedPublishingRun({
    cwd,
    task: incrementalPublishTask(),
    keyword: seo.contentWorkflow?.keyword,
    contentSubcategory: seo.contentWorkflow?.subcategory,
    articleTitle: null,
    result: pub,
  });

  if (!site.ok) {
    return {
      ok: false,
      vertical_id,
      vertical_label,
      cadence_tick: tick,
      stage: "site",
      detail: site.error,
    };
  }

  return {
    ok: true,
    vertical_id,
    vertical_label,
    cadence_tick: tick,
    seo,
    publishing: pub,
    site: { ok: true, slug: site.data.slug, path: site.data.path },
  };
}
