/**
 * New path only: **Chief AI** “publish outcome & what was logged” email to you.
 * Does not change or replace compliance, news desk, Zernio, or existing Chief publish digest
 * (`AGENTIC_CHIEF_EMAIL_ON_PUBLISH` + `AGENTIC_CHIEF_DIGEST_EMAIL`).
 *
 * Env: `AGENTIC_CHIEF_PUBLISH_OUTCOME_REPORT_EMAIL` — if unset, no work is scheduled.
 * Uses same Resend `from` and memo shell as other Chief digests.
 */

import {
  finishChiefPlainBody,
  pickChiefEmailReplySalutation,
  wrapChiefEmailHtml,
  clipChiefEmailWords,
} from "@/lib/chiefEmailBranding";
import { loadAgentNamesResolved } from "@/lib/loadAgentNamesResolved";
import { runChiefAI } from "../agents/chiefAI";
import { chiefDisplayName } from "./agentNames";
import { waitUntilAfterResponse } from "./cloudflareWaitUntil";
import { appendFailedOperation } from "./failedQueue";
import { readFailedQueue } from "./failedQueue";
import { sendResendEmail } from "./phase7Clients";
import { resolveWorkerEnv } from "./resolveWorkerEnv";
import type { DepartmentPipelineResult } from "./runDepartmentPipeline";

const OUTCOME_WORDS = 500;

export type ChiefPublishOutcomeCategory =
  | "success"
  | "technical"
  | "manager"
  | "executive"
  | "gate"
  | "configuration";

export type ChiefPublishOutcomeReportParams = {
  cwd: string;
  /** e.g. api agentic run, news cron, site publish */
  source: string;
  kind: "article" | "news";
  result: "ok" | "error" | "aborted" | "blocked" | "not_approved";
  titleLine: string;
  /** Grouping: manager reject vs exec vs site error — shown in the subject and facts. */
  category: ChiefPublishOutcomeCategory;
  /** Factual log lines (rejection text, error message, stage, paths). The model will not add facts. */
  bodyFacts: string;
};

/**
 * After **article** or **news** publish (or a failed / blocked / rejected attempt when you asked
 * to publish to site). Fire-and-forget; uses `waitUntil` on Cloudflare.
 */
export function scheduleChiefPublishOutcomeReport(
  params: ChiefPublishOutcomeReportParams,
): void {
  waitUntilAfterResponse(runChiefPublishOutcomeWork(params));
}

/**
 * When `POST /api/agentic/run` asked for `publishToSite` but the publishing pipeline
 * did not return `approved` (not waiting; blocked and non-approved both land here
 * for reporting when applicable — callers can choose).
 */
export function scheduleArticlePipelineNotPublishedReport(args: {
  cwd: string;
  task: string;
  result: DepartmentPipelineResult;
  source: string;
}): void {
  const { result, task, cwd, source } = args;
  if (result.status === "approved") return;

  let titleLine = task.replace(/\s+/g, " ").trim().slice(0, 120) || "Publishing run";
  let category: ChiefPublishOutcomeCategory;
  let body: string;
  if (result.status === "rejected") {
    category = "manager";
    titleLine = task.slice(0, 100);
    body = [
      `**Pipeline result:** not published (Manager rejected the final round).`,
      `**Rejection (final):** ${result.reason.replace(/\s+/g, " ").trim()}`,
      `**Manager line (excerpt):** ${result.managerOutput.replace(/\s+/g, " ").trim().slice(0, 800)}`,
    ].join("\n\n");
  } else if (result.status === "error") {
    category = "technical";
    body = `**Pipeline result:** error at stage \`${result.stage}\`\n**Message:** ${result.message.replace(/\s+/g, " ").trim()}`;
  } else if (result.status === "blocked") {
    category = "gate";
    body = `**Pipeline result:** blocked (gate or upstream handoff)\n**Reason:** ${result.reason.replace(/\s+/g, " ").trim()}`;
  } else if (result.status === "discarded") {
    category = "executive";
    const esc = (result as Extract<DepartmentPipelineResult, { status: "discarded" }>)
      .executiveEscalation;
    body = [
      "**Pipeline result:** discarded after manager rounds (Executive: DISCARD).",
      `**Manager rounds:** ${result.managerOutputs.length} manager output(s) on file; last escalation excerpt: ${(esc || "").replace(/\s+/g, " ").trim().slice(0, 1_200)}`,
    ].join("\n\n");
  } else if (result.status === "rejected_after_escalation") {
    category = "executive";
    const rae = result as Extract<
      DepartmentPipelineResult,
      { status: "rejected_after_escalation" }
    >;
    body = [
      "**Pipeline result:** not published after **Executive** escalation (final rejection).",
      `**Reason:** ${(rae.reason || "").replace(/\s+/g, " ").trim()}`,
      `**Escalation excerpt:** ${(rae.executiveEscalation || "").replace(/\s+/g, " ").trim().slice(0, 1_200)}`,
    ].join("\n\n");
  } else {
    category = "technical";
    body = `**Pipeline result (unexpected shape):** ${(result as { status?: string }).status || "unknown"}\n\`\`\`\n${JSON.stringify(result, null, 0).slice(0, 1_500)}\n\`\`\``;
  }

  const mapResult = (): "error" | "aborted" | "blocked" | "not_approved" => {
    if (result.status === "error") return "error";
    if (result.status === "blocked") return "blocked";
    if (result.status === "discarded" || result.status === "rejected_after_escalation") {
      return "aborted";
    }
    return "not_approved";
  };

  scheduleChiefPublishOutcomeReport({
    cwd,
    source,
    kind: "article",
    result: mapResult(),
    titleLine,
    category,
    bodyFacts: [`**Task (truncated):** ${task.slice(0, 1_200)}`, "", body].join("\n"),
  });
}

async function runChiefPublishOutcomeWork(
  p: ChiefPublishOutcomeReportParams,
): Promise<void> {
  const to = (await resolveWorkerEnv("AGENTIC_CHIEF_PUBLISH_OUTCOME_REPORT_EMAIL"))?.trim();
  if (!to) return;

  const rawFlag = (await resolveWorkerEnv("AGENTIC_CHIEF_OUTCOME_GEMINI"))?.trim();
  const from =
    (await resolveWorkerEnv("CHIEF_RESEND_FROM"))?.trim() ||
    (await resolveWorkerEnv("RESEND_FROM"))?.trim();
  const nameCfg = await loadAgentNamesResolved(p.cwd);
  if (!from) {
    appendFailedOperation(
      {
        kind: "other",
        message: "Chief publish outcome: missing CHIEF_RESEND_FROM / RESEND_FROM",
        detail: p.source,
      },
      p.cwd,
    );
    return;
  }

  const gemFlag = rawFlag?.trim().toLowerCase() ?? "";
  const useGem = gemFlag !== "0" && gemFlag !== "false";
  const chiefN = chiefDisplayName(p.cwd, nameCfg);
  const tail = readFailedQueue(p.cwd)
    .slice(-8)
    .map(
      (f) =>
        `- [${f.ts}] ${f.kind}: ${f.message}${
          f.detail ? ` — ${f.detail.replace(/\s+/g, " ").slice(0, 140)}` : ""
        }`,
    );
  const failQ =
    tail.length > 0
      ? `**Failed-queue tail (this runtime):**\n${tail.join("\n")}`
      : "(no rows in local failed queue for this run window.)";
  const facts = [
    p.bodyFacts,
    "",
    `**Class:** ${p.category} · **Result:** ${p.result} · **Source:** ${p.source}`,
    "",
    failQ,
  ]
    .join("\n\n")
    .replace(/\r\n/g, "\n")
    .trim();

  const sal = pickChiefEmailReplySalutation();
  let main: string;
  if (useGem) {
    try {
      const raw = await runChiefAI({
        department: "All",
        task: `You are **${chiefN}**, **Chief AI / Head of Operations** (same voice as the CEO-facing Chief emails). The Boss must receive a **reliable, calm status note** with **no invented facts**.

**First line of the body must be exactly:** ${sal}

Then: short sections with headings. You must:
1. State clearly whether the operation **succeeded or did not** (${p.result}, category ${p.category}).
2. For **${p.kind}**, quote or paraphrase only from FACTS (rejections, stages, error messages, paths). If something is unknown, say so.
3. Explain *where this is recorded* in plain terms (pipeline stage, run id in FACTS, failed queue lines below if relevant).
4. Distinguish **manager / writer** rejection vs **executive / Chief of Audit** decision vs **technical** (API, Supabase, upload) using only FACTS.
5. Close in one line — no new signature; memo wrapper adds it.

**FACTS (source of truth):**
---
${facts.slice(0, 12_000)}
---`,
        context: { kind: "chief_publish_outcome_report", channel: p.kind, result: p.result },
        assignedName: chiefN,
      });
      main = clipChiefEmailWords(raw, OUTCOME_WORDS * 2);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      main = `Outcome note (Gemini unavailable: ${msg.slice(0, 200)}.)\n\n${facts}`.replace(
        /\r\n/g,
        "\n",
      );
    }
  } else {
    main = facts;
  }

  const trimmed = main.replace(/\r\n/g, "\n").trim();
  const subj = `[Xalura] Outcome: ${p.kind} — ${
    p.titleLine
  } (${p.result}; ${p.category})`.replace(/\n/g, " ").slice(0, 200);
  const text = finishChiefPlainBody(trimmed, true);
  const html = wrapChiefEmailHtml({ bodyPlain: trimmed, includeMemo: true });
  const sent = await sendResendEmail({ from, to, subject: subj, text, html });
  if (sent.error) {
    appendFailedOperation(
      {
        kind: "other",
        message: `Chief publish outcome report: ${sent.error}`,
        detail: to,
      },
      p.cwd,
    );
  }
}
