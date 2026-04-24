import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runIncrementalHourlyPublish } from "@/xalura-agentic/lib/incrementalContentCron";

export const dynamic = "force-dynamic";

/**
 * Logged-in admin only. Runs **one hourly incremental tick** (same as `POST /api/cron/agentic-incremental`):
 * round-robin vertical → SEO (topic bank + handoff) → Publishing (handoff) → **forced** site upsert.
 * No custom task body — this is a manual override of the automated queue.
 */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cwd = process.cwd();
  const tick = await runIncrementalHourlyPublish(cwd, {
    forceSitePublish: true,
    awaitFounderOversight: true,
    forceTopicBankIfMissing: true,
  });

  if (!tick.ok) {
    const detail = tick.detail;
    const msg =
      typeof detail === "string"
        ? detail
        : detail && typeof detail === "object" && "status" in detail
          ? JSON.stringify(detail).slice(0, 4000)
          : "Incremental tick failed";
    return NextResponse.json(
      {
        ok: false,
        source: "incremental",
        stage: tick.stage,
        vertical_id: tick.vertical_id,
        vertical_label: tick.vertical_label,
        cadence_tick: tick.cadence_tick,
        error: msg,
      },
      { status: tick.stage === "site" ? 502 : 200 },
    );
  }

  if (!tick.site) {
    return NextResponse.json({
      ok: true,
      source: "incremental",
      vertical_id: tick.vertical_id,
      vertical_label: tick.vertical_label,
      cadence_tick: tick.cadence_tick,
      seo: { status: tick.seo.status },
      publishing: { status: tick.publishing.status },
      publish: {
        ok: false,
        skipped: true as const,
        reason:
          "Site publish was not returned (unexpected after forceSitePublish). Check server logs.",
      },
    });
  }

  if (!tick.site.ok) {
    return NextResponse.json(
      {
        ok: false,
        source: "incremental",
        vertical_id: tick.vertical_id,
        vertical_label: tick.vertical_label,
        cadence_tick: tick.cadence_tick,
        publish: { ok: false, error: tick.site.error },
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    source: "incremental" as const,
    vertical_id: tick.vertical_id,
    vertical_label: tick.vertical_label,
    cadence_tick: tick.cadence_tick,
    publish: {
      ok: true as const,
      slug: tick.site.slug,
      path: tick.site.path,
    },
  });
}
