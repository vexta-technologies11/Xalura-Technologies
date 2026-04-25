import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runNewsPipeline } from "@/xalura-agentic/lib/news/runNewsPipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

/**
 * Logged-in admin: full news pipeline (same as cron `POST /api/cron/news-run`).
 */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cwd = process.cwd();
  const res = await runNewsPipeline({ cwd, withImage: true, publishToSite: true });
  if (res.status === "error") {
    return NextResponse.json({ ok: false, job: "news-run", ...res }, { status: 502 });
  }
  if (res.status === "aborted") {
    return NextResponse.json({ ok: false, job: "news-run", ...res }, { status: 200 });
  }
  return NextResponse.json({ ok: true, job: "news-run", ...res });
}
