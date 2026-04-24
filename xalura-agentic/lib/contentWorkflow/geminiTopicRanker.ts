import { runAgent } from "../gemini";
import {
  CONTENT_VERTICALS,
  defaultVerticalId,
  getVerticalById,
  isValidVerticalId,
  verticalCatalogForPrompt,
} from "./contentVerticals";
import type { ContentType, TopicBankEntry } from "./types";
import { newTopicId } from "./topicBankStore";

/** One Serp snapshot → 20 ranked rows (trend log + bank); ranks 1–14 cover each vertical once. */
export const TOPIC_BANK_RANK_COUNT = 20;
const VERTICAL_COUNT = CONTENT_VERTICALS.length;

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

function normalizeEntry(
  o: Record<string, unknown>,
  rank: number,
): TopicBankEntry | null {
  const keyword = typeof o["keyword"] === "string" ? o["keyword"].trim() : "";
  if (!keyword) return null;
  let vertical_id =
    typeof o["vertical_id"] === "string" ? o["vertical_id"].trim() : "";
  if (!isValidVerticalId(vertical_id)) {
    vertical_id = CONTENT_VERTICALS[(rank - 1) % VERTICAL_COUNT]!.id;
  }
  const vMeta = getVerticalById(vertical_id);
  const vertical_label = vMeta?.label ?? vertical_id;
  const angle =
    typeof o["angle"] === "string" && o["angle"].trim() ? o["angle"].trim() : undefined;
  const subcategory =
    typeof o["subcategory"] === "string" ? o["subcategory"].trim() : vertical_label;
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
    vertical_id,
    vertical_label,
    angle,
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
 * Rank exactly `TOPIC_BANK_RANK_COUNT` topics from one Serp + crawl snapshot.
 * Ranks 1–N (N = number of catalog verticals) must each use a **distinct** `vertical_id`.
 */
export async function rankTopicsWithGemini(params: {
  searchSummary: string;
  crawlSummary: string;
  last5Subcategories: string[];
  cooldownTopics: string[];
  recentKeywords30d: string[];
  auditHint?: string;
}): Promise<{ topics: TopicBankEntry[]; raw_error?: string }> {
  const distinctRule = `Ranks **1 through ${VERTICAL_COUNT}** must each use a **different** \`vertical_id\` from the catalog (cover **all** ${VERTICAL_COUNT} ids exactly once across those rows). Ranks **${VERTICAL_COUNT + 1} through ${TOPIC_BANK_RANK_COUNT}**: additional high-signal topics; you may repeat \`vertical_id\` but stay AI/tech and avoid repeating keywords from ranks 1–${VERTICAL_COUNT} when possible.`;

  const task = `You are the SEO research agent for Xalura Tech (content workflow).

**Domain:** Tech and AI only. Reject lifestyle, consumer gossip, non-tech entertainment.

**Content vertical catalog (use these \`vertical_id\` strings exactly):**
${verticalCatalogForPrompt()}

**Coverage rule:** ${distinctRule}

**Rotation:** Prefer not to repeat these subcategories at the top if alternatives exist (last 5 used): ${JSON.stringify(params.last5Subcategories)}
**Cooldown topic labels (avoid):** ${JSON.stringify(params.cooldownTopics)}
**Keywords published in the last 30 days (avoid repeating):** ${JSON.stringify(params.recentKeywords30d.slice(0, 40))}

**Previous bank audit hint (may be empty):** ${params.auditHint ?? "(none)"}

**Web search results from SerpAPI (titles, links, snippets):**
${params.searchSummary.slice(0, 12_000)}

**Firecrawl markdown excerpts from selected URLs:**
${params.crawlSummary.slice(0, 14_000)}

Return **ONLY** a JSON array (no markdown fences) of exactly ${TOPIC_BANK_RANK_COUNT} objects, each:
{
  "rank": 1,
  "vertical_id": "${defaultVerticalId()}",
  "angle": "one-line editorial angle (optional)",
  "keyword": "primary phrase",
  "subcategory": "short lane label (may mirror vertical)",
  "content_type": "article" | "course",
  "final_score": 0.0,
  "supporting_keywords": ["..."],
  "source_urls": ["https://..."]
}
Sort by final_score descending. **Regulated verticals** (\`healthcare-bioinformatics\`, \`legal-compliance-tooling\`): tooling/research/product angles only — no clinical or legal advice.`;

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
    if (topics.length >= TOPIC_BANK_RANK_COUNT) break;
  }
  return { topics };
}
