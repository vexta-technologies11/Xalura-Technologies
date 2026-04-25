import { finishChiefPlainBody, wrapChiefEmailHtml } from "@/lib/chiefEmailBranding";
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
    body = await runChiefAI({
      department: "All",
      task: `You are **Ryzen Qi** — **CAI | Head of Operations** at Xalura Tech. A **live article** from Publishing just went out to the public site. Write an email to the CEO.

**Voice:** Like a strong COO / chief of staff — clear, professional, a little warmth. You may start with a short "Hello, Boss" style line. Sound human: one sentence on what shipped and why it matters for our line, not a status robot.

**Structure (plain text, no markdown tables, no section labels in ALL CAPS):**
1) One short opening (greeting + what published).
2) A tight read on this drop (angle, quality, fit for Xalura’s motion) — only what the briefing supports.
3) Risks or follow-ups in plain language (failure queue, Zernio line). If nothing serious, say so in one line.

**Do not** paste internal run codes, approval instructions, or long technical dumps unless the briefing already shows a concrete blocker worth naming.

Max ~350 words. No email signature (added separately).

BRIEFING:
---
${briefing}
---`,
      context: { kind: "publish_digest", slug: params.slug },
      assignedName: chiefN,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    body = `Hello, Boss — I hit a snag generating the full note (${msg}). Here’s the raw briefing so nothing’s lost:\n\n${briefing.slice(0, 6_000)}`;
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
