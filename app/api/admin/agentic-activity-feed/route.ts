import { NextResponse } from "next/server";
import { fetchAgenticPipelineLogsForAdminFeed } from "@/lib/agenticPipelineLogSupabase";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 400;

/**
 * Logged-in admin: newest-first rows from `agentic_pipeline_stage_log` (same table as pipeline + Chief).
 * Client applies 1000-word display cap.
 */
export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = new URL(req.url).searchParams.get("limit");
  const n = Math.min(
    500,
    Math.max(1, raw ? parseInt(raw, 10) || DEFAULT_LIMIT : DEFAULT_LIMIT),
  );

  const rows = await fetchAgenticPipelineLogsForAdminFeed(n);
  return NextResponse.json({ ok: true, count: rows.length, rows });
}
