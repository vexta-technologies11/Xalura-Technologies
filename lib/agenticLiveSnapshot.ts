import type { AgenticEvent } from "@/xalura-agentic/lib/eventQueue";
import { readEvents } from "@/xalura-agentic/lib/eventQueue";
import { readFailedQueue } from "@/xalura-agentic/lib/failedQueue";
import { loadCycleState } from "@/xalura-agentic/engine/cycleStateStore";
import type { DepartmentId } from "@/xalura-agentic/engine/departments";
import { isDepartmentId } from "@/xalura-agentic/engine/departments";

export type AgenticLiveDeptId = DepartmentId;

export type AgenticLiveDepartmentView = {
  id: AgenticLiveDeptId;
  label: string;
  source: "live" | "example";
  worker: string;
  manager: string;
  executive: string;
  cycle: { approvalsInWindow: number; auditsCompleted: number };
};

export type AgenticLiveTailItem = {
  ts: string;
  type: string;
  summary: string;
};

export type AgenticLiveSlot = {
  slotIndex: number;
  startsAt: string;
  endsAt: string;
  msUntilEnd: number;
};

export type AgenticLiveSnapshot = {
  ts: string;
  publishCycleMs: number;
  slot: AgenticLiveSlot;
  departments: AgenticLiveDepartmentView[];
  tail: AgenticLiveTailItem[];
  failed_hint?: string;
};

function publishCycleMs(): number {
  const n = Number(process.env["AGENTIC_DASHBOARD_PUBLISH_CYCLE_MS"]);
  if (Number.isFinite(n) && n >= 60_000 && n <= 86_400_000) return Math.floor(n);
  return 7_200_000;
}

function slotForNow(cycleMs: number): AgenticLiveSlot {
  const now = Date.now();
  const slotIndex = Math.floor(now / cycleMs);
  const starts = slotIndex * cycleMs;
  const ends = starts + cycleMs;
  return {
    slotIndex,
    startsAt: new Date(starts).toISOString(),
    endsAt: new Date(ends).toISOString(),
    msUntilEnd: Math.max(0, ends - now),
  };
}

function normDept(s: string): AgenticLiveDeptId | null {
  const t = s.trim().toLowerCase();
  if (isDepartmentId(t)) return t;
  return null;
}

function eventDept(e: AgenticEvent): AgenticLiveDeptId | null {
  switch (e.type) {
    case "WAITING":
      return normDept(e.payload.department);
    case "AUDIT_COMPLETE":
      return normDept(e.payload.department);
    case "ARTICLE_PUBLISHED":
      return "publishing";
    case "KEYWORD_READY":
    case "TOPIC_BANK_REFRESHED":
      return "seo";
    default:
      return null;
  }
}

function summarizeEvent(e: AgenticEvent): string {
  switch (e.type) {
    case "WAITING":
      return `${e.payload.department}: ${e.payload.reason}`;
    case "AUDIT_COMPLETE":
      return `${e.payload.department} audit → ${e.payload.audit_file}`;
    case "ARTICLE_PUBLISHED":
      return `Published “${e.payload.title}”${e.payload.url ? ` (${e.payload.url})` : ""}`;
    case "KEYWORD_READY":
      return `SEO bundle ${e.payload.bundle_id} (${e.payload.keywords?.length ?? 0} kw)`;
    case "TOPIC_BANK_REFRESHED":
      return `Topic bank refresh (${e.payload.topic_count} topics)`;
  }
}

function latestForDept(
  events: AgenticEvent[],
  dept: AgenticLiveDeptId,
): AgenticEvent | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]!;
    if (eventDept(e) === dept) return e;
  }
  return null;
}

const EXAMPLE_ROTATION_MS = 10_000;

const DEMO = {
  marketing: [
    {
      w: "Worker: scanning positioning notes + prior audit",
      m: "Manager: approve / decline tone & claims",
      e: "Executive: packaging brief → Publishing queue",
    },
    {
      w: "Worker: drafting hero copy variants",
      m: "Manager: risk check (compliance)",
      e: "Executive: routing assets to Publishing",
    },
  ],
  publishing: [
    {
      w: "Worker: assembling article body + citations",
      m: "Manager: publish gate (site + digest)",
      e: "Executive: handoff to site / Zernio when approved",
    },
    {
      w: "Worker: Supabase upsert + slug checks",
      m: "Manager: final read vs brief",
      e: "Executive: closing loop with SEO (internal links)",
    },
  ],
  seo: [
    {
      w: "Worker: Programmable Search + SERP clustering",
      m: "Manager: keyword bundle sign-off",
      e: "Executive: KEYWORD_READY → Marketing handoff",
    },
    {
      w: "Worker: topic bank crawl + rank",
      m: "Manager: bundle quality gate",
      e: "Executive: feeding Publishing outline slots",
    },
  ],
} as const;

function exampleLines(
  dept: AgenticLiveDeptId,
  now: number,
): { worker: string; manager: string; executive: string } {
  const list = DEMO[dept];
  const i = Math.floor(now / EXAMPLE_ROTATION_MS) % list.length;
  const row = list[i]!;
  return { worker: row.w, manager: row.m, executive: row.e };
}

function liveLines(
  e: AgenticEvent,
  dept: AgenticLiveDeptId,
  cycle: { approvalsInWindow: number; auditsCompleted: number },
): { worker: string; manager: string; executive: string } {
  const windowHint = `Window ${cycle.approvalsInWindow}/10 · audits ${cycle.auditsCompleted}`;
  switch (e.type) {
    case "WAITING":
      return {
        worker: `Worker: ${e.payload.reason}`,
        manager: `Manager: ${windowHint} — approve or decline next worker output`,
        executive: `Executive: coordinating ${e.payload.department} ladder`,
      };
    case "AUDIT_COMPLETE":
      return {
        worker: "Worker: cycle output captured on disk",
        manager: `Manager: review complete · ${windowHint}`,
        executive: `Executive: audit filed — cross-dept visibility (${e.payload.audit_file})`,
      };
    case "ARTICLE_PUBLISHED":
      return {
        worker: "Worker: article assembled + staged for site",
        manager: "Manager: APPROVED path → live publish",
        executive: "Executive: handoff complete (site / notifications)",
      };
    case "KEYWORD_READY":
      return {
        worker: `Worker: research bundle ready (${e.payload.keywords?.length ?? 0} keywords)`,
        manager: `Manager: ${windowHint} — SEO bundle review`,
        executive:
          dept === "seo"
            ? "Executive: ready to pass keywords → Marketing / Publishing"
            : "Executive: coordinating downstream",
      };
    case "TOPIC_BANK_REFRESHED":
      return {
        worker: `Worker: refreshed bank (${e.payload.topic_count} topics)`,
        manager: "Manager: bank freshness check",
        executive: "Executive: SEO → pipeline consumers",
      };
  }
}

const DEPT_LABEL: Record<AgenticLiveDeptId, string> = {
  marketing: "Marketing",
  publishing: "Publishing",
  seo: "SEO",
};

/**
 * Read-only snapshot for the admin AI dashboard (no secrets).
 */
export function getAgenticLiveSnapshot(cwd: string = process.cwd()): AgenticLiveSnapshot {
  const cycleMs = publishCycleMs();
  const now = Date.now();
  const slot = slotForNow(cycleMs);

  let events: AgenticEvent[] = [];
  try {
    events = readEvents(cwd);
  } catch {
    events = [];
  }

  const tail: AgenticLiveTailItem[] = events.slice(-14).map((e) => ({
    ts: e.ts,
    type: e.type,
    summary: summarizeEvent(e),
  }));

  let st = loadCycleState(cwd);
  const departments: AgenticLiveDepartmentView[] = (["marketing", "publishing", "seo"] as const).map(
    (id) => {
      const latest = latestForDept(events, id);
      const cycle = st.departments[id];
      if (!latest) {
        const ex = exampleLines(id, now);
        return {
          id,
          label: DEPT_LABEL[id],
          source: "example" as const,
          worker: ex.worker,
          manager: ex.manager,
          executive: ex.executive,
          cycle: { ...cycle },
        };
      }
      const lines = liveLines(latest, id, cycle);
      return {
        id,
        label: DEPT_LABEL[id],
        source: "live" as const,
        ...lines,
        cycle: { ...cycle },
      };
    },
  );

  let failed_hint: string | undefined;
  try {
    const failed = readFailedQueue(cwd);
    const last = failed[failed.length - 1];
    if (last) {
      failed_hint = `${last.kind}: ${last.message}`.slice(0, 220);
    }
  } catch {
    /* ignore */
  }

  return {
    ts: new Date().toISOString(),
    publishCycleMs: cycleMs,
    slot,
    departments,
    tail,
    failed_hint,
  };
}
