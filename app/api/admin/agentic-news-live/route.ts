import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNewsTeamLiveSnapshot } from "@/lib/agenticLiveSnapshot";
import { buildNewsTeamHierarchyChartPayload } from "@/lib/newsTeamHierarchyChartData";
import { loadAgentNamesResolved } from "@/lib/loadAgentNamesResolved";
import { resolveWorkerEnv } from "@/xalura-agentic/lib/resolveWorkerEnv";

export const dynamic = "force-dynamic";

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
    const leo = (await resolveWorkerEnv("LEONARDO_API_KEY"))?.trim();
    const photographerOn = Boolean(leo);
    const snapshot = getNewsTeamLiveSnapshot(cwd);
    const names = await loadAgentNamesResolved(cwd);
    const chart = buildNewsTeamHierarchyChartPayload(cwd, snapshot, { photographerOn, names });
    const chartOut = { ...chart, lastActionSummaries: {} as Record<string, string> };
    return NextResponse.json({ ...snapshot, chart: chartOut });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
