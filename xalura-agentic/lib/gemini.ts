/**
 * Agent LLM entrypoint — **stub** when `GEMINI_API_KEY` is unset.
 * When set, uses `@google/generative-ai` with timeout + retries (Phase 6).
 *
 * Env (optional):
 * - `AGENTIC_GEMINI_TIMEOUT_MS` (default 60000)
 * - `AGENTIC_GEMINI_RETRIES` (default 3)
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { appendFailedOperation } from "./failedQueue";
import { resolveWorkerEnv } from "./resolveWorkerEnv";
import { withRetries, withTimeout } from "./watchdog";

/**
 * OpenNext inlines `NEXT_RUNTIME=nodejs` and wires CF `env` via AsyncLocalStorage.
 * Sync `getCloudflareContext()` often throws outside that scope; async mode resolves
 * the platform context reliably inside App Router handlers.
 */
/** Safe booleans only — for token-gated `/api/agentic-health?debug=…`. */
export type GeminiEnvDiagnostics = {
  process_env_key_nonempty: boolean;
  async_context_ok: boolean;
  async_cf_gemini_type: string;
  async_error?: string;
  sync_context_ok: boolean;
  sync_cf_gemini_type: string;
  sync_error?: string;
};

export async function getGeminiEnvDiagnostics(): Promise<GeminiEnvDiagnostics> {
  const process_env_key_nonempty = !!process.env["GEMINI_API_KEY"]?.trim();
  let async_context_ok = false;
  let async_cf_gemini_type = "not_tried";
  let async_error: string | undefined;
  try {
    const { env } = await getCloudflareContext({ async: true });
    async_context_ok = true;
    const v = (env as Record<string, unknown>)["GEMINI_API_KEY"];
    async_cf_gemini_type =
      v === undefined ? "undefined" : v === null ? "null" : typeof v;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    async_error = msg.replace(/\s+/g, " ").slice(0, 220);
  }

  let sync_context_ok = false;
  let sync_cf_gemini_type = "not_tried";
  let sync_error: string | undefined;
  try {
    const { env } = getCloudflareContext({ async: false });
    sync_context_ok = true;
    const v = (env as Record<string, unknown>)["GEMINI_API_KEY"];
    sync_cf_gemini_type =
      v === undefined ? "undefined" : v === null ? "null" : typeof v;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    sync_error = msg.replace(/\s+/g, " ").slice(0, 220);
  }

  return {
    process_env_key_nonempty,
    async_context_ok,
    async_cf_gemini_type,
    async_error,
    sync_context_ok,
    sync_cf_gemini_type,
    sync_error,
  };
}

/**
 * Non-secret flags for `/api/agentic-health` (no `?debug=` needed).
 * Interpreting `cf_worker_gemini_key_type`:
 * - `"string"` and `gemini_configured: false` should not happen (key resolves).
 * - `"undefined"` and `cf_async_context_ok: true` → set secret **`GEMINI_API_KEY`** on this Worker
 *   (`wrangler secret put` or Dashboard → **Workers** → *this* worker → Variables).
 * - `cf_async_context_ok: false` → OpenNext ALS / routing issue, not a missing var name.
 */
export type AgenticGeminiSurfaceHints = {
  process_env_nonempty: boolean;
  cf_async_context_ok: boolean;
  /** When `cf_async_context_ok` is true: `typeof` Worker `env.GEMINI_API_KEY`. */
  cf_worker_gemini_key_type: string;
};

export async function getAgenticGeminiSurfaceHints(): Promise<AgenticGeminiSurfaceHints> {
  const process_env_nonempty = !!process.env["GEMINI_API_KEY"]?.trim();
  try {
    const { env } = await getCloudflareContext({ async: true });
    const v = (env as Record<string, unknown>)["GEMINI_API_KEY"];
    const cf_worker_gemini_key_type =
      v === undefined ? "undefined" : v === null ? "null" : typeof v;
    return {
      process_env_nonempty,
      cf_async_context_ok: true,
      cf_worker_gemini_key_type,
    };
  } catch {
    return {
      process_env_nonempty,
      cf_async_context_ok: false,
      cf_worker_gemini_key_type: "n/a",
    };
  }
}

export async function resolveGeminiApiKey(): Promise<string | undefined> {
  return resolveWorkerEnv("GEMINI_API_KEY");
}

export type RunAgentParams = {
  role: string;
  department: string;
  task: string;
  context?: unknown;
  cycleLog?: string;
};

export async function isGeminiConfigured(): Promise<boolean> {
  return !!(await resolveGeminiApiKey());
}

function geminiTimeoutMs(): number {
  const n = Number(process.env["AGENTIC_GEMINI_TIMEOUT_MS"]);
  return Number.isFinite(n) && n > 0 ? n : 60_000;
}

function geminiRetryCount(): number {
  const n = Number(process.env["AGENTIC_GEMINI_RETRIES"]);
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

async function runGeminiLive(
  apiKey: string,
  params: RunAgentParams,
): Promise<string> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const key = apiKey;
  if (!key) throw new Error("GEMINI_API_KEY missing");
  const modelName =
    process.env["GEMINI_MODEL"]?.trim() || "gemini-2.5-flash-lite";
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

async function runGeminiLiveResilient(
  apiKey: string,
  params: RunAgentParams,
): Promise<string> {
  const ms = geminiTimeoutMs();
  const attempts = geminiRetryCount();
  return withRetries(
    () =>
      withTimeout(ms, `Gemini|${params.role}|${params.department}`, () =>
        runGeminiLive(apiKey, params),
      ),
    { maxAttempts: attempts, label: "gemini" },
  );
}

export async function runAgent(params: RunAgentParams): Promise<string> {
  const apiKey = await resolveGeminiApiKey();
  if (apiKey) {
    try {
      return await runGeminiLiveResilient(apiKey, params);
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
