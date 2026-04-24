import { NextResponse } from "next/server";
import { runIncrementalHourlyPublish } from "@/xalura-agentic/lib/incrementalContentCron";

export const dynamic = "force-dynamic";

function extractBearer(request: Request): string | null {
  const h = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim();
}

/**
 * Hourly incremental: one vertical (round-robin) → SEO (topic bank, no forced Serp) →
 * `KEYWORD_READY` → Publishing → optional site upsert.
 *
 * Serp refresh is governed by `AGENTIC_TOPIC_BANK_MIN_SERP_INTERVAL_HOURS` (default 72).
 * Auth: `Authorization: Bearer <AGENTIC_CRON_SECRET>` (same as other agentic crons).
 */
export async function POST(request: Request) {
  const expected = process.env["AGENTIC_CRON_SECRET"]?.trim();
  if (!expected) {
    return NextResponse.json(
      { error: "AGENTIC_CRON_SECRET is not configured on this deployment" },
      { status: 503 },
    );
  }

  const token = extractBearer(request);
  if (!token || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cwd = process.cwd();
  const out = await runIncrementalHourlyPublish(cwd);

  if (!out.ok) {
    return NextResponse.json(
      {
        ok: false,
        source: "cron",
        job: "agentic-incremental",
        vertical_id: out.vertical_id,
        vertical_label: out.vertical_label,
        cadence_tick: out.cadence_tick,
        stage: out.stage,
        detail:
          typeof out.detail === "string"
            ? out.detail
            : JSON.parse(JSON.stringify(out.detail)) as unknown,
      },
      { status: out.stage === "site" ? 502 : 200 },
    );
  }

  return NextResponse.json({
    ok: true,
    source: "cron" as const,
    job: "agentic-incremental" as const,
    vertical_id: out.vertical_id,
    vertical_label: out.vertical_label,
    cadence_tick: out.cadence_tick,
    keyword: out.seo.contentWorkflow?.keyword,
    publish: out.site,
  });
}
