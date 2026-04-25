import { clipNewsEmailWords } from "@/lib/newsTeamEmailSend";
import { finishChiefPlainBody, wrapChiefEmailHtml } from "@/lib/chiefEmailBranding";
import { runAgent } from "@/xalura-agentic/lib/gemini";
import { sendResendEmail } from "@/xalura-agentic/lib/phase7Clients";
import { resolveWorkerEnv } from "@/xalura-agentic/lib/resolveWorkerEnv";
import { getExecutiveAssignedName, loadAgentNamesConfig } from "@/xalura-agentic/lib/agentNames";

function publicSiteNewsUrl(slug: string): string {
  const base =
    process.env["NEXT_PUBLIC_SITE_URL"]?.replace(/\/$/, "") ||
    process.env["AGENTIC_PUBLIC_BASE_URL"]?.replace(/\/$/, "") ||
    "https://www.xaluratech.com";
  return `${base}/news/${slug.replace(/^\//, "")}`;
}

/** Stats + excerpts from the winning `runNewsPipeline` pass, for post-publish operator emails. */
export type NewsPublishPostEmailContext = {
  draftExcerpt: string;
  /** 30-item AI news checklist (same-day context). */
  checklistExcerpt: string;
  /** Winning pipeline only: each manager REJECT before final APPROVE, with reason text. */
  preprodManagerRejections: { round: number; reason: string }[];
  writerManagerRejections: { round: number; reason: string }[];
  preprod: { passRound: number; rejectionsBeforePass: number };
  writer: { passRound: number; rejectionsBeforePass: number };
  audit: {
    /** How many full pipeline-to-audit runs executed (1 = no restart after failed audit). */
    fullPipelineRounds: number;
    /** Executive UNVERIFIED etc. before the final VERIFIED. */
    executiveRejectionsBeforeSuccess: number;
    /** Each pipeline round that reached Chief of Audit, in order. */
    executiveRounds: { pipelineRound: number; verified: boolean; excerpt: string }[];
  };
  serpForAudit: string;
  newsPoolItemCount: number;
  topPoolTitles: string;
};

const HON_PUBLISH_MAX_WORDS = 420;
const AUDITOR_REPORT_MAX_WORDS = 1_200;

function logEmailSkip(
  kind: "head_of_news" | "chief_of_audit",
  reason: string,
): void {
  console.warn(`[news-publish-email] ${kind} skipped: ${reason}`);
}

function logResendPub(
  kind: "head_of_news" | "chief_of_audit",
  r: { id?: string; error?: string },
): void {
  if (r.error) {
    console.error(
      `[news-publish-email] ${kind} Resend failed:`,
      r.error,
    );
  } else if (r.id) {
    console.log(`[news-publish-email] ${kind} sent resend_id=${r.id}`);
  }
}

/**
 * After a story is **published** — email the operator with Chief of Audit findings: legitimacy, relevancy score, brief rationale.
 * Env: `NEWS_AUDITOR_EMAIL_ON_PUBLISH=true` and `NEWS_AUDITOR_DIGEST_EMAIL` (or falls back to `AGENTIC_CHIEF_DIGEST_EMAIL`).
 */
export async function sendNewsAuditorPublishedEmailIfEnabled(params: {
  cwd: string;
  runId: string;
  title: string;
  slug: string;
  /** Final draft excerpt for context */
  bodyExcerpt: string;
  /** Raw Chief of Audit model output (VERIFIED / reason) — last successful run. */
  auditText: string;
  postEmailContext?: NewsPublishPostEmailContext;
}): Promise<void> {
  const on = (await resolveWorkerEnv("NEWS_AUDITOR_EMAIL_ON_PUBLISH"))?.trim().toLowerCase();
  if (on !== "true" && on !== "1") {
    logEmailSkip("chief_of_audit", "set NEWS_AUDITOR_EMAIL_ON_PUBLISH=true (or 1) on the worker that runs the news pipeline");
    return;
  }
  const to =
    (await resolveWorkerEnv("NEWS_AUDITOR_DIGEST_EMAIL"))?.trim() ||
    (await resolveWorkerEnv("AGENTIC_CHIEF_DIGEST_EMAIL"))?.trim() ||
    "";
  if (!to) {
    logEmailSkip(
      "chief_of_audit",
      "no recipient: set NEWS_AUDITOR_DIGEST_EMAIL or AGENTIC_CHIEF_DIGEST_EMAIL",
    );
    return;
  }
  const cwd = params.cwd;
  const n = getExecutiveAssignedName("news", cwd) || "Chief of Audit (News)";

  const from =
    (await resolveWorkerEnv("CHIEF_OF_AUDIT_NEWS_RESEND_FROM"))?.trim() ||
    (await resolveWorkerEnv("CHIEF_RESEND_FROM"))?.trim() ||
    (await resolveWorkerEnv("RESEND_FROM"))?.trim() ||
    "";
  if (!from) {
    logEmailSkip(
      "chief_of_audit",
      "no From: set CHIEF_OF_AUDIT_NEWS_RESEND_FROM or CHIEF_RESEND_FROM or RESEND_FROM",
    );
    return;
  }

  const configName = loadAgentNamesConfig(cwd).departments.news?.executive?.name?.trim();
  const assigned = configName || n;

  const url = publicSiteNewsUrl(params.slug);
  const bodyClip = params.bodyExcerpt.replace(/\s+/g, " ").trim().slice(0, 6_000);
  const auditClip = params.auditText.replace(/\s+/g, " ").trim().slice(0, 6_000);
  const ctx = params.postEmailContext;

  const roundsBlock =
    ctx && ctx.audit.executiveRounds.length > 0
      ? ctx.audit.executiveRounds
          .map(
            (r, i) =>
              `### Full-pipeline run ${r.pipelineRound} (exec round ${i + 1}): ${r.verified ? "ACCEPT (VERIFIED)" : "REJECT (not verified)"}\n${r.excerpt.slice(0, 3_000)}`,
          )
          .join("\n\n")
      : "";

  const preWriterBlock = ctx
    ? `**Pre-Production (final winning pipeline):** approved on **round ${ctx.preprod.passRound}** after **${ctx.preprod.rejectionsBeforePass}** manager reject(s) before that pass.
**Writer desk:** approved on **round ${ctx.writer.passRound}** after **${ctx.writer.rejectionsBeforePass}** manager reject(s).
**End-to-end:** **${ctx.audit.fullPipelineRounds}** full pipeline run(s) to Chief of Audit; **${ctx.audit.executiveRejectionsBeforeSuccess}** executive rejection(s) before the published VERIFIED.
**Same-day news pool (count):** ${ctx.newsPoolItemCount}. **Sample story titles from pool:** ${ctx.topPoolTitles}
**Independent Serp (title cross-check) excerpt:**
${ctx.serpForAudit.replace(/\s+/g, " ").trim().slice(0, 2_500)}

**30-item checklist (same day / beat context — for timeliness and overlap):**
${ctx.checklistExcerpt.slice(0, 4_000)}
`
    : "";

  let brief: string;
  try {
    brief = await runAgent({
      role: "Executive",
      department: "News — Chief of Audit",
      task: `You are **${assigned}**, **Chief of Audit (News)**. A story was just **published**. Write a **formal, detailed audit report as email to the CEO** in the tone of a **securities / editorial / compliance** audit memo (not casual chat).

**You must use this exact section structure in the body (markdown headings in plain text, e.g. lines like "1. Executive summary" — no # symbols required):**
1) **Executive summary** — 2–4 sentences: what was published and your bottom-line judgment.
2) **Scope and criteria** — what you reviewed (sourcing, alignment with public reporting, checklist vs today’s items).
3) **Accept / reject counts (pipeline)** — State clearly:
   - Pre-Production: how many **manager REJECTS** then **1 approve** (use the stats below if present).
   - Writer desk: same.
   - Chief of Audit: how many full **executive REJECTS** (UNVERIFIED/MISLEADING) before the final **ACCEPT** (if stats say only one run, state that). Use the raw round log if present.
4) **Findings** — numbered. Each: observation, **risk** (Low/Medium/High), and **recommendation**.
5) **Relevancy vs today’s news** — a **0–100 score** (AI industry + timeliness). One line: **Relevancy grade: N/100** with brief justification, referencing how the piece lines up (or not) with the same-day pool / checklist.
6) **Final grade (news quality)** — assign one letter **A+ through F** with one paragraph justification. Also repeat **Relevancy: N/100** in that paragraph as a cross-check.
7) **Attestation** line — e.g. that this is your professional read based on the materials; limits of remote verification.

**Hard cap: about ${Math.floor(AUDITOR_REPORT_MAX_WORDS * 0.95)}–${AUDITOR_REPORT_MAX_WORDS} words** for the full email body. No "Subject:" line. Start with a formal greeting to "Boss" or "CEO" — one line only.

**Published title:** ${params.title}
**Run id:** ${params.runId}
**URL:** ${url}

${preWriterBlock}

**Round-by-round executive outputs (if any prior rejects):**
${roundsBlock || "Single run — use final audit only."}

**Final (publishable) audit text:**
${auditClip}

**Article excerpt (published draft):**
${bodyClip}
`,
      context: { kind: "news_auditor_published", slug: params.slug },
      assignedName: assigned,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    brief = `Audit report unavailable (${msg.slice(0, 120)}).\n\nRaw audit:\n${auditClip.slice(0, 1_200)}`;
  }

  const capped = clipNewsEmailWords(brief, AUDITOR_REPORT_MAX_WORDS);
  const sub = `[Xalura News] Audit & grade — ${params.title.slice(0, 64)}`;
  const textOut = finishChiefPlainBody(capped.replace(/\r\n/g, "\n").trim(), true);
  const htmlOut = wrapChiefEmailHtml({ bodyPlain: capped.replace(/\r\n/g, "\n").trim(), includeMemo: true });
  const ccRaw = (await resolveWorkerEnv("NEWS_TEAM_EMAIL_CC"))?.trim();
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
  logResendPub("chief_of_audit", r);
}

/**
 * Head of News: post-publish note on story quality + relevancy to today’s news (same env as before).
 */
export async function sendHeadOfNewsPublishedEmailIfEnabled(params: {
  cwd: string;
  runId: string;
  title: string;
  slug: string;
  postEmailContext?: NewsPublishPostEmailContext;
}): Promise<void> {
  const on = (await resolveWorkerEnv("HEAD_OF_NEWS_EMAIL_ON_PUBLISH"))?.trim().toLowerCase();
  if (on !== "true" && on !== "1") {
    logEmailSkip("head_of_news", "set HEAD_OF_NEWS_EMAIL_ON_PUBLISH=true (or 1) on the worker that runs the news pipeline");
    return;
  }
  const to =
    (await resolveWorkerEnv("HEAD_OF_NEWS_DIGEST_EMAIL"))?.trim() ||
    (await resolveWorkerEnv("AGENTIC_CHIEF_DIGEST_EMAIL"))?.trim() ||
    "";
  if (!to) {
    logEmailSkip(
      "head_of_news",
      "no recipient: set HEAD_OF_NEWS_DIGEST_EMAIL or AGENTIC_CHIEF_DIGEST_EMAIL",
    );
    return;
  }
  const from =
    (await resolveWorkerEnv("HEAD_OF_NEWS_RESEND_FROM"))?.trim() ||
    (await resolveWorkerEnv("CHIEF_RESEND_FROM"))?.trim() ||
    (await resolveWorkerEnv("RESEND_FROM"))?.trim() ||
    "";
  if (!from) {
    logEmailSkip(
      "head_of_news",
      "no From: set HEAD_OF_NEWS_RESEND_FROM or CHIEF_RESEND_FROM or RESEND_FROM",
    );
    return;
  }
  const hon = loadAgentNamesConfig(params.cwd).headOfNews?.name?.trim() || "Head of News";
  const url = publicSiteNewsUrl(params.slug);
  const ctx = params.postEmailContext;
  const dataBlock = ctx
    ? `
**Context for your judgment (read carefully):**
- Same-day pool size: **${ctx.newsPoolItemCount}** stories gathered. **Sample headlines in pool:** ${ctx.topPoolTitles}
- **30-item checklist (AI news; timeliness and beat):**
${ctx.checklistExcerpt.slice(0, 3_200)}
- **Published draft excerpt:**
${ctx.draftExcerpt.replace(/\s+/g, " ").trim().slice(0, 4_000)}
- **Independent Serp lines for the headline (reality check vs web):** ${ctx.serpForAudit.replace(/\s+/g, " ").trim().slice(0, 1_200)}
- Pipeline: Pre-Prod approved round **${ctx.preprod.passRound}** with **${ctx.preprod.rejectionsBeforePass}** pre-prod manager reject(s); Writer approved round **${ctx.writer.passRound}** with **${ctx.writer.rejectionsBeforePass}** writer-manager reject(s); **${ctx.audit.fullPipelineRounds}** end-to-end pipeline run(s) to audit; **${ctx.audit.executiveRejectionsBeforeSuccess}** executive not-verified run(s) before the final publishable verify.
`
    : "";

  let body: string;
  try {
    body = await runAgent({
      role: "Head of News",
      department: "News",
      task: `You are **${hon}**, **Head of News** at Xalura. A story is **now live** on the site. Write a **substantive email to the CEO ("Boss")** (not a tweet).

**You must include:**
- Opening greeting to Boss (one line).
- **Your professional read** on the publish: is the **angle** right, what works, one thing you would tighten next time (if any).
- **Relevancy vs "today’s news"**: explicitly state whether the piece **aligns** with the same-day AI / tech news cycle represented by the checklist and pool below — **yes / partially / no**, with 2–4 sentences. Give a one-line **Relevancy: N/100** (your editorial judgment vs current cycle).
- Include the public link, title, and run id once: **URL** ${url} | **Title:** ${params.title} | **Run:** ${params.runId}
- **Cap the body at ~${HON_PUBLISH_MAX_WORDS} words.** Clear paragraphs. No system boilerplate. No "Sent from…".

${dataBlock}
`,
      context: { kind: "head_of_news_published", slug: params.slug },
      assignedName: hon,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    body = `Published: ${params.title} — ${url} (Note: ${msg.slice(0, 80)})`;
  }
  const cap = clipNewsEmailWords(body, HON_PUBLISH_MAX_WORDS);
  const sub = `[Xalura News] Published + desk read: ${params.title.slice(0, 56)}`;
  const textOut = finishChiefPlainBody(cap.replace(/\r\n/g, "\n").trim(), true);
  const htmlOut = wrapChiefEmailHtml({ bodyPlain: cap.replace(/\r\n/g, "\n").trim(), includeMemo: true });
  const ccRaw = (await resolveWorkerEnv("NEWS_TEAM_EMAIL_CC"))?.trim();
  const cc = ccRaw
    ? ccRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;
  const rH = await sendResendEmail({
    from,
    to,
    cc,
    subject: sub.slice(0, 998),
    text: textOut,
    html: htmlOut,
  });
  logResendPub("head_of_news", rH);
}
