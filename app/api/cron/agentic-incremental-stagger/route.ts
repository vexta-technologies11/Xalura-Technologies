import { NextResponse } from "next/server";
import { runIncrementalStaggerStep } from "@/xalura-agentic/lib/incrementalStagger";

export const dynamic = "force-dynamic";

function extractBearer(request: Request): string | null {
  const h = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim();
}

/**
 * **Staggered** incremental: one HTTP call = one leg (SEO → next call publishing → next site).
 * Set `AGENTIC_INCREMENTAL_STAGGER=true` and schedule this every ~15m (same `AGENTIC_CRON_SECRET` as other crons).
 * Do **not** run the monolithic `agentic-incremental` on the same cadence while stagger is on.
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
  const out = await runIncrementalStaggerStep(cwd, {
    forceSitePublish: process.env["AGENTIC_INCREMENTAL_STAGGER_FORCE_SITE"]?.trim() === "true",
    awaitFounderOversight: process.env["AGENTIC_INCREMENTAL_STAGGER_AWAIT_OVERSIGHT"]?.trim() === "true",
    forceTopicBankIfMissing: process.env["AGENTIC_INCREMENTAL_STAGGER_FORCE_BANK"]?.trim() === "true",
  });

  if (!out.ok) {
    return NextResponse.json(
      { ok: false, source: "cron", job: "agentic-incremental-stagger", step: out.step, error: out.error },
      { status: 200 },
    );
  }

  return NextResponse.json({
    ok: true,
    source: "cron" as const,
    job: "agentic-incremental-stagger" as const,
    step: out.step,
    detail: out.detail,
  });
}
