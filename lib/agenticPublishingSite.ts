import {
  computeArticleSlug,
  extractMarkdownTitle,
  publishAgenticArticle,
} from "@/lib/agenticArticlePublish";
import { uploadArticleCoverPng } from "@/lib/articleCoverStorage";
import { sharePublishedArticleToZernio } from "@/lib/agenticZernioPost";
import { scheduleChiefPublishCycleEmail } from "@/xalura-agentic/lib/chiefPublishDigest";
import { scheduleChiefPublishOutcomeReport } from "@/xalura-agentic/lib/chiefPublishOutcomeReport";
import {
  executeFounderOversightPublishEmail,
  scheduleFounderOversightPublishEmail,
  type FounderOversightPublishParams,
} from "@/xalura-agentic/lib/founderOversightPublish";
import { generatePublishingHeroImage } from "@/xalura-agentic/lib/publishingHeroImage";
import { recordArticlePublished } from "@/xalura-agentic/lib/contentWorkflow/publishedTopicsStore";
import { appendEvent } from "@/xalura-agentic/lib/eventQueue";
import { appendFailedOperation } from "@/xalura-agentic/lib/failedQueue";
import type { DepartmentPipelineResult } from "@/xalura-agentic/lib/runDepartmentPipeline";
import { publishingWorkerArticleByline } from "@/xalura-agentic/lib/agentNames";
import { loadAgentNamesResolved } from "@/lib/loadAgentNamesResolved";
import { resolveWorkerEnv } from "@/xalura-agentic/lib/resolveWorkerEnv";

type ApprovedPublishing = Extract<DepartmentPipelineResult, { status: "approved" }>;

export type SitePublishZernio =
  | { skipped: true; reason: string }
  | { ok: true; status: number }
  | { ok: false; error: string };

export type SitePublishSuccess = {
  title: string;
  slug: string;
  path: string;
  zernio: SitePublishZernio;
};

export type SitePublishOptions = {
  /**
   * Compliance + founder / graphic pipeline after publish.
   * - **Default (omit or `true`):** `await executeFounderOversightPublishEmail` so Resend actually sends (cron / serverless
   *   will not always finish `waitUntil` background work).
   * - **`false`:** `scheduleFounderOversightPublishEmail` (faster response; can drop on hosts without a reliable `waitUntil`).
   */
  awaitFounderOversight?: boolean;
};

/**
 * Upsert Supabase article + event queue + topic ledger + optional Zernio + Chief publish digest.
 * Caller must have already run publishing pipeline and received `status: "approved"`.
 */
export async function sitePublishFromApprovedPublishingRun(
  params: {
    cwd: string;
    task: string;
    keyword?: string;
    contentSubcategory?: string;
    articleTitle: string | null;
    articleSlug?: string;
    result: ApprovedPublishing;
  },
  options?: SitePublishOptions,
): Promise<{ ok: true; data: SitePublishSuccess } | { ok: false; error: string }> {
  const title =
    params.articleTitle?.trim() ||
    extractMarkdownTitle(params.result.workerOutput) ||
    params.task.slice(0, 120);

  const slug = computeArticleSlug(title, params.articleSlug);

  const requireCoverRaw = (await resolveWorkerEnv("AGENTIC_REQUIRE_COVER_ON_PUBLISH")) ?? "";
  const requireCover =
    requireCoverRaw.trim().toLowerCase() === "true" || requireCoverRaw.trim() === "1";
  const graphicDesignerRaw =
    (await resolveWorkerEnv("AGENTIC_GRAPHIC_DESIGNER_ON_PUBLISH")) ?? "";
  const graphicDesignerOn =
    graphicDesignerRaw.trim().toLowerCase() === "true" || graphicDesignerRaw.trim() === "1";

  if (requireCover && !graphicDesignerOn) {
    const err =
      "AGENTIC_REQUIRE_COVER_ON_PUBLISH is set but AGENTIC_GRAPHIC_DESIGNER_ON_PUBLISH is not enabled — enable both (and Storage bucket article-covers) or unset require.";
    scheduleChiefPublishOutcomeReport({
      cwd: params.cwd,
      source: "site_publish_gating",
      kind: "article",
      result: "error",
      titleLine: (params.articleTitle || params.task).replace(/\s+/g, " ").trim().slice(0, 120) || "Article",
      category: "configuration",
      bodyFacts: `**What happened:** site publish was not run.\n**Logged:** this failure is from pre-publish gating; fix env so cover generation can run, or turn off require cover.\n**Error:** ${err}`,
    });
    return { ok: false, error: err };
  }

  let coverForRow: string | undefined;
  let precomputedHero: FounderOversightPublishParams["precomputedHero"];

  const primaryKwForHero =
    (params.result.contentWorkflow?.topic_bank
      ? params.result.contentWorkflow.keyword
      : params.keyword)?.trim() || undefined;
  const subForHero =
    params.contentSubcategory?.trim() ||
    (params.result.contentWorkflow?.topic_bank
      ? params.result.contentWorkflow.subcategory?.trim()
      : undefined) ||
    undefined;

  const hero = await generatePublishingHeroImage({
    title,
    executiveSummary: params.result.executiveSummary,
    slug,
    primaryKeyword: primaryKwForHero,
    subcategory: subForHero,
  });
  if (hero.ok) {
    const up = await uploadArticleCoverPng({
      slug,
      pngBase64: hero.base64,
      mimeType: hero.mimeType,
    });
    if (up.ok) {
      coverForRow = up.publicUrl;
    } else {
      appendFailedOperation(
        {
          kind: "other",
          message: `Article cover upload failed: ${up.error}`,
          detail: `slug=${slug} bucket=article-covers`,
        },
        params.cwd,
      );
    }
    precomputedHero = {
      filename: `hero-${slug}.png`,
      content: hero.base64,
      imagePrompt: hero.imagePrompt,
    };
  } else if (!hero.error.includes("not enabled")) {
    appendFailedOperation(
      {
        kind: "other",
        message: `Publishing hero image: ${hero.error}`,
        detail: `slug=${slug}`,
      },
      params.cwd,
    );
  }

  if (requireCover && !coverForRow) {
    const err = `AGENTIC_REQUIRE_COVER_ON_PUBLISH: article not published — no cover image URL (graphic step: ${
      hero.ok ? "generated but upload failed — check article-covers bucket and failed queue" : hero.error
    }).`;
    scheduleChiefPublishOutcomeReport({
      cwd: params.cwd,
      source: "site_publish_cover",
      kind: "article",
      result: "error",
      titleLine: (params.articleTitle || params.task).replace(/\s+/g, " ").trim().slice(0, 120) || "Article",
      category: "technical",
      bodyFacts: `**What happened:** no cover **public URL**; article not upserted to avoid publishing without a hero.\n**Logged:** failed queue may have cover or Storage errors from this run.\n**Error:** ${err}`,
    });
    return { ok: false, error: err };
  }

  const subForArticle =
    params.contentSubcategory?.trim() ||
    (params.result.contentWorkflow?.topic_bank
      ? params.result.contentWorkflow.subcategory?.trim()
      : undefined) ||
    undefined;

  const nameCfg = await loadAgentNamesResolved(params.cwd);
  const pub = await publishAgenticArticle({
    title,
    body: params.result.workerOutput,
    slug: params.articleSlug?.trim() || undefined,
    author: publishingWorkerArticleByline(params.cwd, nameCfg),
    ...(coverForRow !== undefined ? { coverImageUrl: coverForRow } : {}),
    ...(subForArticle ? { subcategory: subForArticle } : {}),
  });

  if (!pub.ok) {
    const err = pub.error;
    scheduleChiefPublishOutcomeReport({
      cwd: params.cwd,
      source: "site_upsert_article",
      kind: "article",
      result: "error",
      titleLine: title,
      category: "technical",
      bodyFacts: `**What happened:** article body did not store in Supabase / public publish path.\n**Manager/Executive had approved** — failure is in site upsert or validation.\n**Error:** ${err.replace(/\s+/g, " ").trim()}\n**Slug (computed):** ${slug}`,
    });
    return { ok: false, error: err };
  }

  appendEvent(
    {
      type: "ARTICLE_PUBLISHED",
      payload: {
        article_id: pub.slug,
        title,
        url: `/articles/${pub.slug}`,
      },
    },
    params.cwd,
  );

  const pubKw =
    (params.result.contentWorkflow?.topic_bank
      ? params.result.contentWorkflow.keyword
      : params.keyword) ||
    extractMarkdownTitle(params.result.workerOutput) ||
    params.task.slice(0, 120);

  recordArticlePublished(params.cwd, {
    keyword: pubKw,
    slug: pub.slug,
    content_type: params.result.contentWorkflow?.topic_bank
      ? params.result.contentWorkflow.content_type
      : "article",
    subcategory: params.contentSubcategory,
    vertical_id: params.result.contentWorkflow?.topic_bank
      ? params.result.contentWorkflow.vertical_id
      : undefined,
  });

  const zernio = await sharePublishedArticleToZernio({
    title,
    articlePath: `/articles/${pub.slug}`,
    coverImageUrl: coverForRow ?? null,
  });

  const zernioLine =
    "skipped" in zernio
      ? `Skipped: ${zernio.reason}`
      : zernio.ok
        ? `Posted OK (HTTP ${zernio.status})`
        : `Failed: ${zernio.error}`;

  scheduleChiefPublishCycleEmail({
    cwd: params.cwd,
    task: params.task,
    title,
    slug: pub.slug,
    articlePath: `/articles/${pub.slug}`,
    executiveSummary: params.result.executiveSummary,
    workerOutputExcerpt: params.result.workerOutput,
    managerAttempts: params.result.managerAttempts,
    managerOutputFull: params.result.managerOutput,
    managerRejectionHistory: params.result.managerRejectionHistory,
    escalationPhaseIndex: params.result.escalationPhaseIndex,
    cycleIndex: params.result.cycle.cycleIndex,
    auditTriggered: params.result.cycle.auditTriggered,
    cycleFileRelative: params.result.cycle.cycleFileRelative,
    zernioLine,
  });

  const preApprove = (params.result.managerRejectionHistory ?? []).filter(Boolean);
  const rejSummary =
    preApprove.length > 0
      ? preApprove.map((r, i) => `  ${i + 1}. ${r.replace(/\s+/g, " ").trim().slice(0, 800)}`).join("\n")
      : "(none in this run — may have been approved on first try.)";
  scheduleChiefPublishOutcomeReport({
    cwd: params.cwd,
    source: "site_publish_approved",
    kind: "article",
    result: "ok",
    titleLine: title,
    category: "success",
    bodyFacts: [
      "**Published to site (approved pipeline + upsert).**",
      `**Title:** ${title}`,
      `**Path:** /articles/${pub.slug}`,
      `**Zernio:** ${zernioLine}`,
      `**Cycle log file:** ${params.result.cycle.cycleFileRelative} · 10-cycle audit context: ${
        params.result.cycle.auditTriggered
      }`,
      `**Manager review rounds (total, all phases):** ${params.result.managerAttempts} · **Executive rewrite phases before commit:** ${
        params.result.escalationPhaseIndex ?? 0
      }`,
      "**Manager rejection rounds in winning phase (before final APPROVE) — for context:**",
      rejSummary,
      `**Event queue / topic ledger updates** ran after upsert; **failed queue** (tail in email) lists recent integration noise unrelated to the approval decision if any.`,
    ].join("\n\n"),
  });

  const founderParams: FounderOversightPublishParams = {
    cwd: params.cwd,
    task: params.task,
    title,
    slug: pub.slug,
    articlePath: `/articles/${pub.slug}`,
    executiveSummary: params.result.executiveSummary,
    workerOutputExcerpt: params.result.workerOutput,
    managerAttempts: params.result.managerAttempts,
    managerOutputFull: params.result.managerOutput,
    managerRejectionHistory: params.result.managerRejectionHistory,
    escalationPhaseIndex: params.result.escalationPhaseIndex,
    cycleIndex: params.result.cycle.cycleIndex,
    auditTriggered: params.result.cycle.auditTriggered,
    cycleFileRelative: params.result.cycle.cycleFileRelative,
    zernioLine,
    managerOutput: params.result.managerOutput,
    contentVerticalId: params.result.contentWorkflow?.topic_bank
      ? params.result.contentWorkflow.vertical_id
      : undefined,
    contentVerticalLabel: params.result.contentWorkflow?.topic_bank
      ? params.result.contentWorkflow.vertical_label
      : undefined,
    ...(precomputedHero ? { precomputedHero } : {}),
  };

  if (options?.awaitFounderOversight === false) {
    scheduleFounderOversightPublishEmail(founderParams);
  } else {
    await executeFounderOversightPublishEmail(founderParams);
  }

  const zernioOut: SitePublishZernio =
    "skipped" in zernio
      ? { skipped: true, reason: zernio.reason }
      : zernio.ok
        ? { ok: true, status: zernio.status }
        : { ok: false, error: zernio.error };

  return {
    ok: true,
    data: {
      title,
      slug: pub.slug,
      path: `/articles/${pub.slug}`,
      zernio: zernioOut,
    },
  };
}
