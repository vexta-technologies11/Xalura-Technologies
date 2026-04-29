import { appendEvent } from "../eventQueue";
import { isAgenticDiskWritable } from "../agenticDisk";
import { runAgent } from "../gemini";
import { ARTICLE_SUBCATEGORY_OPTIONS } from "@/lib/articleSubcategories";
import {
  ARTICLE_SUBCATEGORY_TO_AGENT_LANE_ID,
  isArticleSubcategoryAgentLaneId,
} from "@/lib/articleSubcategoryAgentLanes";
import { topicBankSupabaseEnabled } from "@/lib/agenticTopicBankSupabase";
import { buildCrawlSummary } from "./topicBankRefresh";
import { readJsonFile, writeJsonFile } from "./jsonStore";
import { topicBankLastAuditPath } from "./paths";
import { serpApiSearch } from "./serpApiSearch";
import { geminiSerpOrganicFallback } from "../researchFallback";
import type { ContentType, TopicBankEntry, TopicBankFile } from "./types";
import { readTopicBank, writeTopicBank, newTopicId } from "./topicBankStore";
import { writeSeoTrendLogsFromBank } from "./seoTrendLogsStore";
import { recentKeywords } from "./publishedTopicsStore";
import { readTopicRotation } from "./topicRotationStore";
import {
  hoursSinceLastTopicBankCrawl,
  minSerpIntervalHoursFromEnv,
} from "./topicBankSerpPolicy";
import { auditPreviousTopicBank, type RefreshTopicBankResult } from "./topicBankRefresh";

const PILLAR_SERP = 8;
const PILLAR_MAX_CRAWL_URLS = 4;
const PILLAR_MIN_SCORE = 90;

function pillarSerpQuery(subcategoryLabel: string): string {
  return [subcategoryLabel, "AI technology", "software", "2026"]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

function extractJsonObject(raw: string): Record<string, unknown> | null {
  const t = raw.trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const o = JSON.parse(t.slice(start, end + 1)) as unknown;
    return o && typeof o === "object" && !Array.isArray(o) ? (o as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * One Gemini pass: single topic for a fixed pillar (Serp + crawl context already in prompt).
 */
export async function discoverPillarTopicWithGemini(params: {
  laneId: string;
  subcategoryLabel: string;
  searchSummary: string;
  crawlSummary: string;
  rank: number;
}): Promise<{ ok: true; topic: TopicBankEntry } | { ok: false; error: string }> {
  const { laneId, subcategoryLabel, searchSummary, crawlSummary, rank } = params;
  const labelQuoted = JSON.stringify(subcategoryLabel);

  const task = `You are the SEO research agent for Xalura Tech. Propose **one** high-value article topic for a single **fixed** content pillar.

**Fixed pillar (do not change):**
- \`vertical_id\` must be exactly: ${JSON.stringify(laneId)}
- The article library \`subcategory\` string must be **exactly** (character-for-character): ${labelQuoted}

**Domain:** Tech and AI only. Reject medical diagnosis, legal advice, personal finance picks.

**Web search (Serp) snapshot:**
${searchSummary.slice(0, 10_000)}

**Page excerpts (Firecrawl):**
${crawlSummary.slice(0, 12_000)}

Return **ONLY** a single JSON object (no markdown fences), shape:
{
  "keyword": "primary SEO phrase, concrete (max ~100 chars)",
  "angle": "optional one-line editorial angle",
  "content_type": "article",
  "final_score": 90,
  "supporting_keywords": ["2–8 short phrases"],
  "source_urls": ["https://..."  ]
}
Use \`source_urls\` only from the evidence above. \`final_score\` must be 89–100.`;

  const raw = await runAgent({
    role: "Worker",
    department: "SEO & Audit",
    task,
    context: { mode: "pillar_topic_bank" },
  });
  const o = extractJsonObject(raw);
  if (!o) {
    return { ok: false, error: "Gemini did not return a parseable JSON object" };
  }
  const keyword = typeof o["keyword"] === "string" ? o["keyword"].trim() : "";
  if (!keyword) {
    return { ok: false, error: "Missing keyword in JSON" };
  }
  const content_type: ContentType =
    o["content_type"] === "course" ? "course" : "article";
  const fs =
    typeof o["final_score"] === "number" && Number.isFinite(o["final_score"])
      ? Math.min(100, Math.max(80, o["final_score"] as number))
      : PILLAR_MIN_SCORE;
  const supporting_keywords = Array.isArray(o["supporting_keywords"])
    ? (o["supporting_keywords"] as unknown[])
        .filter((x): x is string => typeof x === "string")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 8)
    : [];
  const source_urls = Array.isArray(o["source_urls"])
    ? (o["source_urls"] as unknown[])
        .filter((x): x is string => typeof x === "string" && /^https?:\/\//i.test(x))
        .slice(0, 8)
    : [];
  const angle =
    typeof o["angle"] === "string" && o["angle"].trim() ? o["angle"].trim().slice(0, 500) : undefined;
  return {
    ok: true,
    topic: {
      id: newTopicId(),
      rank,
      vertical_id: laneId,
      vertical_label: subcategoryLabel,
      angle,
      keyword,
      subcategory: subcategoryLabel,
      content_type,
      final_score: fs,
      supporting_keywords,
      source_urls,
      status: "unused",
      used_at: null,
    },
  };
}

/**
 * Refills the topic bank with **10 fresh topics** (one per public subcategory / `sc-…` lane):
 * for each pillar, **SerpAPI** + **Firecrawl** + **Gemini** to produce a scored row with
 * `vertical_id` = that lane id and `subcategory` = the exact public label (for gates + eligibility).
 * Replaces previous `topics` in the bank file (same as full catalog refresh).
 */
export async function refreshTopicBankForTenPillars(
  cwd: string,
  opts: { skipAudit?: boolean; forceSerp?: boolean } = {},
): Promise<RefreshTopicBankResult> {
  const forceSerp = opts.forceSerp === true;
  if (!opts.skipAudit) {
    await auditPreviousTopicBank(cwd);
  }

  const bankPeek = await readTopicBank(cwd);
  const minH = minSerpIntervalHoursFromEnv();
  if (!forceSerp && minH > 0 && bankPeek?.last_crawled_at) {
    const ageH = hoursSinceLastTopicBankCrawl(bankPeek.last_crawled_at);
    if (ageH < minH) {
      const scLaneUnused = (bankPeek.topics ?? []).filter(
        (t) => t.status === "unused" && isArticleSubcategoryAgentLaneId(t.vertical_id),
      );
      if (scLaneUnused.length >= 10) {
        return {
          ok: true,
          topicCount: bankPeek.topics.length,
          skippedSerp: true,
        };
      }
      const eligibleAt = new Date(
        new Date(bankPeek.last_crawled_at).getTime() + minH * 3_600_000,
      ).toISOString();
      return {
        ok: false,
        error: `Min Serp interval (${minH}h) blocks a full pillar refresh until ~${eligibleAt}. The admin route sets forceSerp; if you see this, set AGENTIC_TOPIC_BANK_MIN_SERP_INTERVAL_HOURS=0 for tests.`,
      };
    }
  }

  const rot = readTopicRotation(cwd);
  const recent = recentKeywords(cwd, 30);
  const lastAudit = readJsonFile<{ audit?: { next_crawl_recommendation?: string } }>(
    topicBankLastAuditPath(cwd),
    {},
  );
  const auditHint =
    typeof lastAudit.audit?.next_crawl_recommendation === "string"
      ? lastAudit.audit.next_crawl_recommendation
      : undefined;

  const topics: TopicBankEntry[] = [];
  let r = 1;
  for (const label of ARTICLE_SUBCATEGORY_OPTIONS) {
    const laneId = ARTICLE_SUBCATEGORY_TO_AGENT_LANE_ID[label]!;
    const q = pillarSerpQuery(label);
    const search = await serpApiSearch(q, PILLAR_SERP);
    const items = (search.items ?? []).filter(Boolean);
    let searchSummary: string;
    let crawlSummary: string;

    if (search.error || items.length === 0) {
      // Per-pillar SerpAPI exhausted — use Gemini fallback
      const fb = await geminiSerpOrganicFallback(q, 4, PILLAR_SERP);
      if (fb.items && fb.items.length >= 2) {
        searchSummary = JSON.stringify(
          fb.items.map((i) => ({ title: i.title, link: i.link, snippet: i.snippet })),
        );
        crawlSummary = "(Gemini fallback — no Firecrawl pages available)";
      } else {
        return { ok: false, error: `SerpAPI & Gemini fallback (${label}): ${search.error || "no items"}` };
      }
    } else {
      const urls = Array.from(
        new Set(items.map((i) => i.link).filter(Boolean) as string[]),
      ).slice(0, PILLAR_MAX_CRAWL_URLS);
      crawlSummary = await buildCrawlSummary(urls);
      searchSummary = JSON.stringify(
        items.map((i) => ({ title: i.title, link: i.link, snippet: i.snippet })),
      );
    }

    const g = await discoverPillarTopicWithGemini({
      laneId,
      subcategoryLabel: label,
      searchSummary: `Audit hint: ${auditHint ?? "(none)"}\nCooldown keywords: ${JSON.stringify(rot.cooldown_topics.map((c) => c.topic))}\nRecent published: ${JSON.stringify(recent.map((x) => x.keyword))}\n${searchSummary}`,
      crawlSummary,
      rank: r,
    });
    if (!g.ok) {
      return { ok: false, error: `Pillar “${label}” (${laneId}): ${g.error}` };
    }
    topics.push(g.topic);
    r += 1;
  }

  const prev = (await readTopicBank(cwd)) ?? bankPeek;
  const next: TopicBankFile = {
    last_crawled_at: new Date().toISOString(),
    crawl_count: (prev?.crawl_count ?? 0) + 1,
    used_count: 0,
    depleted: false,
    topics: topics.map((t, i) => ({ ...t, rank: i + 1 })),
  };
  try {
    await writeTopicBank(cwd, next);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Topic bank write failed: ${msg}` };
  }
  const persisted = await readTopicBank(cwd);
  if (!persisted?.topics?.length) {
    return {
      ok: false,
      error: topicBankSupabaseEnabled()
        ? "Pillar bank did not persist (Supabase read-back empty)."
        : isAgenticDiskWritable()
          ? "Pillar bank did not persist after write."
          : "Agentic filesystem read-only; enable AGENTIC_TOPIC_BANK_USE_SUPABASE or use a writable host.",
    };
  }
  writeSeoTrendLogsFromBank(cwd, persisted);
  appendEvent(
    {
      type: "TOPIC_BANK_REFRESHED",
      payload: {
        topic_count: persisted.topics.length,
        crawl_count: persisted.crawl_count,
        mode: "ten_pillars",
        trend_log_path: "state/seo-trend-logs.json",
      },
    },
    cwd,
  );
  return { ok: true, topicCount: next.topics.length };
}
