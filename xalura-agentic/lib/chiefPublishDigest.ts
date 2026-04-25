import {
  clipChiefEmailWords,
  finishChiefPlainBody,
  wrapChiefEmailHtml,
} from "@/lib/chiefEmailBranding";
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
 */
export function scheduleChiefPublishCycleEmail(params: ChiefPublishDigestParams): void {
  waitUntilAfterResponse(runChiefPublishDigestWork(params));
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

  const briefing = [
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

  const chiefN = chiefDisplayName(params.cwd);
  let body: string;
  try {
    const raw = await runChiefAI({
      department: "All",
      task: `You are **Ryzen Qi**, **CAI | Head of Operations**. Publishing just shipped an article to the site. Write one email to the CEO.

**Your entire body must be at most 30 words.** One or two short sentences. Name the article/theme, one line on quality or risk if the briefing shows it, nothing else. No run codes, no sections, no signature.

BRIEFING:
---
${briefing}
---`,
      context: { kind: "publish_digest", slug: params.slug },
      assignedName: chiefN,
    });
    body = clipChiefEmailWords(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    body = clipChiefEmailWords(
      `Published “${params.title.slice(0, 60)}” — note gen failed: ${msg.slice(0, 80)}. Check dashboard.`,
    );
  }

  const subject = `Published: ${params.title.slice(0, 72)} — Chief note`;
  const textOut = finishChiefPlainBody(body.replace(/\r\n/g, "\n").trim(), true);
  const htmlOut = wrapChiefEmailHtml({
    bodyPlain: body.replace(/\r\n/g, "\n").trim(),
    includeMemo: true,
  });
  const fromChief =
    (await resolveWorkerEnv("CHIEF_RESEND_FROM"))?.trim() ||
    (await resolveWorkerEnv("RESEND_FROM"))?.trim();
  const sent = await sendResendEmail({
    from: fromChief,
    to,
    subject: `[Xalura] ${subject}`,
    text: textOut,
    html: htmlOut,
  });
  if (sent.error) {
    appendFailedOperation({
      kind: "other",
      message: `Chief publish digest Resend: ${sent.error}`,
      detail: `to=${to}`,
    });
  }
}
