import {
  clipChiefEmailWords,
  finishChiefPlainBody,
  finishNewsAuditDigestPlainBody,
  pickChiefEmailOpeningSalutation,
  pickChiefEmailReplySalutation,
  wrapChiefEmailHtml,
  wrapNewsAuditDigestEmailHtml,
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
 * - **News** (`publishKind: "news"`): CC merges `CHIEF_EMAIL_CC` with desk inboxes: optional `CHIEF_NEWS_DESK_CC`, else `HEAD_OF_NEWS_DIGEST_EMAIL` + `NEWS_AUDITOR_DIGEST_EMAIL`, and always `richardmaybach@xaluratech.com`. Optional memo: `CHIEF_NEWS_MEMO_TO` / `CHIEF_NEWS_MEMO_FROM` / `CHIEF_NEWS_MEMO_CC_LINE` (body uses Richard’s signature block, not Ryzen’s).
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

const RICHARD_MAYBACH_CC = "richardmaybach@xaluratech.com";

function parseCommaEmails(s: string | undefined): string[] {
  return s?.split(",").map((x) => x.trim()).filter(Boolean) ?? [];
}

/** Merge and dedupe CC lists (case-insensitive), preserving first-seen casing. */
function mergeEmailCc(...lists: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const a of list) {
      const k = a.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(a);
    }
  }
  return out;
}

/**
 * News post-publish: `CHIEF_EMAIL_CC` plus **Head of News** + **Chief of Audit** (Richard Maybach) inboxes.
 * - `CHIEF_NEWS_DESK_CC` (comma-separated) lists extra desk addresses when you want to override/extend the default desk list.
 * - If `CHIEF_NEWS_DESK_CC` is unset, desk CC falls back to `HEAD_OF_NEWS_DIGEST_EMAIL` and `NEWS_AUDITOR_DIGEST_EMAIL` (when set).
 * - `richardmaybach@xaluratech.com` is always merged in (deduped) so the Chief of Audit is on the thread.
 */
async function buildNewsPublishCcList(): Promise<string[] | undefined> {
  const base = parseCommaEmails(await resolveWorkerEnv("CHIEF_EMAIL_CC"));
  const deskEnv = (await resolveWorkerEnv("CHIEF_NEWS_DESK_CC"))?.trim();
  let desk: string[];
  if (deskEnv) {
    desk = parseCommaEmails(deskEnv);
  } else {
    const hon = (await resolveWorkerEnv("HEAD_OF_NEWS_DIGEST_EMAIL"))?.trim();
    const aud = (await resolveWorkerEnv("NEWS_AUDITOR_DIGEST_EMAIL"))?.trim();
    desk = [hon, aud].filter(Boolean) as string[];
  }
  const merged = mergeEmailCc(base, desk, [RICHARD_MAYBACH_CC]);
  return merged.length ? merged : undefined;
}

/** Remove addresses that are already the primary `to` (avoids duplicate To+Cc). */
function ccExcludingTo(
  cc: string[] | undefined,
  to: string,
): string[] | undefined {
  if (!cc?.length) return undefined;
  const t = to.toLowerCase();
  const next = cc.filter((a) => a.toLowerCase() !== t);
  return next.length ? next : undefined;
}

async function buildNewsPublishMemoOverrides(): Promise<{
  to?: string;
  from?: string;
  ccLine?: string;
}> {
  const to =
    (await resolveWorkerEnv("CHIEF_NEWS_MEMO_TO"))?.trim() ||
    (await resolveWorkerEnv("CHIEF_EMAIL_MEMO_TO"))?.trim() ||
    "JhonCadullo@xaluratech.com";
  const from =
    (await resolveWorkerEnv("CHIEF_NEWS_MEMO_FROM"))?.trim() ||
    "richardmaybach@xaluratech.com";
  const ccLine =
    (await resolveWorkerEnv("CHIEF_NEWS_MEMO_CC_LINE"))?.trim() ||
    "Head of News; Chief of Audit, Richard Maybach; additional parties as shown in Resend Cc.";
  return { to, from, ccLine };
}

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
  const newsWarmOpen = pickChiefEmailReplySalutation();
  let body: string;
  let subject: string;
  try {
    if (isNews) {
      const rid = (params.newsRunId || params.slug).slice(0, 200);
      const raw = await runChiefAI({
        department: "All",
        task: `You are **${chiefN}** (Chief AI, Xalura Head of Operations) briefing the **CEO (Boss)**. A **News** story just went **live** (path: ${params.articlePath}). Run: ${rid}

**Voice & tone (critical):** Sound like a **confident, human operator** on the executive floor—**not** a Jira ticket, not stiff corporate bullet robots. The Boss should feel a warm, direct email: **your first line must be exactly (punctuation as given):** ${newsWarmOpen}
Then a short line break, then the rest. You may add one short human line after the opener (e.g. “good news on this run” / “I wanted you to see the craft behind this one”) before substance—keep it real, not sycophantic.

**Two voices in one message (plain text, human section titles—avoid numbered lists like "1)"):**
- **Narrative body (${chiefN} / desk):** The briefing below includes a **full pipeline narrative** (Pre-Production → Writer → Chief of Audit). You must walk the Boss through that **sequence** and, for **every** REJECT or non-VERIFIED step, give the **actual reason text** from the briefing (not just "round 2" or a run id). Cover what Head of News’s chain did from story pick to live URL, then a crisp “so what” for the company. Subheads in plain English (e.g. *What we shipped*, *Pre-Production*, *Writer desk*, *Audit*, *Risks*).
- **"From Richard Maybach, Chief of Audit" (mandatory, first person: I / my):** Write **as Richard Maybach in the first person.** Explain **why I approved** the piece, **how I verified** it is legitimate news and not fluff or fiction (cross-checks, recency, corroboration—only what the **briefing** supports; **do not fabricate** sources or URLs), **where the key facts were sourced or checked** (briefing fields, pools, serp, wire notes—name them only if the briefing does), my **relevancy score 0–100** for today’s news cycle, my **letter grade (A+–F)**, and **one or two candid sentences** on what I really think of the quality and the decision to ship. If the briefing is thin on a detail, say you’re drawing on the run record rather than inventing a channel.

**Do not** include a formal email signature (no “Phone:” lines); the system adds the footer.

**Length:** about **${Math.floor(NEWS_DIGEST_WORDS * 0.95)}–${NEWS_DIGEST_WORDS} words** total (full desk narrative + Richard’s block).

BRIEFING (facts; do not invent beyond this):
---
${briefing}
---`,
        context: { kind: "chief_news_publish_activity", slug: params.slug },
        assignedName: chiefN,
      });
      body = clipNewsEmailWords(raw, NEWS_DIGEST_WORDS);
      subject = `News live: ${params.title.slice(0, 64)} — desk + Chief of Audit`;
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

  const trimmed = body.replace(/\r\n/g, "\n").trim();
  const newsMemo = isNews ? await buildNewsPublishMemoOverrides() : undefined;
  const textOut = isNews
    ? finishNewsAuditDigestPlainBody(trimmed, true, newsMemo)
    : finishChiefPlainBody(trimmed, true);
  const htmlOut = isNews
    ? wrapNewsAuditDigestEmailHtml({
        bodyPlain: trimmed,
        includeMemo: true,
        memoOverrides: newsMemo,
      })
    : wrapChiefEmailHtml({ bodyPlain: trimmed, includeMemo: true });
  const fromChief =
    (await resolveWorkerEnv("CHIEF_RESEND_FROM"))?.trim() ||
    (await resolveWorkerEnv("RESEND_FROM"))?.trim();
  const cc = isNews
    ? ccExcludingTo(await buildNewsPublishCcList(), to)
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
