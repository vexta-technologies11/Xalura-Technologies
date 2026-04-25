import { AGENTIC_ADMIN_DEFAULT_PUBLISH_TASK } from "@/lib/agenticDefaultPublishTask";
import { sitePublishFromApprovedPublishingRun } from "@/lib/agenticPublishingSite";
import { appendFailedOperation } from "./failedQueue";
import {
  buildKeywordReadyPayloadFromApprovedSeo,
  runPublishingPipelineWithHandoff,
  runSeoPipelineWithHandoff,
} from "./handoff";
import type { SeoPipelineResult } from "../departments/seo";
import type { PublishingPipelineResult } from "../departments/publishing";
import type { WaitingResult } from "./handoff";
import type { DepartmentPipelineResult } from "./runDepartmentPipeline";
import { nextVerticalForHourlyTick } from "./incrementalCadenceStore";
import { readTopicBank } from "./contentWorkflow/topicBankStore";
import {
  getNextBatchTopics,
  incrementalBatchSizeFromEnv,
  markTopicUsed,
  minTopicScoreFromEnv,
  revertTopicsToUnused,
  shouldForceTopicBankForVertical,
} from "./contentWorkflow/topicBank";
import {
  humanIncrementalPublishingFailureMessage,
  humanIncrementalSeoFailureMessage,
  humanIncrementalSiteFailureMessage,
} from "./pipelineFailureHumanize";

const DEFAULT_SEO_TASK =
  "In 2–3 short paragraphs, justify why this bank keyword matters for Xalura Tech readers in **this vertical**. Every sentence must tie to the keyword; no fluff or generic audience essays. Explain **high real-world value** and why this is a **strong, safe** AI/tech topic (informational, product-focused — not medical, legal, or personal financial advice).";

/** Same default task as hourly incremental SEO (env `AGENTIC_INCREMENTAL_SEO_TASK` overrides). */
export function getIncrementalSeoTask(): string {
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
  forceSitePublish?: boolean;
  awaitFounderOversight?: boolean;
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

type Cadence = { vertical_id: string; vertical_label: string; tick: number };

/**
 * N parallel topic lanes: reserve batch → isolated `keywordReady` per topic → optional site;
 * reverts `seo_in_progress` on lane failure. Returns the first successful lane (same type shape).
 */
async function runIncrementalBatch(
  cwd: string,
  options: IncrementalHourlyOptions | undefined,
  tickMeta: Cadence,
): Promise<IncrementalHourlyResult> {
  const { vertical_id, vertical_label, tick } = tickMeta;
  const limit = incrementalBatchSizeFromEnv();
  const forceTopicBankRefresh =
    options?.forceTopicBankIfMissing === true &&
    (await shouldForceTopicBankForVertical(cwd, vertical_id));

  if (forceTopicBankRefresh) {
    const { refreshTopicBank } = await import("./contentWorkflow/topicBankRefresh");
    await refreshTopicBank(cwd, { forceSerp: true });
  }

  const batch = await getNextBatchTopics(cwd, {
    limit,
    minScore: minTopicScoreFromEnv(),
    diverseVerticals: true,
  });

  if (!batch.ok) {
    appendFailedOperation(
      { kind: "pipeline", message: `Batch: ${batch.reason}`, detail: `tick=${tick} limit=${limit}` },
      cwd,
    );
    return {
      ok: false,
      vertical_id,
      vertical_label,
      cadence_tick: tick,
      stage: "seo",
      detail: batch.reason,
    };
  }

  type LaneOk = {
    ok: true;
    seo: Extract<SeoPipelineResult, { status: "approved" }>;
    pub: Extract<PublishingPipelineResult, { status: "approved" }>;
    site?: { ok: true; slug: string; path: string };
  };
  type LaneOut = LaneOk | { ok: false; reason: string };

  const settled = await Promise.allSettled(
    batch.topics.map(async (topic): Promise<LaneOut> => {
      const seo = await runSeoPipelineWithHandoff(
        {
          cwd,
          task: getIncrementalSeoTask(),
          useTopicBank: true,
          topicSnapshot: topic,
          contentVerticalId: topic.vertical_id,
          allowStubFallback: false,
          forceTopicBankRefresh: false,
          skipChiefEnrich: true,
        },
        cwd,
      );
      if (seo.status !== "approved") {
        await revertTopicsToUnused(cwd, [topic.id]);
        return {
          ok: false,
          reason:
            seo.status === "blocked" ? seo.reason : `SEO: ${JSON.stringify(seo).slice(0, 500)}`,
        };
      }
      const keywordReady = buildKeywordReadyPayloadFromApprovedSeo(seo, topic.keyword);
      const pub = await runPublishingPipelineWithHandoff(
        { cwd, task: incrementalPublishTask(), skipChiefEnrich: true, keywordReady },
        cwd,
      );
      if (pub.status === "waiting" || pub.status !== "approved") {
        await revertTopicsToUnused(cwd, [topic.id]);
        return {
          ok: false,
          reason: pub.status === "waiting" ? pub.reason : "Publishing did not approve",
        };
      }
      const shouldPub = autoSitePublish() || options?.forceSitePublish === true;
      let site: { ok: true; slug: string; path: string } | undefined;
      if (shouldPub) {
        const siteR = await sitePublishFromApprovedPublishingRun(
          {
            cwd,
            task: incrementalPublishTask(),
            keyword: pub.contentWorkflow?.keyword ?? seo.contentWorkflow?.keyword,
            contentSubcategory:
              pub.contentWorkflow?.subcategory ?? seo.contentWorkflow?.subcategory,
            articleTitle: null,
            result: pub,
          },
          { awaitFounderOversight: options?.awaitFounderOversight === true },
        );
        if (!siteR.ok) {
          await revertTopicsToUnused(cwd, [topic.id]);
          return { ok: false, reason: siteR.error };
        }
        site = { ok: true, slug: siteR.data.slug, path: siteR.data.path };
      }
      const bank = await readTopicBank(cwd);
      if (bank) {
        await markTopicUsed(cwd, bank, topic);
      }
      return { ok: true, seo, pub, site };
    }),
  );

  const oks: LaneOk[] = [];
  const bad: string[] = [];
  for (const s of settled) {
    if (s.status === "rejected") {
      bad.push(String(s.reason));
      continue;
    }
    if (!s.value.ok) {
      bad.push(s.value.reason);
    } else {
      oks.push(s.value);
    }
  }

  if (oks.length === 0) {
    return {
      ok: false,
      vertical_id,
      vertical_label,
      cadence_tick: tick,
      stage: "seo",
      detail: bad.join(" | ") || "All batch lanes failed",
    };
  }

  const first = oks[0]!;
  return {
    ok: true,
    vertical_id,
    vertical_label,
    cadence_tick: tick,
    seo: first.seo,
    publishing: first.pub,
    ...(first.site ? { site: first.site } : {}),
  };
}

async function runIncrementalSingleTopic(
  cwd: string,
  options: IncrementalHourlyOptions | undefined,
  tickMeta: Cadence,
): Promise<IncrementalHourlyResult> {
  const { vertical_id, vertical_label, tick } = tickMeta;

  const forceTopicBankRefresh =
    options?.forceTopicBankIfMissing === true &&
    (await shouldForceTopicBankForVertical(cwd, vertical_id));

    const seo = await runSeoPipelineWithHandoff(
    {
      cwd,
      task: getIncrementalSeoTask(),
      useTopicBank: true,
      contentVerticalId: vertical_id,
      allowStubFallback: false,
      forceTopicBankRefresh,
      skipChiefEnrich: true,
    },
    cwd,
  );

  if (seo.status !== "approved") {
    const s = seo as Exclude<SeoPipelineResult, { status: "approved" }>;
    appendFailedOperation(
      {
        kind: "pipeline",
        message: humanIncrementalSeoFailureMessage(
          {
            status: s.status,
            reason: "reason" in s ? s.reason : undefined,
            stage: "stage" in s ? s.stage : undefined,
            message: "message" in s ? s.message : undefined,
          },
          vertical_label,
        ),
        detail: [
          summarizeSeoFailure(s, vertical_id),
          JSON.stringify(s).slice(0, 2000),
          `vertical_id=${vertical_id} vertical_label=${vertical_label} cadence_tick=${tick}`,
          "Topic bank: POST /api/agentic/content/refresh-topic-bank or wait for crawl rules.",
          "Chief digest email is audit-only — set AGENTIC_OPS_ALERT_EMAIL for pipeline failures.",
        ].join("\n"),
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

  const keywordReady = buildKeywordReadyPayloadFromApprovedSeo(
    seo,
    seo.contentWorkflow?.keyword,
  );
  const pub = await runPublishingPipelineWithHandoff(
    { cwd, task: incrementalPublishTask(), skipChiefEnrich: true, keywordReady },
    cwd,
  );

  if (pub.status === "waiting") {
    appendFailedOperation(
      {
        kind: "pipeline",
        message: humanIncrementalPublishingFailureMessage(
          { status: pub.status, reason: pub.reason },
          vertical_label,
        ),
        detail: [summarizePublishingFailure(pub, vertical_id), `vertical_id=${vertical_id} cadence_tick=${tick}`].join(
          "\n",
        ),
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
    const p = pub as Exclude<PublishingPipelineResult, { status: "approved" }>;
    appendFailedOperation(
      {
        kind: "pipeline",
        message: humanIncrementalPublishingFailureMessage(
          {
            status: p.status,
            reason: "reason" in p ? p.reason : undefined,
            stage: "stage" in p ? p.stage : undefined,
            message: "message" in p ? p.message : undefined,
          },
          vertical_label,
        ),
        detail: [
          summarizePublishingFailure(p, vertical_id),
          JSON.stringify(p).slice(0, 2000),
          `vertical_id=${vertical_id} cadence_tick=${tick}`,
        ].join("\n"),
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
      keyword: pub.contentWorkflow?.keyword ?? seo.contentWorkflow?.keyword,
      contentSubcategory:
        pub.contentWorkflow?.subcategory ?? seo.contentWorkflow?.subcategory,
      articleTitle: null,
      result: pub,
    },
    { awaitFounderOversight: options?.awaitFounderOversight === true },
  );

  if (!site.ok) {
    appendFailedOperation(
      {
        kind: "pipeline",
        message: humanIncrementalSiteFailureMessage(site.error, vertical_label),
        detail: [`site publish failed: ${site.error}`, `vertical_id=${vertical_id} cadence_tick=${tick}`].join("\n"),
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

/**
 * One hourly tick: by default one vertical, one topic (serial). Set `AGENTIC_INCREMENTAL_BATCH_SIZE` (2–10)
 * to reserve and run that many **parallel** topic lanes (isolated `keywordReady` per topic; no global race).
 */
export async function runIncrementalHourlyPublish(
  cwd: string = process.cwd(),
  options?: IncrementalHourlyOptions,
): Promise<IncrementalHourlyResult> {
  const tickMeta = nextVerticalForHourlyTick(cwd);
  if (incrementalBatchSizeFromEnv() > 1) {
    return runIncrementalBatch(cwd, options, tickMeta);
  }
  return runIncrementalSingleTopic(cwd, options, tickMeta);
}
