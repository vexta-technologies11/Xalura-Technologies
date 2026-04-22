import { NextResponse } from "next/server";
import { getAgenticHealth } from "../../../xalura-agentic/lib/agenticStatus";

export const dynamic = "force-dynamic";

/**
 * JSON snapshot: cycles, event queue size, failed ops — for uptime / dashboards.
 * Query: `?gemini_ping=1` — one real Gemini request when `GEMINI_API_KEY` resolves (uses quota).
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("debug") ?? "";
    const expected = process.env["AGENTIC_HEALTH_DEBUG_TOKEN"]?.trim();
    const includeGeminiDebug =
      !!expected && token.length > 0 && token === expected;

    const pingRaw = (url.searchParams.get("gemini_ping") ?? "").trim();
    const geminiPing = /^(1|true|yes)$/i.test(pingRaw);

    return NextResponse.json(
      await getAgenticHealth(process.cwd(), {
        includeGeminiDebug,
        requestUrlOrigin: url.origin,
        geminiPing,
      }),
      { status: 200 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
