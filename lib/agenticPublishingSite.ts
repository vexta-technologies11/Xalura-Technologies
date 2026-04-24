import {
  computeArticleSlug,
  extractMarkdownTitle,
  publishAgenticArticle,
} from "@/lib/agenticArticlePublish";
import { uploadArticleCoverPng } from "@/lib/articleCoverStorage";
import { sharePublishedArticleToZernio } from "@/lib/agenticZernioPost";
import { scheduleChiefPublishCycleEmail } from "@/xalura-agentic/lib/chiefPublishDigest";
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
   * When true, runs the compliance / founder Resend pipeline inline (more reliable than
   * background-only scheduling on some hosts). Adds latency to the HTTP caller.
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

  let coverForRow: string | undefined;
  let precomputedHero: FounderOversightPublishParams["precomputedHero"];

  const hero = await generatePublishingHeroImage({
    title,
    executiveSummary: params.result.executiveSummary,
    slug,
  });
  if (hero.ok) {
    const up = await uploadArticleCoverPng({ slug, pngBase64: hero.base64 });
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

  const pub = await publishAgenticArticle({
    title,
    body: params.result.workerOutput,
    slug: params.articleSlug?.trim() || undefined,
    author: "Xalura Agentic",
    ...(coverForRow !== undefined ? { coverImageUrl: coverForRow } : {}),
  });

  if (!pub.ok) {
    return { ok: false, error: pub.error };
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
    cycleIndex: params.result.cycle.cycleIndex,
    auditTriggered: params.result.cycle.auditTriggered,
    cycleFileRelative: params.result.cycle.cycleFileRelative,
    zernioLine,
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

  if (options?.awaitFounderOversight) {
    await executeFounderOversightPublishEmail(founderParams);
  } else {
    scheduleFounderOversightPublishEmail(founderParams);
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
