import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runNewsPreprodSerpChecklist } from "@/lib/runNewsPreprodSerpChecklist";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Logged-in admin: Pre-Production Serp pool + 30-item AI checklist (Firecrawl excerpts) — no publish.
 * Analogous to “all SEO lanes” (topic/keyword refresh) for the News product surface.
 */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const r = await runNewsPreprodSerpChecklist();
  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: r.error, stage: r.stage, job: "news-preprod-sweep" },
      { status: 502 },
    );
  }
  return NextResponse.json({
    ok: true,
    job: "news-preprod-sweep",
    runId: r.runId,
    poolSize: r.poolSize,
    checklistSize: r.checklistSize,
  });
}
