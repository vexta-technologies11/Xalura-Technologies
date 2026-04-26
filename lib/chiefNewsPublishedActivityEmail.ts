import type { NewsPublishPostEmailContext } from "@/lib/newsAuditorPublishedEmail";
import { formatNewsPipelineFullNarrativeForEmail } from "@/lib/newsPipelineEmailNarrative";

export { formatNewsPipelineFullNarrativeForEmail };

export const CHIEF_NEWS_DIGEST_MAX_WORDS = 1_600;

function publicSiteNewsUrl(slug: string): string {
  const base =
    process.env["NEXT_PUBLIC_SITE_URL"]?.replace(/\/$/, "") ||
    process.env["AGENTIC_PUBLIC_BASE_URL"]?.replace(/\/$/, "") ||
    "https://www.xaluratech.com";
  return `${base}/news/${slug.replace(/^\//, "")}`;
}

/**
 * Full News activity text appended to the Chief publish digest briefing when
 * `publishKind === "news"` in `scheduleChiefPublishCycleEmail` (same path as
 * /articles post-publish).
 */
export function buildNewsPublishActivityExtendedBriefing(params: {
  runId: string;
  title: string;
  slug: string;
  bodyExcerpt: string;
  auditText: string;
  postEmailContext?: NewsPublishPostEmailContext;
}): string {
  const bodyClip = params.bodyExcerpt.replace(/\s+/g, " ").trim().slice(0, 6_000);
  const auditClip = params.auditText.replace(/\s+/g, " ").trim().slice(0, 6_000);
  const url = publicSiteNewsUrl(params.slug);
  const ctx = params.postEmailContext;
  const narrative = formatNewsPipelineFullNarrativeForEmail(ctx);

  return [
    `**URL:** ${url}`,
    `**Title:** ${params.title}`,
    `**Run id:** ${params.runId}`,
    "",
    narrative,
    "",
    "**Final publishable audit text (Chief of Audit):**",
    auditClip,
    "",
    "**Published body excerpt:**",
    bodyClip,
  ]
    .join("\n")
    .slice(0, 32_000);
}
