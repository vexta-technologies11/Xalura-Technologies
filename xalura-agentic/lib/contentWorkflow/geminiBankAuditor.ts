import { runAgent } from "../gemini";
import type { TopicBankAuditGeminiShape, TopicBankEntry } from "./types";

function extractJsonObject(raw: string): TopicBankAuditGeminiShape | null {
  const t = raw.trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1)) as TopicBankAuditGeminiShape;
  } catch {
    return null;
  }
}

export async function auditBankWithGemini(params: {
  usedTopics: TopicBankEntry[];
  gscPageSummary: string;
}): Promise<TopicBankAuditGeminiShape | null> {
  if (!params.usedTopics.length) return null;
  const task = `You are an SEO audit agent for Xalura Tech.

Topics consumed in the last topic-bank window:
${JSON.stringify(
    params.usedTopics.map((t) => ({
      keyword: t.keyword,
      subcategory: t.subcategory,
      content_type: t.content_type,
      score: t.final_score,
      sources: t.source_urls?.slice(0, 3),
    })),
  )}

Search Console page performance snapshot (rows may be partial):
${params.gscPageSummary.slice(0, 10_000)}

Return **ONLY** JSON (no markdown) with this shape:
{
  "top_performing_subcategories": [],
  "underperforming_subcategories": [],
  "patterns": "short text",
  "next_crawl_recommendation": "short text, tech/AI only"
}`;

  const raw = await runAgent({
    role: "Worker",
    department: "SEO & Audit",
    task,
    context: { mode: "topic_bank_audit" },
  });
  return extractJsonObject(raw);
}
