import {
  clipChiefEmailWords,
  finishChiefPlainBody,
  pickChiefEmailOpeningSalutation,
  wrapChiefEmailHtml,
} from "@/lib/chiefEmailBranding";
import { clipNewsEmailWords } from "@/lib/newsTeamEmailSend";
import { runChiefAI } from "../agents/chiefAI";
import { waitUntilAfterResponse } from "./cloudflareWaitUntil";
import { appendFailedOperation, readFailedQueue } from "./failedQueue";
import { chiefDisplayName } from "./agentNames";
import { sendResendEmail } from "./phase7Clients";
import { resolveWorkerEnv } from "./resolveWorkerEnv";

export type ChiefPublishDigestParams = {
  cwd: string;
  task: string;
  title: string;
  slug: string;
  articlePath: string;
  executiveSummary: string;
  workerOutputExcerpt: string;
  managerAttempts: number;
  cycleIndex: number;
  auditTriggered: boolean;
  cycleFileRelative: string;
  /** One-line Zernio outcome for this publish. */
  zernioLine: string;
  /**
   * When `"news"`, use the long News-activity prompt + `newsActivityBriefing` (same env + Resend as article).
   * Omit or `"article"` for the default short article note (unchanged).
   */
  publishKind?: "article" | "news";
  /** From `buildNewsPublishActivityExtendedBriefing` — pre-prod/writer reject reasons, audit rounds, etc. */
  newsActivityBriefing?: string;
  /** Pipeline run id for news context line in the model task. */
  newsRunId?: string;
};

/**
 * After a successful site publish — optional Chief email (async, does not block the HTTP response).
 *
 * Env:
 * - `AGENTIC_CHIEF_EMAIL_ON_PUBLISH` = `true` | `1`
 * - `AGENTIC_CHIEF_DIGEST_EMAIL` — recipient (same as audit digest)
 * - `RESEND_API_KEY` (+ optional `RESEND_FROM`)
 * - `GEMINI_API_KEY` — Chief summary is richer with live Gemini; stub otherwise
 *
 * Uses Cloudflare `waitUntil` when available so the Worker is not frozen before Resend/Gemini finish.
 *
 * **News:** set `publishKind: "news"` and `newsActivityBriefing` from
 * `buildNewsPublishActivityExtendedBriefing` — same env flags and send path as articles.
 */
export function scheduleChiefPublishCycleEmail(params: ChiefPublishDigestParams): void {
  waitUntilAfterResponse(runChiefPublishDigestWork(params));
}

const NEWS_DIGEST_WORDS = 1_600;

async function runChiefPublishDigestWork(params: ChiefPublishDigestParams): Promise<void> {
  const flag = (await resolveWorkerEnv("AGENTIC_CHIEF_EMAIL_ON_PUBLISH"))?.trim().toLowerCase();
  if (flag !== "true" && flag !== "1") return;
  const to = (await resolveWorkerEnv("AGENTIC_CHIEF_DIGEST_EMAIL"))?.trim();
  if (!to) return;

  const recentFails = readFailedQueue(params.cwd).slice(-10);
  const failBlock =
    recentFails.length === 0
      ? "(No rows in failed queue in this runtime window.)"
      : recentFails
          .map(
            (f) =>
              `- [${f.ts}] ${f.kind}: ${f.message}${f.detail ? ` | ${f.detail.replace(/\s+/g, " ").slice(0, 180)}` : ""}`,
          )
          .join("\n");

  const baseBriefing = [
    `Original task (truncated):\n${params.task.slice(0, 900)}`,
    "",
    `Published: ${params.title}`,
    `URL path: ${params.articlePath} (slug: ${params.slug})`,
    "",
    `Cycle: index ${params.cycleIndex}, file ${params.cycleFileRelative}, auditTriggered=${params.auditTriggered}`,
    `Manager attempts this run: ${params.managerAttempts}`,
    "",
    `Zernio: ${params.zernioLine}`,
    "",
    "Executive summary (from this pipeline run):",
    params.executiveSummary.slice(0, 2500),
    "",
    "Worker output (excerpt):",
    params.workerOutputExcerpt.slice(0, 3500),
    "",
    "Recent failures (failed queue, newest at bottom):",
    failBlock,
  ].join("\n");

  const newsBriefingExtra = (params.newsActivityBriefing || "").trim();
  const isNews = params.publishKind === "news";
  const briefing = isNews && newsBriefingExtra
    ? `${baseBriefing}\n\n--- NEWS ACTIVITY (full) ---\n${newsBriefingExtra}`
    : isNews
      ? `${baseBriefing}\n\n--- NEWS: no extended briefing string ---\n`
      : baseBriefing;

  const chiefN = chiefDisplayName(params.cwd);
  const openLine = pickChiefEmailOpeningSalutation();
  let body: string;
  let subject: string;
  try {
    if (isNews) {
      const rid = (params.newsRunId || params.slug).slice(0, 200);
      const raw = await runChiefAI({
        department: "All",
        task: `You are **${chiefN}** (Chief AI, Xalura Head of Operations). A **News department** story was just **published live** (web path: ${params.articlePath}). The CEO (Boss) receives this via the same Chief post-publish path as /articles. Run: ${rid}

**Write as the authoritative Chief:** first line a greeting to Boss, then a **scannable activity report** so they see manager rejections with **reasons**, writer revisions, and final audit.

**You must include these sections in order (plain text, clear headers):**
1) **What shipped** — title, one line on angle, public URL, run id.
2) **Pre-Production** — picks and **each manager REJECT with reason and round** when the briefing shows rejections.
3) **Writer desk** — passes and **rejects with reasons** if any.
4) **Chief of Audit (executive)** — pipeline tries if more than one; final outcome; **relevancy 0–100** vs today’s news cycle; **letter grade (A+–F)**.
5) **Risks / watch** — one line.
6) **Close** — you are the single line of sight for News on Xalura for this run.

**Hard cap ~${Math.floor(NEWS_DIGEST_WORDS * 0.95)}–${NEWS_DIGEST_WORDS} words** (this is a full desk report, not the 100-word article note).

BRIEFING (facts; do not invent):
---
${briefing}
---`,
        context: { kind: "chief_news_publish_activity", slug: params.slug },
        assignedName: chiefN,
      });
      body = clipNewsEmailWords(raw, NEWS_DIGEST_WORDS);
      subject = `News live: ${params.title.slice(0, 64)} — Chief full activity`;
    } else {
      const raw = await runChiefAI({
        department: "All",
        task: `You are **Ryzen Qi**, **CAI | Head of Operations**. Publishing just shipped an article to the site. Write one email to the CEO.

**Your first line of the body must be exactly (punctuation as given):** ${openLine}
**Your entire body must be at most 100 words, including that first line.** Add what matters: article/theme, quality or risk if the briefing shows it. No run codes, no extra sections, no signature line.

BRIEFING:
---
${briefing}
---`,
        context: { kind: "publish_digest", slug: params.slug },
        assignedName: chiefN,
      });
      body = clipChiefEmailWords(raw);
      subject = `Published: ${params.title.slice(0, 72)} — Chief note`;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isNews) {
      body = clipNewsEmailWords(
        `News published: “${params.title.slice(0, 60)}” — ${params.articlePath} — note gen failed: ${msg.slice(0, 120)}. Check dashboard and Observability logs.`,
        NEWS_DIGEST_WORDS,
      );
      subject = `News live: ${params.title.slice(0, 64)} — Chief (fallback note)`;
    } else {
      body = clipChiefEmailWords(
        `Published “${params.title.slice(0, 60)}” — note gen failed: ${msg.slice(0, 80)}. Check dashboard.`,
      );
      subject = `Published: ${params.title.slice(0, 72)} — Chief note`;
    }
  }

  const textOut = finishChiefPlainBody(body.replace(/\r\n/g, "\n").trim(), true);
  const htmlOut = wrapChiefEmailHtml({
    bodyPlain: body.replace(/\r\n/g, "\n").trim(),
    includeMemo: true,
  });
  const fromChief =
    (await resolveWorkerEnv("CHIEF_RESEND_FROM"))?.trim() ||
    (await resolveWorkerEnv("RESEND_FROM"))?.trim();
  const ccRaw = isNews ? (await resolveWorkerEnv("CHIEF_EMAIL_CC"))?.trim() : undefined;
  const cc = ccRaw
    ? ccRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;
  const sent = await sendResendEmail({
    from: fromChief,
    to,
    cc,
    subject: `[Xalura] ${subject}`,
    text: textOut,
    html: htmlOut,
  });
  if (sent.error) {
    appendFailedOperation({
      kind: "other",
      message: `Chief publish digest Resend: ${sent.error}`,
      detail: `to=${to}${isNews ? " (news)" : ""}`,
    });
  } else if (isNews) {
    console.log(
      "[chief-publish-digest] news path sent",
      sent.id ? `resend_id=${sent.id}` : "(no id)",
    );
  }
}
