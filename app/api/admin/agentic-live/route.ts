import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAgenticLiveSnapshot } from "@/lib/agenticLiveSnapshot";

export const dynamic = "force-dynamic";

/** Logged-in admin: live agentic hierarchy feed (no secrets). */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = getAgenticLiveSnapshot(process.cwd());
    return NextResponse.json(snapshot);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
