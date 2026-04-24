import { runAgent } from "../gemini";
import type { ContentType, TopicBankEntry } from "./types";
import { newTopicId } from "./topicBankStore";

function extractJsonArray(raw: string): unknown[] | null {
  const t = raw.trim();
  const start = t.indexOf("[");
  const end = t.lastIndexOf("]");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(t.slice(start, end + 1)) as unknown;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeEntry(o: Record<string, unknown>, rank: number): TopicBankEntry | null {
  const keyword = typeof o["keyword"] === "string" ? o["keyword"].trim() : "";
  if (!keyword) return null;
  const subcategory =
    typeof o["subcategory"] === "string" ? o["subcategory"].trim() : "general";
  const content_type: ContentType =
    o["content_type"] === "course" ? "course" : "article";
  const final_score =
    typeof o["final_score"] === "number" && Number.isFinite(o["final_score"])
      ? o["final_score"]
      : 0;
  const supporting_keywords = Array.isArray(o["supporting_keywords"])
    ? (o["supporting_keywords"] as unknown[])
        .filter((x): x is string => typeof x === "string")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const source_urls = Array.isArray(o["source_urls"])
    ? (o["source_urls"] as unknown[])
        .filter((x): x is string => typeof x === "string" && /^https?:\/\//i.test(x))
        .slice(0, 8)
    : [];
  return {
    id: newTopicId(),
    rank,
    keyword,
    subcategory,
    content_type,
    final_score,
    supporting_keywords,
    source_urls,
    status: "unused",
    used_at: null,
  };
}

/**
 * Rank / select top 10 topics from search + crawl signals (Gemini JSON).
 */
export async function rankTopicsWithGemini(params: {
  searchSummary: string;
  crawlSummary: string;
  last5Subcategories: string[];
  cooldownTopics: string[];
  recentKeywords30d: string[];
  auditHint?: string;
}): Promise<{ topics: TopicBankEntry[]; raw_error?: string }> {
  const task = `You are the SEO research agent for Xalura Tech (content workflow).

**Domain:** Tech and AI only. Reject lifestyle, finance, health, pure entertainment.

**Rotation:** Do not repeat these subcategories for the top pick if alternatives exist (last 5 used): ${JSON.stringify(params.last5Subcategories)}
**Cooldown topic labels (avoid):** ${JSON.stringify(params.cooldownTopics)}
**Keywords published in the last 30 days (avoid repeating):** ${JSON.stringify(params.recentKeywords30d.slice(0, 40))}

**Previous bank audit hint (may be empty):** ${params.auditHint ?? "(none)"}

**Web search results from SerpAPI (titles, links, snippets):**
${params.searchSummary.slice(0, 12_000)}

**Firecrawl markdown excerpts from selected URLs:**
${params.crawlSummary.slice(0, 14_000)}

Return **ONLY** a JSON array (no markdown fences) of exactly 10 objects, each:
{
  "rank": 1,
  "keyword": "primary phrase",
  "subcategory": "short lane label",
  "content_type": "article" | "course",
  "final_score": 0.0,
  "supporting_keywords": ["..."],
  "source_urls": ["https://..."]
}
Scores: trend, volume proxy, difficulty/novelty for Xalura audience. Sort by final_score descending.`;

  const raw = await runAgent({
    role: "Worker",
    department: "SEO & Audit",
    task,
    context: { mode: "topic_bank_refresh" },
  });
  const arr = extractJsonArray(raw);
  if (!arr) {
    return { topics: [], raw_error: "Gemini did not return a parseable JSON array" };
  }
  const topics: TopicBankEntry[] = [];
  let r = 1;
  for (const row of arr) {
    if (!row || typeof row !== "object") continue;
    const n = normalizeEntry(row as Record<string, unknown>, r);
    if (n) {
      n.rank = r;
      topics.push(n);
      r += 1;
    }
    if (topics.length >= 10) break;
  }
  return { topics };
}
