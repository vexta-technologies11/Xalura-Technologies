import { AGENTIC_IMPLEMENTATION_PHASE } from "../engine/version";
import { loadCycleState } from "../engine/cycleStateStore";
import { readEvents } from "./eventQueue";
import { readFailedQueue } from "./failedQueue";
import { getAgenticRoot } from "./paths";
import { isGeminiConfigured } from "./gemini";

export type AgenticHealthPayload = {
  ok: true;
  phase: number;
  gemini_configured: boolean;
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
};

/**
 * Read-only snapshot for `/api/agentic-health` and `npm run agentic:status`.
 */
export function getAgenticHealth(cwd: string = process.cwd()): AgenticHealthPayload {
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

  return {
    ok: true,
    phase: AGENTIC_IMPLEMENTATION_PHASE,
    gemini_configured: isGeminiConfigured(),
    uptime_hint: "next_route",
    agentic_root: getAgenticRoot(cwd),
    departments,
    event_queue_length: eventQueueLength,
    failed_operations: failedCount,
    last_failed: last
      ? { ts: last.ts, kind: last.kind, message: last.message }
      : undefined,
  };
}
