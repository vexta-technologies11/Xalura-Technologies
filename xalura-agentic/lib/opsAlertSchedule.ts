import {
  fileExistsAgentic,
  readFileUtf8Agentic,
  writeFileUtf8Agentic,
} from "./agenticDisk";
import { readFailedQueue } from "./failedQueue";
import { getAgenticRoot } from "./paths";
import { humanOpsAlertDigestEmailBody } from "./pipelineFailureHumanize";
import { sendResendEmail } from "./phase7Clients";
import { resolveWorkerEnv } from "./resolveWorkerEnv";

const STATE_FILE = "ops-alert-digest.json";

type OpsAlertState = {
  version: 1;
  /** ISO time of last digest email sent (Resend). */
  lastDigestSentAt: string | null;
};

function defaultState(): OpsAlertState {
  return { version: 1, lastDigestSentAt: null };
}

function statePath(cwd: string): string {
  return `${getAgenticRoot(cwd)}/failed/${STATE_FILE}`;
}

function loadState(cwd: string): OpsAlertState {
  const p = statePath(cwd);
  if (!fileExistsAgentic(p)) return defaultState();
  try {
    const raw = readFileUtf8Agentic(p);
    if (raw == null) return defaultState();
    const j = JSON.parse(raw) as Partial<OpsAlertState>;
    if (j.version !== 1) return defaultState();
    return {
      version: 1,
      lastDigestSentAt:
        typeof j.lastDigestSentAt === "string" || j.lastDigestSentAt === null
          ? j.lastDigestSentAt
          : null,
    };
  } catch {
    return defaultState();
  }
}

function saveState(s: OpsAlertState, cwd: string): void {
  writeFileUtf8Agentic(statePath(cwd), JSON.stringify(s, null, 2));
}

function intervalMs(): number {
  const h = Number(process.env["AGENTIC_OPS_ALERT_INTERVAL_HOURS"]);
  const hours = Number.isFinite(h) && h > 0 ? h : 12;
  return hours * 60 * 60 * 1000;
}

/**
 * After a new failure is recorded: send at most one digest email per interval,
 * batching all failures with ts strictly after the previous digest send time.
 */
export async function maybeSendOpsAlertDigest(cwd: string): Promise<void> {
  const to = (await resolveWorkerEnv("AGENTIC_OPS_ALERT_EMAIL"))?.trim();
  if (!to) return;

  const state = loadState(cwd);
  const now = Date.now();
  const last = state.lastDigestSentAt ? new Date(state.lastDigestSentAt).getTime() : 0;
  if (state.lastDigestSentAt && now - last < intervalMs()) {
    return;
  }

  const all = readFailedQueue(cwd);
  /** First digest on a new install: only failures from the last 7d (avoid ancient queue noise). */
  const sevenDayMs = 7 * 24 * 60 * 60 * 1000;
  const firstRunCutoff = new Date(Date.now() - sevenDayMs).toISOString();
  const afterTs = state.lastDigestSentAt ?? firstRunCutoff;
  const after = new Date(afterTs).getTime();
  const fresh = all.filter((f) => new Date(f.ts).getTime() > after);
  if (fresh.length === 0) {
    return;
  }

  const subject = "[Xalura agentic] Pipeline digest (batched)";
  const text = humanOpsAlertDigestEmailBody(fresh, {
    maxItems: 40,
    windowStartIso: afterTs,
  });
  const sent = await sendResendEmail({ to, subject, text });
  if (sent.error) {
    console.warn(`[ops-alert] digest Resend failed: ${sent.error}`);
    return;
  }
  saveState({ version: 1, lastDigestSentAt: new Date().toISOString() }, cwd);
}
