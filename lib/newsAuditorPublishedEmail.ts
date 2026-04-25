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
  /** Raw Chief of Audit model output (VERIFIED / reason). */
  auditText: string;
}): Promise<void> {
  const on = (await resolveWorkerEnv("NEWS_AUDITOR_EMAIL_ON_PUBLISH"))?.trim().toLowerCase();
  if (on !== "true" && on !== "1") {
    return;
  }
  const to =
    (await resolveWorkerEnv("NEWS_AUDITOR_DIGEST_EMAIL"))?.trim() ||
    (await resolveWorkerEnv("AGENTIC_CHIEF_DIGEST_EMAIL"))?.trim() ||
    "";
  if (!to) {
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
    return;
  }

  const configName = loadAgentNamesConfig(cwd).departments.news?.executive?.name?.trim();
  const assigned = configName || n;

  const url = publicSiteNewsUrl(params.slug);
  const bodyClip = params.bodyExcerpt.replace(/\s+/g, " ").trim().slice(0, 4_000);
  const auditClip = params.auditText.replace(/\s+/g, " ").trim().slice(0, 4_000);

  let brief: string;
  try {
    brief = await runAgent({
      role: "Executive",
      department: "News — Chief of Audit",
      task: `You are **${assigned}**, **Chief of Audit (News)**. A story was just **published** on the site. Write a short **email to the CEO** (plain sentences only) that:
1) States **VERIFIED or not** in one clear phrase from your audit.
2) Gives a **relevancy score 0–100** for this piece vs an **AI industry news** desk (industry + timeliness, not personal opinion). One line: **Relevancy: N/100** with 1 sentence why.
3) 2–4 short bullets: **legitimacy of sourcing**, **misleading risk** (low/med/high if any), **what you would watch next time**.

**Hard cap: 180 words** for the full email body. No subject line. No "Dear" if it wastes words — you may start with a direct header line.

**Published title:** ${params.title}
**Run id:** ${params.runId}
**URL:** ${url}

**Your audit output (raw):**
${auditClip}

**Draft excerpt (for context, may be long):**
${bodyClip}
`,
      context: { kind: "news_auditor_published", slug: params.slug },
      assignedName: assigned,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    brief = `Audit summary unavailable (${msg.slice(0, 100)}). Raw audit:\n${auditClip.slice(0, 500)}`;
  }

  const capped = clipNewsEmailWords(brief, 200);
  const sub = `[Xalura News] ${params.title.slice(0, 72)} — Chief of Audit report`;
  const textOut = finishChiefPlainBody(capped.replace(/\r\n/g, "\n").trim(), true);
  const htmlOut = wrapChiefEmailHtml({ bodyPlain: capped.replace(/\r\n/g, "\n").trim(), includeMemo: true });
  const ccRaw = (await resolveWorkerEnv("NEWS_TEAM_EMAIL_CC"))?.trim();
  const cc = ccRaw
    ? ccRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;

  await sendResendEmail({ from, to, cc, subject: sub.slice(0, 998), text: textOut, html: htmlOut });
}

/**
 * Optional one-liner from Head of News when a story ships (same recipient pattern as Chief digest).
 */
export async function sendHeadOfNewsPublishedEmailIfEnabled(params: {
  cwd: string;
  runId: string;
  title: string;
  slug: string;
}): Promise<void> {
  const on = (await resolveWorkerEnv("HEAD_OF_NEWS_EMAIL_ON_PUBLISH"))?.trim().toLowerCase();
  if (on !== "true" && on !== "1") {
    return;
  }
  const to =
    (await resolveWorkerEnv("HEAD_OF_NEWS_DIGEST_EMAIL"))?.trim() ||
    (await resolveWorkerEnv("AGENTIC_CHIEF_DIGEST_EMAIL"))?.trim() ||
    "";
  if (!to) {
    return;
  }
  const from =
    (await resolveWorkerEnv("HEAD_OF_NEWS_RESEND_FROM"))?.trim() ||
    (await resolveWorkerEnv("CHIEF_RESEND_FROM"))?.trim() ||
    (await resolveWorkerEnv("RESEND_FROM"))?.trim() ||
    "";
  if (!from) {
    return;
  }
  const hon = loadAgentNamesConfig(params.cwd).headOfNews?.name?.trim() || "Head of News";
  const url = publicSiteNewsUrl(params.slug);
  let body: string;
  try {
    body = await runAgent({
      role: "Head of News",
      department: "News",
      task: `You are **${hon}**, Head of News. The team just **published** this story. Write a **very short** email to the CEO (max 80 words): one line of greeting to "Boss", then 2–3 sentences on the story angle and that the run is live. Link: ${url} Title: ${params.title} Run: ${params.runId}`,
      context: { kind: "head_of_news_published", slug: params.slug },
      assignedName: hon,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    body = `Published: ${params.title} — ${url} (Note: ${msg.slice(0, 80)})`;
  }
  const cap = clipNewsEmailWords(body, 100);
  const sub = `[Xalura News] Live: ${params.title.slice(0, 72)}`;
  const textOut = finishChiefPlainBody(cap.replace(/\r\n/g, "\n").trim(), true);
  const htmlOut = wrapChiefEmailHtml({ bodyPlain: cap.replace(/\r\n/g, "\n").trim(), includeMemo: true });
  const ccRaw = (await resolveWorkerEnv("NEWS_TEAM_EMAIL_CC"))?.trim();
  const cc = ccRaw
    ? ccRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;
  await sendResendEmail({ from, to, cc, subject: sub.slice(0, 998), text: textOut, html: htmlOut });
}
