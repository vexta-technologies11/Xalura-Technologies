import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildHierarchyChartPayload } from "@/lib/agenticHierarchyChartData";
import { enrichHierarchyNarrativesWithGemini } from "@/lib/agenticHierarchyGemini";
import { getAgenticLiveSnapshot } from "@/lib/agenticLiveSnapshot";

export const dynamic = "force-dynamic";

/** Logged-in admin: live agentic hierarchy + org chart payload (no secrets). */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cwd = process.cwd();
    const snapshot = getAgenticLiveSnapshot(cwd);
    const chart = buildHierarchyChartPayload(cwd, snapshot);
    const narratives = await enrichHierarchyNarrativesWithGemini(chart, snapshot);
    const chartOut = narratives ? { ...chart, narratives } : chart;
    return NextResponse.json({ ...snapshot, chart: chartOut });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
