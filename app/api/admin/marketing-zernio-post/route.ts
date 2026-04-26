import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runMarketingZernioSameDayPost } from "@/lib/marketingZernioSameDayPost";

/**
 * Logged-in admin. Triggers one Marketing → Zernio post (same code path as pipeline), with
 * `adminForcePost` so it bypasses `AGENTIC_MARKETING_ZERNIO_POST` and the cooldown when `force` is true.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { force?: boolean } = {};
  try {
    body = (await request.json()) as { force?: boolean };
  } catch {
    body = {};
  }
  const force = body.force === true;

  const cwd = process.cwd();
  const result = await runMarketingZernioSameDayPost(cwd, { adminForcePost: force });

  return NextResponse.json({
    ok: true,
    force,
    result,
  });
}
