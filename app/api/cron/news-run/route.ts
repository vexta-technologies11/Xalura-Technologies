import { NextResponse } from "next/server";
import { runNewsPipeline } from "@/xalura-agentic/lib/news/runNewsPipeline";

export const dynamic = "force-dynamic";

function extractBearer(request: Request): string | null {
  const h = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim();
}

/**
 * Full News team pipeline: Pre-Prod → Writers → Chief of Audit → Head of News log → Leonardo → `news_items`.
 * Auth: `Authorization: Bearer <AGENTIC_CRON_SECRET>`.
 */
export async function POST(request: Request) {
  const expected = process.env["AGENTIC_CRON_SECRET"]?.trim();
  if (!expected) {
    return NextResponse.json(
      { error: "AGENTIC_CRON_SECRET is not configured on this deployment" },
      { status: 503 },
    );
  }
  const token = extractBearer(request);
  if (!token || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cwd = process.cwd();
  const res = await runNewsPipeline({ cwd, withImage: true, publishToSite: true });
  if (res.status === "error") {
    return NextResponse.json(
      { ok: false, job: "news-run", ...res },
      { status: 502 },
    );
  }
  if (res.status === "aborted") {
    return NextResponse.json({ ok: false, job: "news-run", ...res }, { status: 200 });
  }
  return NextResponse.json({ ok: true, job: "news-run", ...res });
}
