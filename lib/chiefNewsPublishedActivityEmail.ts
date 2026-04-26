import type { NewsPublishPostEmailContext } from "@/lib/newsAuditorPublishedEmail";

export const CHIEF_NEWS_DIGEST_MAX_WORDS = 1_600;

function publicSiteNewsUrl(slug: string): string {
  const base =
    process.env["NEXT_PUBLIC_SITE_URL"]?.replace(/\/$/, "") ||
    process.env["AGENTIC_PUBLIC_BASE_URL"]?.replace(/\/$/, "") ||
    "https://www.xaluratech.com";
  return `${base}/news/${slug.replace(/^\//, "")}`;
}

function blockPreprodRejects(
  ctx: NewsPublishPostEmailContext | undefined,
): string {
  if (!ctx) return "";
  if (!ctx.preprodManagerRejections.length) {
    return "**Pre-Production manager:** no rejections — first pass approved.";
  }
  return ctx.preprodManagerRejections
    .map(
      (x, i) =>
        `  ${i + 1}. **Round ${x.round} — REJECTED:** ${x.reason}`,
    )
    .join("\n");
}

function blockWriterRejects(
  ctx: NewsPublishPostEmailContext | undefined,
): string {
  if (!ctx) return "";
  if (!ctx.writerManagerRejections.length) {
    return "**Writer manager:** no rejections — first pass approved.";
  }
  return ctx.writerManagerRejections
    .map(
      (x, i) =>
        `  ${i + 1}. **Round ${x.round} — REJECTED:** ${x.reason}`,
    )
    .join("\n");
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

  const preWriterBlock = ctx
    ? `
**Pre-Production (final winning pipeline before publish):** approved **round ${ctx.preprod.passRound}**; **${ctx.preprod.rejectionsBeforePass}** total manager reject(s) before that. Same-day pool size: **${ctx.newsPoolItemCount}**; sample titles: ${ctx.topPoolTitles}
**30-item checklist excerpt:**
${ctx.checklistExcerpt.slice(0, 2_500)}
**Writer desk:** approved **round ${ctx.writer.passRound}**; **${ctx.writer.rejectionsBeforePass}** writer-manager reject(s).
**End-to-end audit:** **${ctx.audit.fullPipelineRounds}** full pipeline run(s) to executive audit; **${ctx.audit.executiveRejectionsBeforeSuccess}** executive not-verified before final VERIFIED.
**Independent Serp (title check):** ${ctx.serpForAudit.replace(/\s+/g, " ").trim().slice(0, 1_200)}
`
    : "";

  const preprodLines = blockPreprodRejects(ctx);
  const writerLines = blockWriterRejects(ctx);
  const execRoundsBlock =
    ctx && ctx.audit.executiveRounds.length > 0
      ? ctx.audit.executiveRounds
          .map(
            (r) =>
              `- Pipeline run ${r.pipelineRound}: ${r.verified ? "VERIFIED" : "NOT VERIFIED"}\n  ${r.excerpt.slice(0, 1_200)}`,
          )
          .join("\n\n")
      : "(no round log)";

  return [
    `**URL:** ${url}`,
    `**Title:** ${params.title}`,
    `**Run id:** ${params.runId}`,
    preWriterBlock,
    "",
    "**Pre-Prod manager rejections (REJECT + reason, before final approve):**",
    preprodLines,
    "",
    "**Writer manager rejections (REJECT + reason, before final approve):**",
    writerLines,
    "",
    "**Executive audit (Chief of Audit) — round log:**",
    execRoundsBlock,
    "",
    "**Final publishable audit text:**",
    auditClip,
    "",
    "**Published body excerpt:**",
    bodyClip,
  ]
    .join("\n")
    .slice(0, 24_000);
}
