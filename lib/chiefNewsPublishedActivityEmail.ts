import { finishChiefPlainBody, wrapChiefEmailHtml } from "@/lib/chiefEmailBranding";
import { runChiefAI } from "@/xalura-agentic/agents/chiefAI";
import { chiefDisplayName } from "@/xalura-agentic/lib/agentNames";
import { sendResendEmail } from "@/xalura-agentic/lib/phase7Clients";
import { resolveWorkerEnv } from "@/xalura-agentic/lib/resolveWorkerEnv";
import { clipNewsEmailWords } from "@/lib/newsTeamEmailSend";
import type { NewsPublishPostEmailContext } from "@/lib/newsAuditorPublishedEmail";

const CHIEF_NEWS_ACTIVITY_MAX_WORDS = 1_600;

function publicSiteNewsUrl(slug: string): string {
  const base =
    process.env["NEXT_PUBLIC_SITE_URL"]?.replace(/\/$/, "") ||
    process.env["AGENTIC_PUBLIC_BASE_URL"]?.replace(/\/$/, "") ||
    "https://www.xaluratech.com";
  return `${base}/news/${slug.replace(/^\//, "")}`;
}

function logResend(
  r: { id?: string; error?: string },
): void {
  if (r.error) {
    console.error("[news-publish-email] chief_unified Resend failed:", r.error);
  } else if (r.id) {
    console.log(`[news-publish-email] chief_unified sent resend_id=${r.id}`);
  }
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
 * Single “Chief AI” post-publish email: full News activity (pre-prod → writers → audit → live)
 * with manager reject reasons, revisions, and relevancy/grade. Replaces separate Head of News
 * and Chief of Audit digests unless `CHIEF_NEWS_LEGACY_NEWS_TEAM_EMAILS=true`.
 *
 * Env: `CHIEF_NEWS_ACTIVITY_EMAIL_ON_PUBLISH` not false/0. To: `AGENTIC_CHIEF_DIGEST_EMAIL`.
 * From: `CHIEF_RESEND_FROM` or `RESEND_FROM`.
 */
export async function sendChiefNewsActivityPublishEmailIfEnabled(params: {
  runId: string;
  title: string;
  slug: string;
  bodyExcerpt: string;
  auditText: string;
  postEmailContext?: NewsPublishPostEmailContext;
}): Promise<void> {
  const on = (await resolveWorkerEnv("CHIEF_NEWS_ACTIVITY_EMAIL_ON_PUBLISH"))?.trim().toLowerCase();
  if (on === "false" || on === "0") {
    console.warn(
      "[news-publish-email] chief_unified skipped: CHIEF_NEWS_ACTIVITY_EMAIL_ON_PUBLISH=false",
    );
    return;
  }
  const to = (await resolveWorkerEnv("AGENTIC_CHIEF_DIGEST_EMAIL"))?.trim() || "";
  if (!to) {
    console.warn(
      "[news-publish-email] chief_unified skipped: set AGENTIC_CHIEF_DIGEST_EMAIL",
    );
    return;
  }
  const from =
    (await resolveWorkerEnv("CHIEF_RESEND_FROM"))?.trim() ||
    (await resolveWorkerEnv("RESEND_FROM"))?.trim() ||
    "";
  if (!from) {
    console.warn(
      "[news-publish-email] chief_unified skipped: CHIEF_RESEND_FROM or RESEND_FROM",
    );
    return;
  }

  const url = publicSiteNewsUrl(params.slug);
  const bodyClip = params.bodyExcerpt.replace(/\s+/g, " ").trim().slice(0, 6_000);
  const auditClip = params.auditText.replace(/\s+/g, " ").trim().slice(0, 6_000);
  const ctx = params.postEmailContext;
  const chiefN = chiefDisplayName();

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

  let brief: string;
  try {
    brief = await runChiefAI({
      department: "All",
      task: `You are **${chiefN}** (Chief AI, Xalura Head of Operations). A **News department** story was just **published live**. The CEO (Boss) receives **this single consolidated update** (not separate inboxes for Head of News / Chief of Audit — you represent the whole operation).

**Write as the authoritative Chief:** formal but warm to Boss, first line greeting to Boss, then a **structured activity report** the CEO can scan.

**You must include these sections in order (plain text, clear headers):**
1) **What shipped** — title, one line on angle, public URL, run id.
2) **Pre-Production → pick** — what the pre-prod worker was doing; **if managers rejected, list each with the reason and round** (use the "Pre-Prod manager rejections" / "Writer manager rejections" below — be explicit: e.g. "Manager rejected round 1 because… then writer revised.").
3) **Writer desk** — draft passes / rejects with **reasons** if any.
4) **Chief of Audit (executive)** — each full-pipeline try if more than one; final VERIFIED outcome;** relevancy / news cycle fit** (0–100) and **letter grade (A+–F)** for this publish as a product.
5) **Risks / watch** — one short bullet on what to monitor next.
6) **Close** with one line you are their single line of sight for News on Xalura.

**Hard cap ~${Math.floor(CHIEF_NEWS_ACTIVITY_MAX_WORDS * 0.95)}–${CHIEF_NEWS_ACTIVITY_MAX_WORDS} words.**

**URL:** ${url}  
**Title:** ${params.title}  
**Run id:** ${params.runId}

${preWriterBlock}

**Pre-Prod manager rejections (each REJECT and why, before final approve):**
${preprodLines}

**Writer manager rejections (each REJECT and why, before final approve):**
${writerLines}

**Executive audit (Chief of Audit) — round log:**
${execRoundsBlock}

**Final publishable audit text (verbatim):**
${auditClip}

**Published body excerpt (article):**
${bodyClip}
`,
      context: { kind: "chief_news_publish_activity", slug: params.slug },
      assignedName: chiefN,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    brief = `News publish: ${params.title} — ${url}\nRun: ${params.runId}\n(Note: model error ${msg.slice(0, 120)})\n\nAudit: ${auditClip.slice(0, 800)}`;
  }

  const capped = clipNewsEmailWords(brief, CHIEF_NEWS_ACTIVITY_MAX_WORDS);
  const sub = `[Xalura / Chief] News live — full activity: ${params.title.slice(0, 52)}`;
  const textOut = finishChiefPlainBody(capped.replace(/\r\n/g, "\n").trim(), true);
  const htmlOut = wrapChiefEmailHtml({
    bodyPlain: capped.replace(/\r\n/g, "\n").trim(),
    includeMemo: true,
  });
  const ccRaw = (await resolveWorkerEnv("CHIEF_EMAIL_CC"))?.trim();
  const cc = ccRaw
    ? ccRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;

  const r = await sendResendEmail({
    from,
    to,
    cc,
    subject: sub.slice(0, 998),
    text: textOut,
    html: htmlOut,
  });
  logResend(r);
}
