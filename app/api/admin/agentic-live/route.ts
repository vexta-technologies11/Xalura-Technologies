import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildHierarchyChartPayload } from "@/lib/agenticHierarchyChartData";
import {
  enrichLastActionSummariesWithGemini,
  fallbackLastActionSummary,
  hierarchyPersonaIds,
} from "@/lib/agenticHierarchyGemini";
import { getAgenticLiveSnapshot } from "@/lib/agenticLiveSnapshot";
import { resolveWorkerEnv } from "@/xalura-agentic/lib/resolveWorkerEnv";

export const dynamic = "force-dynamic";

async function envFlagTrue(name: string): Promise<boolean> {
  const v = ((await resolveWorkerEnv(name)) ?? "").trim().toLowerCase();
  return v === "true" || v === "1";
}

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
    const [cCompliance, cFounder, graphicDesignerOn] = await Promise.all([
      envFlagTrue("AGENTIC_COMPLIANCE_ON_PUBLISH"),
      envFlagTrue("AGENTIC_FOUNDER_OVERSIGHT_ON_PUBLISH"),
      envFlagTrue("AGENTIC_GRAPHIC_DESIGNER_ON_PUBLISH"),
    ]);
    const complianceOrFounderEmailOn = cCompliance || cFounder;
    const chart = buildHierarchyChartPayload(cwd, snapshot, {
      complianceOrFounderEmailOn,
      graphicDesignerOn,
    });
    const gem = await enrichLastActionSummariesWithGemini(chart, snapshot);
    const ids = hierarchyPersonaIds(chart);
    const lastActionSummaries: Record<string, string> = {};
    for (const id of ids) {
      const g = gem?.[id]?.trim();
      lastActionSummaries[id] = g && g.length > 0 ? g : fallbackLastActionSummary(chart.personaActivity[id]);
    }
    const chartOut = { ...chart, lastActionSummaries };
    return NextResponse.json({ ...snapshot, chart: chartOut });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
