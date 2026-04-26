import { fireAgenticPipelineLog } from "@/lib/agenticPipelineLogSupabase";
import { createServiceClient } from "@/lib/supabase/service";
import type { MarketingZernioPostOutcome } from "@/lib/marketingZernioSameDayPost";
import { resolveWorkerEnv } from "@/xalura-agentic/lib/resolveWorkerEnv";

const TZ = "America/Chicago";
const DEFAULT_COOLDOWN_H = 35;

function resolveCooldownH(): Promise<number> {
  return (async () => {
    const raw = (await resolveWorkerEnv("AGENTIC_MARKETING_ZERNIO_COOLDOWN_HOURS"))?.trim();
    if (!raw) return DEFAULT_COOLDOWN_H;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1) return DEFAULT_COOLDOWN_H;
    return Math.min(24 * 90, n);
  })();
}

/**
 * Public title for Chief / UI — uses America/Chicago (CST/CDT per date).
 * Example: "Apr 24, 2026, 2:15 PM (America/Chicago, CDT)".
 */
export function formatZernioTimeAmericaChicago(d: Date): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

async function readLastZernioPostAt(): Promise<string | null> {
  const supabase = createServiceClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("agentic_marketing_zernio_state")
    .select("last_post_at")
    .eq("id", "default")
    .maybeSingle();
  if (error) return null;
  const s = data?.last_post_at;
  return typeof s === "string" && s ? s : null;
}

type Schedule = {
  lastPostAtIso: string | null;
  nextEligibleAtIso: string;
  hoursUntil: number;
  cstLine: string;
};

export async function computeZernioMarketingSchedule(
  lastIso: string | null,
  cooldownH: number,
): Promise<Schedule> {
  const now = Date.now();
  const needMs = cooldownH * 60 * 60 * 1000;
  let last: Date | null = null;
  if (lastIso) {
    const t = new Date(lastIso);
    if (!Number.isNaN(t.getTime())) last = t;
  }
  const lastPostAtIso = last ? last.toISOString() : null;
  const lastMs = last ? last.getTime() : 0;
  const nextEligibleAfterCooldown = last ? lastMs + needMs : now;
  const nextEligible = new Date(Math.max(now, nextEligibleAfterCooldown));
  const hoursUntil = (nextEligible.getTime() - now) / (60 * 60 * 1000);
  const cstLine = !last
    ? `No prior Marketing Zernio post in DB; next run can post immediately; min spacing after each post is ~${cooldownH}h.`
    : hoursUntil > 0.01
      ? `Marketing can post to Zernio again in ~${hoursUntil.toFixed(1)}h, around ${formatZernioTimeAmericaChicago(nextEligible)} (${cooldownH}h min after last post; America/Chicago).`
      : `Cooldown clear — Marketing may post to Zernio now; the following slot after that post is ~${cooldownH}h later (next boundary ~${formatZernioTimeAmericaChicago(new Date(now + needMs))} from now if you post immediately).`;
  return {
    lastPostAtIso,
    nextEligibleAtIso: nextEligible.toISOString(),
    hoursUntil: Math.max(0, hoursUntil),
    cstLine,
  };
}

/** 4–6 lines for `buildOpsSnapshot` (Chief email context). */
export async function getMarketingZernioScheduleForChief(): Promise<string> {
  const cooldownH = await resolveCooldownH();
  const last = await readLastZernioPostAt();
  try {
    const s = await computeZernioMarketingSchedule(last, cooldownH);
    return [
      s.cstLine,
      `  last_post_at (UTC): ${s.lastPostAtIso ?? "none"}`,
      `  next_spot_after_cooldown_utc: ${s.nextEligibleAtIso} (~${s.hoursUntil.toFixed(2)}h from now)`,
    ].join("\n");
  } catch (e) {
    return `(Marketing Zernio schedule unavailable: ${e instanceof Error ? e.message : String(e)})`;
  }
}

type LogOpts = {
  source: "admin_force" | "pipeline" | "other";
  skipIfDry: boolean;
};

/**
 * Inserts a row in `agentic_pipeline_stage_log` so Chief and the admin feed see
 * when Marketing last/ next can post to Zernio, with **America/Chicago** wording in `summary` / `detail`.
 */
export function logMarketingZernioPostOutcome(
  outcome: MarketingZernioPostOutcome,
  opts: LogOpts,
): void {
  if (opts.skipIfDry) return;

  void (async () => {
    const cooldownH = await resolveCooldownH();
    const last = await readLastZernioPostAt();
    const sched = await computeZernioMarketingSchedule(last, cooldownH);

    let event = "zernio_skip";
    let oneLine = sched.cstLine;

    if ("ok" in outcome && outcome.ok) {
      event = "zernio_posted";
      oneLine = `Marketing Zernio: posted “${(outcome.title || outcome.slug).slice(0, 60)}” (${outcome.zernioStatus}). ${sched.cstLine}`.replace(
        /\s+/g,
        " ",
      );
    } else if ("skipped" in outcome) {
      event = "zernio_skipped";
      oneLine = `Marketing Zernio skipped: ${outcome.reason} | ${sched.cstLine}`.replace(
        /\s+/g,
        " ",
      );
    } else {
      event = "zernio_error";
      oneLine = `Marketing Zernio error: ${outcome.error} | ${sched.cstLine}`.replace(
        /\s+/g,
        " ",
      );
    }

    const src = `source=${opts.source}`;
    fireAgenticPipelineLog({
      department: "marketing",
      stage: "zernio_social",
      event,
      summary: `${oneLine} (${src})`.trim().slice(0, 2000),
      detail: {
        source: opts.source,
        outcome_kind: "ok" in outcome && outcome.ok ? "ok" : "skipped" in outcome ? "skipped" : "error",
        last_post_at_utc: sched.lastPostAtIso,
        next_slot_after_cooldown_utc: sched.nextEligibleAtIso,
        hours_until_next_post_approx: sched.hoursUntil,
        next_slot_cst_hint: formatZernioTimeAmericaChicago(new Date(sched.nextEligibleAtIso)),
        admin_force: opts.source === "admin_force",
      },
    });
  })().catch(() => {
    /* ignore */
  });
}
