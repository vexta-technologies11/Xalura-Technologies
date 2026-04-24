import { AGENTIC_ADMIN_DEFAULT_PUBLISH_TASK } from "@/lib/agenticDefaultPublishTask";
import { sitePublishFromApprovedPublishingRun } from "@/lib/agenticPublishingSite";
import { appendFailedOperation } from "./failedQueue";
import { runPublishingPipelineWithHandoff, runSeoPipelineWithHandoff } from "./handoff";
import type { SeoPipelineResult } from "../departments/seo";
import type { PublishingPipelineResult } from "../departments/publishing";
import type { WaitingResult } from "./handoff";
import type { DepartmentPipelineResult } from "./runDepartmentPipeline";
import { nextVerticalForHourlyTick } from "./incrementalCadenceStore";
import { isTopicBankMissingOrEmpty } from "./contentWorkflow/topicBankStore";

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

function summarizeSeoFailure(
  seo: Exclude<SeoPipelineResult, { status: "approved" }>,
  verticalId: string,
): string {
  if (seo.status === "blocked") return `SEO blocked: ${seo.reason}`;
  if (seo.status === "rejected") return `SEO rejected: ${seo.reason}`;
  if (seo.status === "error") return `SEO error (${seo.stage}): ${seo.message}`;
  if (seo.status === "discarded") return "SEO discarded after escalation";
  if (seo.status === "rejected_after_escalation") {
    return `SEO rejected after escalation: ${seo.reason}`;
  }
  return `SEO ended: ${(seo as { status: string }).status} (vertical ${verticalId})`;
}

function summarizePublishingFailure(
  pub: Exclude<PublishingPipelineResult, { status: "approved" }> | WaitingResult,
  verticalId: string,
): string {
  if (pub.status === "waiting") {
    return `Publishing waiting: ${pub.reason}`;
  }
  if (pub.status === "rejected") return `Publishing rejected: ${pub.reason}`;
  if (pub.status === "error") return `Publishing error (${pub.stage}): ${pub.message}`;
  if (pub.status === "blocked") return `Publishing blocked: ${pub.reason}`;
  if (pub.status === "discarded") return "Publishing discarded after escalation";
  if (pub.status === "rejected_after_escalation") {
    return `Publishing rejected after escalation: ${pub.reason}`;
  }
  return `Publishing ended: ${(pub as { status: string }).status} (vertical ${verticalId})`;
}

export type IncrementalHourlyOptions = {
  /**
   * Upsert the article even when `AGENTIC_INCREMENTAL_AUTO_SITE_PUBLISH` /
   * `AGENTIC_AUTO_PUBLISH_TO_SITE` would otherwise skip site publish.
   */
  forceSitePublish?: boolean;
  /**
   * Wait for compliance / founder Resend pipeline to finish (avoids dropped work on some hosts).
   * Slower HTTP response.
   */
  awaitFounderOversight?: boolean;
  /**
   * When true with a missing/empty topic bank file, pass `forceTopicBankRefresh` into SEO so a Serp crawl
   * is not blocked by the 2h cooldown (no override when the bank already has topics).
   */
  forceTopicBankIfMissing?: boolean;
};

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
  options?: IncrementalHourlyOptions,
): Promise<IncrementalHourlyResult> {
  const { vertical_id, vertical_label, tick } = nextVerticalForHourlyTick(cwd);

  const forceTopicBankRefresh =
    options?.forceTopicBankIfMissing === true && isTopicBankMissingOrEmpty(cwd);

  const seo = await runSeoPipelineWithHandoff(
    {
      cwd,
      task: incrementalSeoTask(),
      useTopicBank: true,
      contentVerticalId: vertical_id,
      allowStubFallback: false,
      forceTopicBankRefresh,
      skipChiefEnrich: true,
    },
    cwd,
  );

  if (seo.status !== "approved") {
    appendFailedOperation(
      {
        kind: "pipeline",
        message: `Incremental hourly: ${summarizeSeoFailure(seo, vertical_id)}`,
        detail: `vertical_id=${vertical_id} vertical_label=${vertical_label} cadence_tick=${tick}. Topic bank: POST /api/agentic/content/refresh-topic-bank or wait for crawl rules. Chief digest email is audit-only — set AGENTIC_OPS_ALERT_EMAIL for pipeline failures.`,
      },
      cwd,
    );
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
    appendFailedOperation(
      {
        kind: "pipeline",
        message: `Incremental hourly: ${summarizePublishingFailure(pub, vertical_id)}`,
        detail: `vertical_id=${vertical_id} cadence_tick=${tick}`,
      },
      cwd,
    );
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
    appendFailedOperation(
      {
        kind: "pipeline",
        message: `Incremental hourly: ${summarizePublishingFailure(pub, vertical_id)}`,
        detail: `vertical_id=${vertical_id} cadence_tick=${tick}`,
      },
      cwd,
    );
    return {
      ok: false,
      vertical_id,
      vertical_label,
      cadence_tick: tick,
      stage: "publishing",
      detail: pub,
    };
  }

  const shouldPublish = autoSitePublish() || options?.forceSitePublish === true;
  if (!shouldPublish) {
    return {
      ok: true,
      vertical_id,
      vertical_label,
      cadence_tick: tick,
      seo,
      publishing: pub,
    };
  }

  const site = await sitePublishFromApprovedPublishingRun(
    {
      cwd,
      task: incrementalPublishTask(),
      keyword: seo.contentWorkflow?.keyword,
      contentSubcategory: seo.contentWorkflow?.subcategory,
      articleTitle: null,
      result: pub,
    },
    { awaitFounderOversight: options?.awaitFounderOversight === true },
  );

  if (!site.ok) {
    appendFailedOperation(
      {
        kind: "pipeline",
        message: `Incremental hourly: site publish failed: ${site.error}`,
        detail: `vertical_id=${vertical_id} cadence_tick=${tick}`,
      },
      cwd,
    );
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
