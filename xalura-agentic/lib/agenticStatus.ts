import {
  AGENTIC_HEALTH_SCHEMA,
  AGENTIC_IMPLEMENTATION_PHASE,
  AGENTIC_RELEASE_ID,
} from "../engine/version";
import { loadCycleState } from "../engine/cycleStateStore";
import { readEvents } from "./eventQueue";
import { readFailedQueue } from "./failedQueue";
import { googleCustomSearchConfigured } from "./contentWorkflow/googleCustomSearch";
import { topicBankPath } from "./contentWorkflow/paths";
import { getAgenticRoot } from "./paths";
import {
  getEffectiveGeminiModelName,
  getGeminiEnvDiagnostics,
  pingGeminiForHealth,
  type GeminiEnvDiagnostics,
  type GeminiLivePingPayload,
} from "./gemini";
import { getPhase7Configured, type Phase7Configured } from "./phase7Clients";
import {
  resolveWorkerEnvWithTrace,
  type WorkerEnvResolutionTrace,
} from "./resolveWorkerEnv";
import { fileExistsAgentic } from "./agenticDisk";

const CI_ENV_KEYS = [
  "CF_PAGES_COMMIT_SHA",
  "VERCEL_GIT_COMMIT_SHA",
  "GITHUB_SHA",
  "COMMIT_REF",
  "DEPLOYMENT_ID",
  "CF_VERSION_METADATA",
  "BUILD_REF",
] as const;

/** Phase 7 keys — full resolution trace when `?debug=` matches token. */
const PHASE7_HEALTH_PROBE_KEYS = [
  "RESEND_API_KEY",
  "FIRECRAWL_API_KEY",
  "ZERNIO_API_KEY",
  "GOOGLE_SC_CLIENT_ID",
  "GOOGLE_SC_SECRET",
  "GOOGLE_SC_REFRESH_TOKEN",
  "GOOGLE_SC_SITE_URL",
] as const;

function deployFingerprint(): string {
  for (const k of CI_ENV_KEYS) {
    const v = process.env[k]?.trim();
    if (v) return v.length > 14 ? `${v.slice(0, 14)}…` : v;
  }
  return AGENTIC_RELEASE_ID;
}

function ciEnvKeyPresence(): Record<string, boolean> {
  return Object.fromEntries(
    CI_ENV_KEYS.map((k) => [k, !!process.env[k]?.trim()]),
  ) as Record<string, boolean>;
}

export type GeminiHealthHints = {
  process_env_nonempty: boolean;
  cf_async_context_ok: boolean;
  cf_worker_gemini_key_type: string;
  next_runtime: string | null;
};

function geminiHintsFromTrace(t: WorkerEnvResolutionTrace): GeminiHealthHints {
  return {
    process_env_nonempty: t.process_env.nonempty,
    cf_async_context_ok: t.cf_context_async.context_ok,
    cf_worker_gemini_key_type: t.cf_context_async.context_ok
      ? t.cf_context_async.binding.binding_type
      : "n/a",
    next_runtime: process.env["NEXT_RUNTIME"] ?? null,
  };
}

export type AgenticHealthPayload = {
  ok: true;
  /** If this is missing or lower than repo `AGENTIC_HEALTH_SCHEMA`, the Worker is serving an old build. */
  health_schema: typeof AGENTIC_HEALTH_SCHEMA;
  /** Always matches `AGENTIC_RELEASE_ID` in `engine/version.ts` (bump each ship). */
  release_id: typeof AGENTIC_RELEASE_ID;
  /** First matching CI commit / deploy id, else same as `release_id`. */
  deploy_fingerprint: string;
  phase: number;
  gemini_configured: boolean;
  /** Short hints derived from `gemini_resolution` (no secrets). */
  gemini_hints: GeminiHealthHints;
  /**
   * Per-step env resolution for `GEMINI_API_KEY` (no secret values).
   * Use `remediation_hint` and `first_hit` first; drill into each branch when debugging.
   */
  gemini_resolution: WorkerEnvResolutionTrace;
  /** Phase 7 — which optional API keys/bindings are present (no values). */
  phase7: Phase7Configured;
  /** Content workflow (topic bank) — Google Programmable Search + on-disk bank file. */
  content_workflow: {
    google_custom_search: boolean;
    topic_bank_file_present: boolean;
  };
  uptime_hint: "next_route";
  agentic_root: string;
  departments: {
    marketing: { approvalsInWindow: number; auditsCompleted: number };
    publishing: { approvalsInWindow: number; auditsCompleted: number };
    seo: { approvalsInWindow: number; auditsCompleted: number };
  } | null;
  event_queue_length: number;
  failed_operations: number;
  last_failed?: { ts: string; kind: string; message: string };
  /** Present only when `?debug=` matches `AGENTIC_HEALTH_DEBUG_TOKEN` (no secrets). */
  gemini_env_debug?: GeminiEnvDiagnostics;
  /** With token debug — which common CI env keys are non-empty (booleans only). */
  deploy_env_keys?: Record<string, boolean>;
  /** With token debug — request URL origin from the health GET (helps confirm which host answered). */
  health_request?: { request_url_origin: string | null };
  /** With token debug — Node / process surface (no secrets). */
  health_runtime?: {
    node_version: string;
    platform: string;
    node_env: string | undefined;
    cwd: string;
  };
  /** With token debug — effective model id after env (same default as `lib/gemini.ts`). */
  gemini_model_effective?: string;
  /**
   * With token debug — full resolution trace for each Phase 7 env name (expensive; only with token).
   */
  phase7_env_resolution?: Record<string, WorkerEnvResolutionTrace>;
  /**
   * Present only when `GET /api/agentic-health?gemini_ping=1` (or `true` / `yes`) — one real `generateContent` (uses quota).
   */
  gemini_live_ping?: GeminiLivePingPayload;
};

/**
 * Read-only snapshot for `/api/agentic-health` and `npm run agentic:status`.
 */
export async function getAgenticHealth(
  cwd: string = process.cwd(),
  options?: {
    includeGeminiDebug?: boolean;
    requestUrlOrigin?: string | null;
    /** When true, runs one minimal Gemini call if the API key resolves (optional `gemini_ping` query). */
    geminiPing?: boolean;
  },
): Promise<AgenticHealthPayload> {
  let departments: AgenticHealthPayload["departments"] = null;
  try {
    const st = loadCycleState(cwd);
    departments = {
      marketing: { ...st.departments.marketing },
      publishing: { ...st.departments.publishing },
      seo: { ...st.departments.seo },
    };
  } catch {
    departments = null;
  }

  let eventQueueLength = 0;
  try {
    eventQueueLength = readEvents(cwd).length;
  } catch {
    eventQueueLength = 0;
  }

  let failedCount = 0;
  let last: ReturnType<typeof readFailedQueue>[number] | undefined;
  try {
    const failed = readFailedQueue(cwd);
    failedCount = failed.length;
    last = failed.length ? failed[failed.length - 1] : undefined;
  } catch {
    failedCount = 0;
  }

  const [geminiPack, phase7, googleCs, topicBankPresent] = await Promise.all([
    resolveWorkerEnvWithTrace("GEMINI_API_KEY"),
    getPhase7Configured(),
    googleCustomSearchConfigured(),
    Promise.resolve(fileExistsAgentic(topicBankPath(cwd))),
  ]);

  const gemini_configured = !!geminiPack.value;
  const gemini_resolution = geminiPack.trace;

  const base: AgenticHealthPayload = {
    ok: true,
    health_schema: AGENTIC_HEALTH_SCHEMA,
    release_id: AGENTIC_RELEASE_ID,
    deploy_fingerprint: deployFingerprint(),
    phase: AGENTIC_IMPLEMENTATION_PHASE,
    gemini_configured,
    gemini_hints: geminiHintsFromTrace(gemini_resolution),
    gemini_resolution,
    phase7,
    content_workflow: {
      google_custom_search: googleCs,
      topic_bank_file_present: topicBankPresent,
    },
    uptime_hint: "next_route",
    agentic_root: getAgenticRoot(cwd),
    departments,
    event_queue_length: eventQueueLength,
    failed_operations: failedCount,
    last_failed: last
      ? { ts: last.ts, kind: last.kind, message: last.message }
      : undefined,
  };

  if (options?.includeGeminiDebug) {
    base.gemini_env_debug = await getGeminiEnvDiagnostics();
    base.deploy_env_keys = ciEnvKeyPresence();
    base.health_request = {
      request_url_origin: options.requestUrlOrigin ?? null,
    };
    base.health_runtime = {
      node_version: process.version,
      platform: process.platform,
      node_env: process.env["NODE_ENV"],
      cwd,
    };
    base.gemini_model_effective = getEffectiveGeminiModelName();
    const phase7Entries = await Promise.all(
      PHASE7_HEALTH_PROBE_KEYS.map(async (k) => {
        const { trace } = await resolveWorkerEnvWithTrace(k);
        return [k, trace] as const;
      }),
    );
    base.phase7_env_resolution = Object.fromEntries(phase7Entries);
  }

  if (options?.geminiPing) {
    base.gemini_live_ping = await pingGeminiForHealth();
  }

  return base;
}
