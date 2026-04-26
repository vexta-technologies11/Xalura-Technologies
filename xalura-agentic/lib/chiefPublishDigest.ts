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
import { chiefDisplayName, getExecutiveAssignedName } from "./agentNames";
import { loadAgentNamesResolved } from "@/lib/loadAgentNamesResolved";
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
  /** Full Publishing Manager output for this approval (APPROVED + reasons). */
  managerOutputFull?: string;
  /** Manager rejection reasons in the winning phase before the final APPROVE (if any). */
  managerRejectionHistory?: string[];
  /** Number of executive rewrite phases (0 = none) before final approval. */
  escalationPhaseIndex?: number;
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
const NEWS_AUDIT_DIGEST_WORDS = 1_250;
/** Article post-publish: comprehensive CEO note (cap). */
const CHIEF_ARTICLE_PUBLISH_MAX_WORDS = 1_200;

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

async function buildNewsPublishMemoOverrides(opts?: {
  fromOverride?: string;
  ccLineOverride?: string;
}): Promise<{
  to?: string;
  from?: string;
  ccLine?: string;
}> {
  const to =
    (await resolveWorkerEnv("CHIEF_NEWS_MEMO_TO"))?.trim() ||
    (await resolveWorkerEnv("CHIEF_EMAIL_MEMO_TO"))?.trim() ||
    "JhonCadullo@xaluratech.com";
  const from =
    opts?.fromOverride?.trim() ||
    (await resolveWorkerEnv("CHIEF_NEWS_MEMO_FROM"))?.trim() ||
    "richardmaybach@xaluratech.com";
  const ccLine =
    opts?.ccLineOverride?.trim() ||
    (await resolveWorkerEnv("CHIEF_NEWS_MEMO_CC_LINE"))?.trim() ||
    "Head of News; Chief of Audit, Richard Maybach; additional parties as shown in Resend Cc.";
  return { to, from, ccLine };
}

async function resolveNewsAuditResendFrom(): Promise<string> {
  return (
    (await resolveWorkerEnv("CHIEF_NEWS_AUDIT_RESEND_FROM"))?.trim() ||
    (await resolveWorkerEnv("CHIEF_OF_AUDIT_NEWS_RESEND_FROM"))?.trim() ||
    (await resolveWorkerEnv("CHIEF_RESEND_FROM"))?.trim() ||
    (await resolveWorkerEnv("RESEND_FROM"))?.trim() ||
    "richardmaybach@xaluratech.com"
  );
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

  const hist = (params.managerRejectionHistory ?? []).filter(Boolean);
  const histBlock =
    hist.length > 0
      ? hist.map((r, i) => `  ${i + 1}. ${r.replace(/\s+/g, " ").trim()}`).join("\n")
      : "  (none — Manager approved on first try, or no prior rejections recorded in this phase.)";
  const mgrFull = (params.managerOutputFull ?? "").trim();

  const baseBriefing = [
    `Original task (truncated):\n${params.task.slice(0, 900)}`,
    "",
    `Published: ${params.title}`,
    `URL path: ${params.articlePath} (slug: ${params.slug})`,
    "",
    `Cycle: index ${params.cycleIndex}, file ${params.cycleFileRelative}, auditTriggered=${params.auditTriggered}`,
    `Manager review rounds (total, all phases): ${params.managerAttempts}`,
    `Executive rewrite phases used before final approval: ${params.escalationPhaseIndex ?? 0}`,
    "",
    "Manager REJECTION rounds before final APPROVE (this winning phase only):",
    histBlock,
    "",
    "Final Manager output (full — line 1 should be APPROVED or REJECTED):",
    mgrFull
      ? mgrFull.slice(0, 12_000)
      : "(not provided — see executive summary and worker excerpt only.)",
    "",
    "Executive (Publishing) — stored summary after Manager approved (what the Executive said was being committed):",
    params.executiveSummary.slice(0, 3500),
    "",
    "Worker final draft (excerpt, markdown):",
    params.workerOutputExcerpt.slice(0, 5000),
    "",
    `Zernio: ${params.zernioLine}`,
    "",
    "Recent failures (failed queue tail, for ops context only):",
    failBlock,
  ].join("\n");

  const newsBriefingExtra = (params.newsActivityBriefing || "").trim();
  const isNews = params.publishKind === "news";
  const briefing = isNews && newsBriefingExtra
    ? `${baseBriefing}\n\n--- NEWS ACTIVITY (full) ---\n${newsBriefingExtra}`
    : isNews
      ? `${baseBriefing}\n\n--- NEWS: no extended briefing string ---\n`
      : baseBriefing;

  const nameCfg = await loadAgentNamesResolved(params.cwd);
  const chiefN = chiefDisplayName(params.cwd, nameCfg);
  const openLine = pickChiefEmailOpeningSalutation();
  const newsWarmOpen = pickChiefEmailReplySalutation();
  let body: string;
  let subject: string;
  try {
    if (isNews) {
      const rid = (params.newsRunId || params.slug).slice(0, 200);
      const opsFrom =
        (await resolveWorkerEnv("CHIEF_RESEND_FROM"))?.trim() ||
        (await resolveWorkerEnv("RESEND_FROM"))?.trim() ||
        "RyzenQi@xaluratech.com";
      const auditFrom = await resolveNewsAuditResendFrom();
      const opsMemo = await buildNewsPublishMemoOverrides({ fromOverride: opsFrom });
      const auditMemo = await buildNewsPublishMemoOverrides({
        fromOverride: auditFrom,
      });
      const cc = ccExcludingTo(await buildNewsPublishCcList(), to);

      let opsRaw = "";
      try {
        opsRaw = await runChiefAI({
          department: "All",
          task: `You are **${chiefN}** (Chief AI, Xalura Head of Operations) briefing the **CEO (Boss)**. A **News** story just went **live** (path: ${params.articlePath}). Run: ${rid}

Write a **human, executive email** with **clear paragraph breaks** and short section headings. Do not compress everything into one block.

**Voice & tone:** confident, warm, direct, and natural. The Boss should feel greeted like a real person. Use the opener exactly as given, then add 1 short sentence of warmth if it fits.
**First line of the body must be exactly:** ${newsWarmOpen}

**Must cover in order:**
1. What shipped.
2. Pre-Production: the selected story, each reject, and the reason behind it.
3. Writer desk: each reject and the reason behind it.
4. Chief of Audit: what was verified, why it was approved, what issues were caught, and the final outcome.
5. Risks / watch and a short close.

Use the briefing facts only. If a reason or source is not in the briefing, say so plainly rather than inventing it.

BRIEFING:
---
${briefing}
---`,
          context: { kind: "chief_news_publish_activity_ops", slug: params.slug },
          assignedName: chiefN,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        opsRaw = `Operations note unavailable: ${msg.slice(0, 120)}.\n\nBriefing:\n${briefing}`;
      }
      const opsBody = clipNewsEmailWords(opsRaw, NEWS_DIGEST_WORDS).replace(/\r\n/g, "\n").trim();
      const opsSubject = `News live: ${params.title.slice(0, 64)} — operations`;
      const opsText = finishChiefPlainBody(opsBody, true, opsMemo);
      const opsHtml = wrapChiefEmailHtml({
        bodyPlain: opsBody,
        includeMemo: true,
        memoOverrides: opsMemo,
      });

      const auditDisplayName = getExecutiveAssignedName("news", params.cwd, undefined, nameCfg) || "Richard Maybach";
      let auditRaw = "";
      try {
        auditRaw = await runChiefAI({
          department: "All",
          task: `You are **${auditDisplayName}**, **Chief of Audit** for News briefing the **CEO (Boss)**. A **News** story just went **live** (path: ${params.articlePath}). Run: ${rid}

Write as the **Chief of Audit** in the first person. Use **clear sentence breaks** and short sections so the Boss can read it quickly.

**First line of the body should be a warm greeting to the Boss.**

**You must include:**
1. Your audit judgment and the score.
2. Why you approved it.
3. How you verified it was real news.
4. Where you got or cross-checked the facts.
5. The final grade and what you honestly think of the piece.

Use only the briefing below. Do not invent sources, channels, or URLs.

BRIEFING:
---
${briefing}
---`,
          context: { kind: "chief_news_publish_activity_audit", slug: params.slug },
          assignedName: auditDisplayName,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        auditRaw = `Audit note unavailable: ${msg.slice(0, 120)}.\n\nBriefing:\n${briefing}`;
      }
      const auditBody = clipNewsEmailWords(auditRaw, NEWS_AUDIT_DIGEST_WORDS)
        .replace(/\r\n/g, "\n")
        .trim();
      const auditSubject = `News live: ${params.title.slice(0, 64)} — Chief of Audit`;
      const auditText = finishNewsAuditDigestPlainBody(auditBody, true, auditMemo);
      const auditHtml = wrapNewsAuditDigestEmailHtml({
        bodyPlain: auditBody,
        includeMemo: true,
        memoOverrides: auditMemo,
      });

      const [opsRes, auditRes] = await Promise.allSettled([
        sendResendEmail({
          from: opsFrom,
          to,
          cc,
          subject: `[Xalura] ${opsSubject}`,
          text: opsText,
          html: opsHtml,
        }),
        sendResendEmail({
          from: auditFrom,
          to,
          cc,
          subject: `[Xalura] ${auditSubject}`,
          text: auditText,
          html: auditHtml,
        }),
      ]);

      const reportSendResult = (kind: string, result: PromiseSettledResult<{ id?: string; error?: string }>) => {
        if (result.status === "rejected") {
          appendFailedOperation({
            kind: "other",
            message: `Chief publish digest ${kind} threw`,
            detail: String(result.reason).slice(0, 400),
          });
          return;
        }
        if (result.value.error) {
          appendFailedOperation({
            kind: "other",
            message: `Chief publish digest ${kind}: ${result.value.error}`,
            detail: `to=${to}${isNews ? " (news)" : ""}`,
          });
          return;
        }
        console.log(
          `[chief-publish-digest] news ${kind} sent`,
          result.value.id ? `resend_id=${result.value.id}` : "(no id)",
        );
      };
      reportSendResult("operations", opsRes);
      reportSendResult("audit", auditRes);
      return;
    } else {
      const raw = await runChiefAI({
        department: "All",
        task: `You are **Ryzen Qi**, **CAI | Head of Operations** at Xalura. An **article** was just published to the public site. Write **one comprehensive email to the CEO (Boss)** in a confident, executive, CEO-appropriate tone — warm, direct, no stilted jargon clumps, no emojis.

**First line of the body must be exactly (punctuation as given):** ${openLine}

**Length:** up to **${CHIEF_ARTICLE_PUBLISH_MAX_WORDS} words** total, including the first line. (Use the full budget only when the cycle had multiple review rounds; otherwise be concise but complete.)

**You must cover, in order, with clear subheadings or short titled sections the Boss can scan:**
1. **What published** — title, URL path, one-line what it is for readers.
2. **Cycle** — which cycle / log file, whether the 10-cycle **Chief audit** window triggered, and what that means for governance.
3. **Manager & Executive story** — For each **manager rejection** in the briefing, what was wrong and what changed before the next draft. The **final Manager** decision: APPROVE vs path to approval, with **why** (checklist, keyword, tone, handoff, etc.). What the **Executive summary** said was being stored and why that matters.
4. **Why this was safe to ship** — tie to the Executive summary and the final manager approval.
5. **Residual risks / follow-ups** — if any, including Zernio, failed-queue noise, or anything in the briefing worth watching.
6. If the failed-queue section shows **recent integration errors**, state that you are **empowered to drive fixes** without re-asking the CEO for day-to-day pipeline repairs (per your remit) — one sentence.

Use only the BRIEFING for factual claims. If a fact is missing, say so. Do not invent URLs or people not implied by the briefing. No signature line (memo wrapper adds branding).

BRIEFING:
---
${briefing}
---`,
        context: { kind: "publish_digest", slug: params.slug, longFormArticle: true },
        assignedName: chiefN,
      });
      body = clipChiefEmailWords(raw, CHIEF_ARTICLE_PUBLISH_MAX_WORDS);
      subject = `Published: ${params.title.slice(0, 72)} — Chief brief`;
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
