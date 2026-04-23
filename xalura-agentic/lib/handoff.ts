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

/**
 * SEO → emits `KEYWORD_READY` after a successful approval (keyword bundle for Publishing).
 */
export async function runSeoPipelineWithHandoff(
  input: SeoPipelineInput,
  cwd: string = process.cwd(),
): Promise<SeoPipelineResult> {
  const result = await runSeoPipeline(input);
  if (result.status === "approved") {
    const kw =
      result.contentWorkflow?.topic_bank && result.contentWorkflow.keyword
        ? result.contentWorkflow.keyword
        : input.keyword?.trim() || "general";
    const payload: KeywordReadyPayload = {
      bundle_id: `seo-bundle-${Date.now()}`,
      keywords: [kw],
    };
    if (result.contentWorkflow?.topic_bank) {
      const cw = result.contentWorkflow;
      payload.content_type = cw.content_type;
      payload.subcategory = cw.subcategory;
      payload.source_urls = cw.source_urls?.length ? cw.source_urls : undefined;
    }
    appendEvent({ type: "KEYWORD_READY", payload }, cwd);
  }
  return result;
}

/**
 * Publishing → requires latest `KEYWORD_READY` unless `input.skipUpstreamCheck === true`.
 * On approval → emits `ARTICLE_PUBLISHED`.
 */
export async function runPublishingPipelineWithHandoff(
  input: PublishingPipelineInput & { skipUpstreamCheck?: boolean },
  cwd: string = process.cwd(),
): Promise<PublishingPipelineResult | WaitingResult> {
  if (!input.skipUpstreamCheck) {
    const ready = getLatestEvent("KEYWORD_READY", cwd);
    if (!ready || ready.type !== "KEYWORD_READY") {
      return {
        status: "waiting",
        department: "publishing",
        reason:
          "No KEYWORD_READY event — run SEO handoff first, or pass skipUpstreamCheck for local tests.",
      };
    }
  }

  const { skipUpstreamCheck: _s, ...rest } = input;
  const result = await runPublishingPipeline(rest);
  if (result.status !== "approved") {
    return result;
  }

  const payload: ArticlePublishedPayload = {
    article_id: `article-${Date.now()}`,
    title: rest.task.slice(0, 120),
    url: undefined,
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
