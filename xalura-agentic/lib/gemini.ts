/**
 * Agent LLM entrypoint — **stub** when `GEMINI_API_KEY` is unset.
 * When set, uses `@google/generative-ai` with timeout + retries (Phase 6).
 *
 * Env (optional):
 * - `AGENTIC_GEMINI_TIMEOUT_MS` (default 60000)
 * - `AGENTIC_GEMINI_RETRIES` (default 3)
 */

import { appendFailedOperation } from "./failedQueue";
import { withRetries, withTimeout } from "./watchdog";

export type RunAgentParams = {
  role: string;
  department: string;
  task: string;
  context?: unknown;
  cycleLog?: string;
};

export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY?.trim();
}

function geminiTimeoutMs(): number {
  const n = Number(process.env.AGENTIC_GEMINI_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : 60_000;
}

function geminiRetryCount(): number {
  const n = Number(process.env.AGENTIC_GEMINI_RETRIES);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 3;
}

function buildPrompt(params: RunAgentParams): string {
  const ctx =
    params.context !== undefined
      ? typeof params.context === "string"
        ? params.context
        : JSON.stringify(params.context, null, 2)
      : "";
  const cycle =
    params.cycleLog != null && params.cycleLog.length > 0
      ? `Current cycle context:\n${params.cycleLog.slice(0, 8000)}`
      : "";
  return [
    `You are a ${params.role} in the ${params.department} department of Xalura Tech.`,
    `You operate within a strict hierarchy: Worker → Manager → Executive → Chief AI.`,
    `You do not have a personal name unless assigned in config — identify by role and department.`,
    `Respond in clear markdown unless asked for JSON.`,
    ``,
    `## Task`,
    params.task,
    ctx ? `\n## Context\n${ctx}` : "",
    cycle ? `\n## Cycle\n${cycle}` : "",
  ]
    .filter((s) => s !== "")
    .join("\n");
}

function runAgentStub(params: RunAgentParams): string {
  const ctx =
    params.cycleLog != null && params.cycleLog.length > 0
      ? `\n\n---\nContext (truncated):\n${params.cycleLog.slice(0, 2000)}`
      : "";
  if (params.role === "Manager") {
    return [
      `APPROVED`,
      `Stub manager pass-through for ${params.department} (no GEMINI_API_KEY).`,
      ``,
      `_Set GEMINI_API_KEY for live review._`,
    ].join("\n");
  }
  return [
    `# Stub agent output`,
    ``,
    `- **Role:** ${params.role}`,
    `- **Department:** ${params.department}`,
    ``,
    `## Task`,
    params.task,
    ``,
    `_Architecture-only mode: no Gemini call. Set GEMINI_API_KEY for live API._`,
    ctx,
  ].join("\n");
}

async function runGeminiLive(params: RunAgentParams): Promise<string> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const key = process.env.GEMINI_API_KEY!.trim();
  const modelName =
    process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: modelName });
  const prompt = buildPrompt(params);
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("Empty Gemini response");
  }
  return text;
}

async function runGeminiLiveResilient(params: RunAgentParams): Promise<string> {
  const ms = geminiTimeoutMs();
  const attempts = geminiRetryCount();
  return withRetries(
    () =>
      withTimeout(ms, `Gemini|${params.role}|${params.department}`, () =>
        runGeminiLive(params),
      ),
    { maxAttempts: attempts, label: "gemini" },
  );
}

export async function runAgent(params: RunAgentParams): Promise<string> {
  if (isGeminiConfigured()) {
    try {
      return await runGeminiLiveResilient(params);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[xalura-agentic] Gemini failed after retries (${msg}) — stub + failed queue.`);
      appendFailedOperation({
        kind: "gemini",
        message: msg,
        detail: `${params.role} / ${params.department}: ${params.task.slice(0, 240)}`,
      });
      return runAgentStub(params);
    }
  }
  return runAgentStub(params);
}
