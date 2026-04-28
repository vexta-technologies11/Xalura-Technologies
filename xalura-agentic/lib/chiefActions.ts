/**
 * Chief AI operational actions — translates Chief's natural-language "Orders" into
 * real system effects.
 *
 * These give Chief AI **actual power** beyond text-in-a-log:
 * - CANCEL: Cancel a pipeline or lane (via event queue)
 * - PAUSE: Suspend a department or lane for N minutes
 * - REDUCE: Override max manager rounds (persisted in strategy overlay)
 * - TRIGGER: Queue a pipeline run or topic bank refresh
 * - UNPAUSE: Clear a pause
 *
 * Each action is logged and executed only if explicitly instructed by Chief's structured output.
 * Env: no additional keys needed. Uses existing stores + event queue.
 */
import type { DepartmentId } from "../engine/departments";
import { appendEvent, getLatestEvent } from "./eventQueue";
import { loadCycleState, saveCycleState } from "../engine/cycleStateStore";
import {
  loadStrategyOverlay,
  saveStrategyOverlay,
  overlayStorageKey,
} from "./auditStrategyOverlayStore";
import { appendFailedOperation } from "./failedQueue";
import { fireAgenticPipelineLog } from "@/lib/agenticPipelineLogSupabase";
import { getAgenticRoot } from "./paths";
import {
  readFileUtf8Agentic,
  mkdirRecursiveAgentic,
  writeFileUtf8Agentic,
} from "./agenticDisk";
import { readEvents } from "./eventQueue";
import path from "path";

export type ChiefCancelAction = {
  type: "CANCEL";
  department?: DepartmentId;
  agentLaneId?: string;
  reason: string;
  /** ISO timestamp or empty for permanent cancel */
  until?: string;
};

export type ChiefPauseAction = {
  type: "PAUSE";
  department?: DepartmentId;
  agentLaneId?: string;
  reason: string;
  /** Duration in minutes */
  minutes: number;
};

export type ChiefReduceAction = {
  type: "REDUCE";
  department?: DepartmentId;
  /** Max manager rounds (1-10) */
  maxManagerRounds: number;
  reason: string;
};

export type ChiefTriggerAction = {
  type: "TRIGGER";
  target: "topic_bank_refresh" | "pipeline_run";
  department?: DepartmentId;
  agentLaneId?: string;
  reason: string;
};

export type ChiefUnpauseAction = {
  type: "UNPAUSE";
  department?: DepartmentId;
  agentLaneId?: string;
  reason: string;
};

export type ChiefOperationalAction =
  | ChiefCancelAction
  | ChiefPauseAction
  | ChiefReduceAction
  | ChiefTriggerAction
  | ChiefUnpauseAction;

export type ChiefActionLogEntry = {
  id: string;
  ts: string;
  action: ChiefOperationalAction;
  executed: boolean;
  error?: string;
};

/**
 * Execute a single Chief operational action.
 * Returns `{ ok: true }` on success or `{ ok: false, error }` on failure.
 */
export async function executeChiefAction(
  action: ChiefOperationalAction,
  cwd: string = process.cwd(),
): Promise<{ ok: true } | { ok: false; error: string }> {
  const logAction = (executed: boolean, error?: string) => {
    const entry: ChiefActionLogEntry = {
      id: `chief-action-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      ts: new Date().toISOString(),
      action,
      executed,
      error,
    };
    appendChiefActionLog(entry, cwd);
  };

  try {
    switch (action.type) {
      case "CANCEL":
        return executeCancel(action, cwd, logAction);
      case "PAUSE":
        return executePause(action, cwd, logAction);
      case "REDUCE":
        return executeReduce(action, cwd, logAction);
      case "TRIGGER":
        return executeTrigger(action, cwd, logAction);
      case "UNPAUSE":
        return executeUnpause(action, cwd, logAction);
      default:
        logAction(false, `Unknown action type: ${(action as ChiefOperationalAction).type}`);
        return { ok: false, error: `Unknown action type` };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logAction(false, msg);
    return { ok: false, error: msg };
  }
}

/**
 * Parse a Chief AI markdown "Orders" section into actionable commands.
 * Looks for lines like:
 *   CANCEL publishing:sc-content-marketing — reason
 *   PAUSE seo for 30 — reason
 *   REDUCE seo max_manager_rounds to 2 — reason
 *   TRIGGER topic_bank_refresh — reason
 *   UNPAUSE seo — reason
 */
export function parseChiefOrders(markdown: string): ChiefOperationalAction[] {
  const actions: ChiefOperationalAction[] = [];
  const lines = markdown.split("\n");

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("```")) continue;

    // CANCEL <scope> — <reason>
    const cancelMatch = line.match(/^CANCEL\s+(\S+)(?:\s*—\s*(.+))?$/i);
    if (cancelMatch) {
      const [scope, reason] = parseScope(cancelMatch[1]!, cancelMatch[2]);
      actions.push({
        type: "CANCEL",
        ...scope,
        reason: reason || "Cancelled by Chief AI",
      });
      continue;
    }

    // PAUSE <scope> for <minutes> — <reason>
    const pauseMatch = line.match(/^PAUSE\s+(\S+)\s+for\s+(\d+)(?:\s*—\s*(.+))?$/i);
    if (pauseMatch) {
      const [scope, rawReason] = parseScope(pauseMatch[1]!, pauseMatch[3]);
      actions.push({
        type: "PAUSE",
        ...scope,
        minutes: Math.max(1, Math.min(1440, parseInt(pauseMatch[2]!, 10))),
        reason: rawReason || `Paused by Chief AI for ${pauseMatch[2]} min`,
      });
      continue;
    }

    // REDUCE <scope> max_manager_rounds to <N> — <reason>
    const reduceMatch = line.match(/^REDUCE\s+(\S+)\s+max_manager_rounds\s+to\s+(\d+)(?:\s*—\s*(.+))?$/i);
    if (reduceMatch) {
      const [scope, rawReason] = parseScope(reduceMatch[1]!, reduceMatch[3]);
      actions.push({
        type: "REDUCE",
        ...scope,
        maxManagerRounds: Math.max(1, Math.min(10, parseInt(reduceMatch[2]!, 10))),
        reason: rawReason || `Manager rounds reduced by Chief AI`,
      });
      continue;
    }

    // TRIGGER topic_bank_refresh — <reason>
    const triggerMatch = line.match(/^TRIGGER\s+(topic_bank_refresh|pipeline_run)(?:\s*—\s*(.+))?$/i);
    if (triggerMatch) {
      actions.push({
        type: "TRIGGER",
        target: triggerMatch[1]!.toLowerCase() as "topic_bank_refresh" | "pipeline_run",
        reason: triggerMatch[2] || `Triggered by Chief AI`,
      });
      continue;
    }

    // UNPAUSE <scope> — <reason>
    const unpauseMatch = line.match(/^UNPAUSE\s+(\S+)(?:\s*—\s*(.+))?$/i);
    if (unpauseMatch) {
      const [scope, reason] = parseScope(unpauseMatch[1]!, unpauseMatch[2]);
      actions.push({
        type: "UNPAUSE",
        ...scope,
        reason: reason || `Unpaused by Chief AI`,
      });
      continue;
    }
  }

  return actions;
}

/**
 * Parse a scope string like "seo", "publishing:sc-content-marketing", "news"
 * into department and agentLaneId.
 */
function parseScope(
  scope: string,
  reason?: string,
): [{ department?: DepartmentId; agentLaneId?: string }, string?] {
  const deptIds: DepartmentId[] = ["seo", "publishing", "marketing"];

  // Check if scope has a colon (e.g. "seo:sc-content-marketing")
  if (scope.includes(":")) {
    const [deptPart, lanePart] = scope.split(":", 2);
    if (deptIds.includes(deptPart as DepartmentId)) {
      return [{ department: deptPart as DepartmentId, agentLaneId: lanePart }, reason];
    }
    // Unknown department prefix but has a lane — treat as full lane key
    return [{ agentLaneId: scope }, reason];
  }

  // Check if it's a department name
  if (deptIds.includes(scope as DepartmentId)) {
    return [{ department: scope as DepartmentId }, reason];
  }

  // Treat as agent lane id
  return [{ agentLaneId: scope }, reason];
}

/** Execute a CANCEL action — writes a CANCEL event that pipelines check before starting. */
async function executeCancel(
  action: ChiefCancelAction,
  cwd: string,
  logAction: (executed: boolean, error?: string) => void,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const until = action.until || new Date(Date.now() + 3600000).toISOString(); // 1 hour default

  appendEvent(
    {
      type: "CHIEF_CANCEL",
      payload: {
        department: action.department || undefined,
        agentLaneId: action.agentLaneId,
        reason: action.reason,
        until,
      },
    } as any, // Type assertion handled by event queue
    cwd,
  );

  fireAgenticPipelineLog({
    department: action.department || ("chief" as any),
    stage: "chief_action",
    event: "cancel",
    summary: `Chief CANCEL: ${scopeLabel(action)} — ${action.reason}`,
    detail: { until, agentLaneId: action.agentLaneId ?? null },
  });

  logAction(true);
  return { ok: true };
}

/** Execute a PAUSE action — writes pausedUntil to cycle state. */
async function executePause(
  action: ChiefPauseAction,
  cwd: string,
  logAction: (executed: boolean, error?: string) => void,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const state = loadCycleState(cwd);
  const until = new Date(Date.now() + action.minutes * 60 * 1000).toISOString();

  // If targeting a specific department, set pause on its state
  if (action.department) {
    const dept = state.departments[action.department];
    if (dept) {
      (dept as any).pausedUntil = until;
      (dept as any).pausedReason = action.reason;
    }
  }

  // If targeting a specific agent lane
  if (action.agentLaneId && state.agentLanes) {
    // Try exact match
    const key = overlayStorageKey(action.department || "seo", action.agentLaneId);
    const lane = state.agentLanes[key];
    if (lane) {
      (lane as any).pausedUntil = until;
      (lane as any).pausedReason = action.reason;
    }
    // Also try with department prefix
    if (action.department) {
      const deptKey = `${action.department}:${action.agentLaneId}`;
      const deptLane = state.agentLanes[deptKey];
      if (deptLane) {
        (deptLane as any).pausedUntil = until;
        (deptLane as any).pausedReason = action.reason;
      }
    }
  }

  // Also persist the pause in the strategy overlay (legacy compatible)
  const overlayKey = action.department
    ? overlayStorageKey(action.department, action.agentLaneId)
    : undefined;
  if (overlayKey) {
    const existing = loadStrategyOverlay(cwd, action.department!, action.agentLaneId);
    if (existing) {
      saveStrategyOverlay(cwd, {
        ...existing,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  saveCycleState(state, cwd);

  fireAgenticPipelineLog({
    department: action.department || ("chief" as any),
    stage: "chief_action",
    event: "pause",
    summary: `Chief PAUSE: ${scopeLabel(action)} for ${action.minutes} min — ${action.reason}`,
    detail: { pausedUntil: until, minutes: action.minutes, agentLaneId: action.agentLaneId ?? null },
  });

  logAction(true);
  return { ok: true };
}

/** Execute a REDUCE action — saves maxManagerRounds to strategy overlay operational fields. */
async function executeReduce(
  action: ChiefReduceAction,
  cwd: string,
  logAction: (executed: boolean, error?: string) => void,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (action.department) {
    const existing = loadStrategyOverlay(cwd, action.department, undefined);
    if (existing) {
      saveStrategyOverlay(cwd, {
        ...existing,
        updatedAt: new Date().toISOString(),
        // Store maxManagerRounds in a way the pipeline can read it
      } as any);
    }
  }

  // Write a durable marker that the pipeline can read
  // We use the audit strategy overlays file with a special key
  const storeKey = `operational:${action.department || "all"}`;
  const rawPath = path.join(getAgenticRoot(cwd), "data", "operational-overrides.json");
  mkdirRecursiveAgentic(path.dirname(rawPath));

  // Read existing overrides
  let overrides: Record<string, number> = {};
  try {
    const existingRaw = readFileUtf8Agentic(rawPath);
    if (existingRaw) {
      overrides = JSON.parse(existingRaw);
    }
  } catch {
    // Start fresh
  }

  overrides[`${storeKey}:maxManagerRounds`] = action.maxManagerRounds;
  writeFileUtf8Agentic(rawPath, JSON.stringify(overrides, null, 2));

  fireAgenticPipelineLog({
    department: action.department || ("chief" as any),
    stage: "chief_action",
    event: "reduce",
    summary: `Chief REDUCE: ${scopeLabel(action)} maxManagerRounds -> ${action.maxManagerRounds} — ${action.reason}`,
    detail: { maxManagerRounds: action.maxManagerRounds },
  });

  logAction(true);
  return { ok: true };
}

/** Execute a TRIGGER action — appends a trigger event. */
async function executeTrigger(
  action: ChiefTriggerAction,
  cwd: string,
  logAction: (executed: boolean, error?: string) => void,
): Promise<{ ok: true } | { ok: false; error: string }> {
  appendEvent(
    {
      type: "CHIEF_TRIGGER",
      payload: {
        target: action.target,
        department: action.department || undefined,
        agentLaneId: action.agentLaneId,
        reason: action.reason,
        triggeredAt: new Date().toISOString(),
      },
    } as any,
    cwd,
  );

  fireAgenticPipelineLog({
    department: action.department || ("chief" as any),
    stage: "chief_action",
    event: "trigger",
    summary: `Chief TRIGGER: ${action.target} — ${action.reason}`,
    detail: { target: action.target, agentLaneId: action.agentLaneId ?? null },
  });

  logAction(true);
  return { ok: true };
}

/** Execute an UNPAUSE action — clears pausedUntil from cycle state. */
async function executeUnpause(
  action: ChiefUnpauseAction,
  cwd: string,
  logAction: (executed: boolean, error?: string) => void,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const state = loadCycleState(cwd);

  if (action.department) {
    const dept = state.departments[action.department];
    if (dept) {
      delete (dept as any).pausedUntil;
      delete (dept as any).pausedReason;
    }
  }

  if (action.agentLaneId && state.agentLanes) {
    const key = overlayStorageKey(action.department || "seo", action.agentLaneId);
    const lane = state.agentLanes[key];
    if (lane) {
      delete (lane as any).pausedUntil;
      delete (lane as any).pausedReason;
    }
    if (action.department) {
      const deptKey = `${action.department}:${action.agentLaneId}`;
      const deptLane = state.agentLanes[deptKey];
      if (deptLane) {
        delete (deptLane as any).pausedUntil;
        delete (deptLane as any).pausedReason;
      }
    }
  }

  saveCycleState(state, cwd);

  fireAgenticPipelineLog({
    department: action.department || ("chief" as any),
    stage: "chief_action",
    event: "unpause",
    summary: `Chief UNPAUSE: ${scopeLabel(action)} — ${action.reason}`,
    detail: { agentLaneId: action.agentLaneId ?? null },
  });

  logAction(true);
  return { ok: true };
}

function scopeLabel(action: { department?: string; agentLaneId?: string }): string {
  if (action.department && action.agentLaneId) {
    return `${action.department}:${action.agentLaneId}`;
  }
  return action.department || action.agentLaneId || "global";
}

/** Append an action log entry to `data/chief-action-log.json` */
function appendChiefActionLog(entry: ChiefActionLogEntry, cwd: string): void {
  const logPath = path.join(getAgenticRoot(cwd), "data", "chief-action-log.json");
  mkdirRecursiveAgentic(path.dirname(logPath));
  try {
    let existing: ChiefActionLogEntry[] = [];
    const raw = readFileUtf8Agentic(logPath);
    if (raw) {
      try {
        existing = JSON.parse(raw);
      } catch {
        existing = [];
      }
    }
    existing.push(entry);
    if (existing.length > 500) {
      existing = existing.slice(-500);
    }
    writeFileUtf8Agentic(logPath, JSON.stringify(existing, null, 2));
  } catch {
    // fail silently — logging failures shouldn't break actions
  }
}

/**
 * Check if a pipeline/lane is paused.
 * Called at the start of runDepartmentPipeline.
 */
export function isPipelinePaused(
  department: DepartmentId,
  agentLaneId: string | undefined,
  cwd: string = process.cwd(),
): { paused: boolean; reason?: string } {
  const state = loadCycleState(cwd);

  // Check department-wide pause
  const dept = state.departments[department];
  if (dept) {
    const deptAny = dept as any;
    if (deptAny.pausedUntil) {
      const until = new Date(deptAny.pausedUntil);
      if (until > new Date()) {
        return { paused: true, reason: deptAny.pausedReason || `Paused until ${until.toISOString()}` };
      }
      // Pause expired — clean it up
      delete deptAny.pausedUntil;
      delete deptAny.pausedReason;
      saveCycleState(state, cwd);
    }
  }

  // Check agent lane specific pause
  if (agentLaneId && state.agentLanes) {
    const key = overlayStorageKey(department, agentLaneId);
    const lane = state.agentLanes[key];
    if (lane) {
      const laneAny = lane as any;
      if (laneAny.pausedUntil) {
        const until = new Date(laneAny.pausedUntil);
        if (until > new Date()) {
          return { paused: true, reason: laneAny.pausedReason || `Paused until ${until.toISOString()}` };
        }
        delete laneAny.pausedUntil;
        delete laneAny.pausedReason;
        saveCycleState(state, cwd);
      }
    }
  }

  return { paused: false };
}

/**
 * Check if a pipeline run is cancelled (has a recent CANCEL event).
 */
export function isPipelineCancelled(
  department: DepartmentId,
  agentLaneId: string | undefined,
  cwd: string = process.cwd(),
): { cancelled: boolean; reason?: string } {
  // We check for CHIEF_CANCEL events by reading the event queue
  try {
    const events = readEvents(cwd);
    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i];
      if (ev.type === ("CHIEF_CANCEL" as any)) {
        const payload = (ev as any).payload || {};
        const deptMatch = !payload.department || payload.department === department;
        const laneMatch = !payload.agentLaneId || payload.agentLaneId === agentLaneId;
        const notExpired = !payload.until || new Date(payload.until) > new Date();

        if (deptMatch && laneMatch && notExpired) {
          return { cancelled: true, reason: payload.reason || "Cancelled by Chief AI" };
        }
      }
    }
  } catch {
    // ignore
  }
  return { cancelled: false };
}

/**
 * Get operational overrides for a department/lane (e.g. maxManagerRounds).
 */
export function getOperationalOverrides(
  department: DepartmentId,
  cwd: string = process.cwd(),
): { maxManagerRounds?: number } {
  const overrides: Record<string, number> = {};
  const rawPath = path.join(getAgenticRoot(cwd), "data", "operational-overrides.json");
  try {
    const raw = readFileUtf8Agentic(rawPath);
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.assign(overrides, parsed);
    }
  } catch {
    // ignore
  }

  const result: { maxManagerRounds?: number } = {};

  // Check department-specific override first, then fallback to global
  const deptKey = `operational:${department}:maxManagerRounds`;
  const globalKey = "operational:all:maxManagerRounds";

  if (overrides[deptKey] !== undefined) {
    result.maxManagerRounds = overrides[deptKey];
  } else if (overrides[globalKey] !== undefined) {
    result.maxManagerRounds = overrides[globalKey];
  }

  return result;
}
