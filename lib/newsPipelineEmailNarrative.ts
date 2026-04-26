import type { NewsPublishPostEmailContext } from "@/lib/newsAuditorPublishedEmail";

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
 * Full story: Pre-Production → Writer → Chief of Audit, with every REJECT reason
 * and every executive output — for publish emails and Chief digest briefing.
 */
export function formatNewsPipelineFullNarrativeForEmail(
  ctx: NewsPublishPostEmailContext | undefined,
): string {
  if (!ctx) {
    return "(No extended pipeline context for this run — stats were not captured.)";
  }
  const preWriterBlock = `**Pre-Production (winning path):** The Pre-Production manager **approved round ${ctx.preprod.passRound}** after **${ctx.preprod.rejectionsBeforePass}** prior REJECT on that desk (see list below).
**Writer desk:** The Writer manager **approved round ${ctx.writer.passRound}** after **${ctx.writer.rejectionsBeforePass}** prior REJECT on that desk (see list below).
**End-to-end:** **${ctx.audit.fullPipelineRounds}** full pipeline pass(es) through **Chief of Audit**; **${ctx.audit.executiveRejectionsBeforeSuccess}** time(s) the executive outcome was **not** publishable (UNVERIFIED / MISLEADING) before the final **VERIFIED** that allowed publish.
**Same-day pool (count):** ${ctx.newsPoolItemCount} — **Sample pool headlines:** ${ctx.topPoolTitles}

**30-item checklist (timeliness / beat) excerpt:**
${ctx.checklistExcerpt.slice(0, 3_200)}

**Independent Serp (title / reality cross-check) excerpt:**
${ctx.serpForAudit.replace(/\s+/g, " ").trim().slice(0, 1_800)}

**Desk draft excerpt (what went to audit / publish):**
${ctx.draftExcerpt.replace(/\s+/g, " ").trim().slice(0, 4_500)}
`;

  const preprod = blockPreprodRejects(ctx);
  const writer = blockWriterRejects(ctx);
  const execRounds =
    ctx.audit.executiveRounds.length > 0
      ? ctx.audit.executiveRounds
          .map(
            (r) =>
              `**Full-pipeline try ${r.pipelineRound}** — ${r.verified ? "**VERIFIED** (publishable if this is the last pass)" : "**NOT VERIFIED** (run could not publish on this try)"}\n${r.excerpt.replace(/\s+/g, " ").trim().slice(0, 2_500)}`,
          )
          .join("\n\n")
      : "(No per-round executive log in context — single pass only.)";

  return [
    "## What happened from Pre-Production through Chief of Audit",
    preWriterBlock,
    "",
    "### Pre-Production manager — each REJECT (with reason) before the final APPROVE",
    preprod,
    "",
    "### Writer manager — each REJECT (with reason) before the final APPROVE",
    writer,
    "",
    "### Chief of Audit (executive) — each full-pipeline audit output",
    execRounds,
  ].join("\n");
}
