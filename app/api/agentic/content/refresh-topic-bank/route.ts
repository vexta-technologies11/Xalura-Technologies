import { NextResponse } from "next/server";
import { extractIngestBearerToken, getSharedIngestSecret } from "@/lib/ingestAuth";
import { CONTENT_VERTICALS } from "@/xalura-agentic/lib/contentWorkflow/contentVerticals";
import { TOPIC_BANK_RANK_COUNT } from "@/xalura-agentic/lib/contentWorkflow/geminiTopicRanker";
import { forceRefreshTopicBank } from "@/xalura-agentic/lib/contentWorkflow/topicBankRefresh";

export const dynamic = "force-dynamic";

function authorize(request: Request): boolean {
  const token = extractIngestBearerToken(request);
  const runToken = process.env["AGENTIC_RUN_TOKEN"]?.trim();
  if (runToken) return !!token && token === runToken;
  const ingest = getSharedIngestSecret();
  return !!token && !!ingest && token === ingest;
}

/**
 * POST — force a topic-bank refresh (SerpAPI + Firecrawl + Gemini).
 * Same auth as `POST /api/agentic/run`. Optional JSON: `{ "skipAudit": true }`.
 */
export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let skipAudit = false;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    skipAudit = body["skipAudit"] === true;
  } catch {
    /* empty body ok */
  }
  const cwd = process.cwd();
  const out = await forceRefreshTopicBank(cwd, { skipAudit });
  if (!out.ok) {
    return NextResponse.json({ ok: false, error: out.error }, { status: 502 });
  }
  return NextResponse.json({
    ok: true,
    topic_count: out.topicCount,
    expected_topic_count: TOPIC_BANK_RANK_COUNT,
    vertical_catalog_size: CONTENT_VERTICALS.length,
    trend_log_relative: "xalura-agentic/state/seo-trend-logs.json",
  });
}
