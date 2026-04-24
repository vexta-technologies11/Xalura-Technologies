import { buildSeoQualityChecklist } from "./contentWorkflow/seoQualityChecklist";
import {
  appendEvent,
  getLatestEvent,
  type ArticlePublishedPayload,
  type KeywordReadyPayload,
} from "./eventQueue";
import {
  runMarketingPipeline,
  type MarketingPipelineInput,
  type MarketingPipelineResult,
} from "../departments/marketing";
import {
  runPublishingPipeline,
  type PublishingPipelineInput,
  type PublishingPipelineResult,
} from "../departments/publishing";
import {
  runSeoPipeline,
  type SeoPipelineInput,
  type SeoPipelineResult,
} from "../departments/seo";

export type WaitingResult = {
  status: "waiting";
  department: "publishing" | "marketing";
  reason: string;
};

/** Build the same `KEYWORD_READY` payload the handoff would emit (for parallel publishing). */
export function buildKeywordReadyPayloadFromApprovedSeo(
  result: Extract<SeoPipelineResult, { status: "approved" }>,
  inputKeyword?: string,
): KeywordReadyPayload {
  const kw =
    result.contentWorkflow?.topic_bank && result.contentWorkflow.keyword
      ? result.contentWorkflow.keyword
      : inputKeyword?.trim() || "general";
  const payload: KeywordReadyPayload = {
    bundle_id: `seo-bundle-${Date.now()}`,
    keywords: [kw],
  };
  if (result.contentWorkflow?.topic_bank) {
    const cw = result.contentWorkflow;
    payload.content_type = cw.content_type;
    payload.subcategory = cw.subcategory;
    payload.source_urls = cw.source_urls?.length ? cw.source_urls : undefined;
    if (cw.vertical_id) payload.vertical_id = cw.vertical_id;
    if (cw.vertical_label) payload.vertical_label = cw.vertical_label;
    if (cw.topic_id) payload.topic_id = cw.topic_id;
    payload.checklist = buildSeoQualityChecklist({
      primary_keyword: cw.keyword,
      subcategory: cw.subcategory,
      theme_label: (cw.vertical_label || cw.vertical_id).trim() || "general",
      source_urls: cw.source_urls ?? [],
      seo_worker_excerpt: result.workerOutput,
    });
  }
  return payload;
}

/**
 * SEO → emits `KEYWORD_READY` after a successful approval (keyword bundle for Publishing).
 */
export async function runSeoPipelineWithHandoff(
  input: SeoPipelineInput,
  cwd: string = process.cwd(),
): Promise<SeoPipelineResult> {
  const result = await runSeoPipeline(input);
  if (result.status === "approved") {
    const payload = buildKeywordReadyPayloadFromApprovedSeo(
      result,
      input.keyword,
    );
    appendEvent({ type: "KEYWORD_READY", payload }, cwd);
  }
  return result;
}

/**
 * Publishing → requires a `KEYWORD_READY` handoff: **explicit** `input.keywordReady`, or
 * the latest `KEYWORD_READY` event. Skip when `input.skipUpstreamCheck === true`.
 * On approval → emits `ARTICLE_PUBLISHED`.
 */
export async function runPublishingPipelineWithHandoff(
  input: PublishingPipelineInput & {
    skipUpstreamCheck?: boolean;
    /** When set, use this package instead of the global latest `KEYWORD_READY` (parallel topics). */
    keywordReady?: KeywordReadyPayload;
  },
  cwd: string = process.cwd(),
): Promise<PublishingPipelineResult | WaitingResult> {
  let handoff: KeywordReadyPayload | undefined = input.keywordReady;
  if (!input.skipUpstreamCheck) {
    if (!handoff) {
      const ready = getLatestEvent("KEYWORD_READY", cwd);
      if (!ready || ready.type !== "KEYWORD_READY") {
        return {
          status: "waiting",
          department: "publishing",
          reason:
            "No KEYWORD_READY event — run SEO handoff first, pass keywordReady for this topic, or pass skipUpstreamCheck for local tests.",
        };
      }
      handoff = ready.payload;
    }
  } else {
    handoff = input.keywordReady;
  }

  const { skipUpstreamCheck: _s, keywordReady: _kr, ...rest } = input;
  const result = await runPublishingPipeline({ ...rest, keywordReady: handoff });
  if (result.status !== "approved") {
    return result;
  }

  const topicId =
    (result.contentWorkflow?.topic_bank && result.contentWorkflow.topic_id) ||
    handoff?.topic_id;

  const payload: ArticlePublishedPayload = {
    article_id: `article-${Date.now()}`,
    title: rest.task.slice(0, 120),
    url: undefined,
    ...(topicId ? { topic_id: topicId } : {}),
  };
  appendEvent({ type: "ARTICLE_PUBLISHED", payload }, cwd);
  return result;
}

/**
 * Marketing → requires latest `ARTICLE_PUBLISHED` unless `input.skipUpstreamCheck === true`.
 */
export async function runMarketingPipelineWithHandoff(
  input: MarketingPipelineInput & { skipUpstreamCheck?: boolean },
  cwd: string = process.cwd(),
): Promise<MarketingPipelineResult | WaitingResult> {
  if (!input.skipUpstreamCheck) {
    const pub = getLatestEvent("ARTICLE_PUBLISHED", cwd);
    if (!pub || pub.type !== "ARTICLE_PUBLISHED") {
      return {
        status: "waiting",
        department: "marketing",
        reason:
          "No ARTICLE_PUBLISHED event — run Publishing handoff first, or pass skipUpstreamCheck for local tests.",
      };
    }
  }

  const { skipUpstreamCheck: _s, ...rest } = input;
  return runMarketingPipeline(rest);
}
