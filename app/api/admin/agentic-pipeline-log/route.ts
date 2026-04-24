import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX = 100;
const DEFAULT = 30;

/**
 * Logged-in admin only. Returns recent rows from `agentic_pipeline_stage_log` (service role read).
 * Query: `?limit=30` (1–100).
 */
export async function GET(req: NextRequest) {
  const supabaseAuth = createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = req.nextUrl.searchParams.get("limit");
  const n = Math.min(
    MAX,
    Math.max(1, raw ? parseInt(raw, 10) || DEFAULT : DEFAULT),
  );

  const svc = createServiceClient();
  if (!svc) {
    return NextResponse.json(
      { error: "Service client unavailable (SUPABASE_SERVICE_ROLE_KEY / URL)" },
      { status: 503 },
    );
  }

  const { data, error } = await svc
    .from("agentic_pipeline_stage_log")
    .select(
      "id, created_at, release_id, department, agent_lane_id, stage, event, summary, detail",
    )
    .order("created_at", { ascending: false })
    .limit(n);

  if (error) {
    return NextResponse.json(
      { error: error.message, hint: "Run the `agentic_pipeline_stage_log` block in supabase/schema.sql" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    count: data?.length ?? 0,
    limit: n,
    rows: data ?? [],
  });
}
