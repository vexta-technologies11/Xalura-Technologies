import { NextResponse } from "next/server";
import { runChiefSweepCron } from "@/xalura-agentic/lib/chiefCronSweep";

export const dynamic = "force-dynamic";

function extractBearer(request: Request): string | null {
  const h = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim();
}

/**
 * Every ~10 minutes: Chief AI reads cycle state + trend/event snapshot (no Serp).
 * Appends one JSON summary line to `xalura-agentic/state/chief-sweep-log.jsonl`.
 *
 * Auth: `Authorization: Bearer <AGENTIC_CRON_SECRET>`.
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
  const r = await runChiefSweepCron(cwd);

  if (!r.ok) {
    return NextResponse.json(
      { ok: false, source: "cron", job: "agentic-chief-sweep", error: r.error },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    source: "cron" as const,
    job: "agentic-chief-sweep" as const,
    chief_preview: r.markdown.slice(0, 1200),
  });
}
