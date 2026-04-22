import {
  AGENTIC_HEALTH_SCHEMA,
  AGENTIC_IMPLEMENTATION_PHASE,
  AGENTIC_RELEASE_ID,
} from "../engine/version";
import { loadCycleState } from "../engine/cycleStateStore";
import { readEvents } from "./eventQueue";
import { readFailedQueue } from "./failedQueue";
import { getAgenticRoot } from "./paths";
import {
  getAgenticGeminiSurfaceHints,
  getGeminiEnvDiagnostics,
  isGeminiConfigured,
  type AgenticGeminiSurfaceHints,
  type GeminiEnvDiagnostics,
} from "./gemini";
import { getPhase7Configured, type Phase7Configured } from "./phase7Clients";

const CI_ENV_KEYS = [
  "CF_PAGES_COMMIT_SHA",
  "VERCEL_GIT_COMMIT_SHA",
  "GITHUB_SHA",
  "COMMIT_REF",
  "DEPLOYMENT_ID",
  "CF_VERSION_METADATA",
  "BUILD_REF",
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
  /** No secrets. See `AgenticGeminiSurfaceHints` in `gemini.ts` for how to read `cf_*` fields. */
  gemini_hints: AgenticGeminiSurfaceHints & { next_runtime: string | null };
  /** Phase 7 — which optional API keys/bindings are present (no values). */
  phase7: Phase7Configured;
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
};

/**
 * Read-only snapshot for `/api/agentic-health` and `npm run agentic:status`.
 */
export async function getAgenticHealth(
  cwd: string = process.cwd(),
  options?: { includeGeminiDebug?: boolean },
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

  const [gemini_configured, phase7, geminiSurfaceHints] = await Promise.all([
    isGeminiConfigured(),
    getPhase7Configured(),
    getAgenticGeminiSurfaceHints(),
  ]);

  const base: AgenticHealthPayload = {
    ok: true,
    health_schema: AGENTIC_HEALTH_SCHEMA,
    release_id: AGENTIC_RELEASE_ID,
    deploy_fingerprint: deployFingerprint(),
    phase: AGENTIC_IMPLEMENTATION_PHASE,
    gemini_configured,
    gemini_hints: {
      ...geminiSurfaceHints,
      next_runtime: process.env["NEXT_RUNTIME"] ?? null,
    },
    phase7,
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
  }

  return base;
}
