import { AGENTIC_IMPLEMENTATION_PHASE } from "../engine/version";
import { loadCycleState } from "../engine/cycleStateStore";
import { readEvents } from "./eventQueue";
import { readFailedQueue } from "./failedQueue";
import { getAgenticRoot } from "./paths";
import {
  getGeminiEnvDiagnostics,
  isGeminiConfigured,
  type GeminiEnvDiagnostics,
} from "./gemini";
import { getPhase7Configured, type Phase7Configured } from "./phase7Clients";

export type AgenticHealthPayload = {
  ok: true;
  phase: number;
  gemini_configured: boolean;
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

  const [gemini_configured, phase7] = await Promise.all([
    isGeminiConfigured(),
    getPhase7Configured(),
  ]);

  const base: AgenticHealthPayload = {
    ok: true,
    phase: AGENTIC_IMPLEMENTATION_PHASE,
    gemini_configured,
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
  }

  return base;
}
