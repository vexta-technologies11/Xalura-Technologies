import { NextResponse } from "next/server";
import { getAgenticHealth } from "../../../xalura-agentic/lib/agenticStatus";

export const dynamic = "force-dynamic";

/** JSON snapshot: cycles, event queue size, failed ops — for uptime / dashboards. */
export function GET() {
  try {
    return NextResponse.json(getAgenticHealth(process.cwd()), { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
