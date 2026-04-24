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
      task: `A Publishing article was just approved and published to the public site.

You must write the **body of an email** to leadership (plain text, no markdown tables). Use exactly these labeled sections in order:

Cycle production
One tight paragraph: what shipped this run and how it fits our publishing motion.

Failures and risks
Bullet or short lines: anything concerning from the failure list, Zernio line, or pipeline signals. If nothing material, say "Nothing blocking noted."

Chief read
One short paragraph: your direct gut read on this cycle (energy, quality, discipline).

Stay under 400 words total. Be specific to the briefing; do not invent URLs or metrics not shown.

BRIEFING:
---
${briefing}
---`,
      context: { kind: "publish_digest", slug: params.slug },
      assignedName: chiefN,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    body = `[Chief AI call failed: ${msg}]\n\n---\n${briefing}`;
  }

  const subject = `[Xalura agentic] Published — ${params.title.slice(0, 72)}`;
  const sent = await sendResendEmail({ to, subject, text: body });
  if (sent.error) {
    appendFailedOperation({
      kind: "other",
      message: `Chief publish digest Resend: ${sent.error}`,
      detail: `to=${to}`,
    });
  }
}
