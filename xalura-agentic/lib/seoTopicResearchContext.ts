import type { AuditStrategyOverlayV1 } from "./auditStrategyOverlayStore";
import { firecrawlScrape } from "./phase7Clients";
import { serpApiSearch } from "./contentWorkflow/serpApiSearch";
import {
  serpApiSearchWithFallback,
  firecrawlScrapeWithFallback,
} from "./researchFallback";

const MAX_SERP = 8;
const MAX_CRAWL_URLS = 3;
const PER_URL = 4_000;

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n\n…(truncated)`;
}

/** Same query string used for `phase7_topic_serp_query` and SerpAPI (for smokes / debugging). */
export function buildTopicSerpQuery(keyword: string, subcategory: string): string {
  return [keyword, subcategory, "AI technology"]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

/**
 * Per SEO **topic** run: SerpAPI search for the pillar/keyword, then Firecrawl markdown for
 * top organic URLs. Both have Gemini fallbacks when APIs are exhausted.
 */
export async function buildSeoTopicResearchContext(params: {
  keyword: string;
  subcategory: string;
  verticalId?: string;
  verticalLabel?: string;
  skipPhase7Fetch?: boolean;
  /** Merged with topic Serp query after each 10-cycle audit (on-pillar reframing). */
  strategyOverlay?: AuditStrategyOverlayV1 | null;
}): Promise<Record<string, unknown>> {
  if (params.skipPhase7Fetch) return {};
  if (process.env["AGENTIC_SEO_SKIP_TOPIC_SERP"]?.trim() === "1") {
    return {
      phase7_topic_research_skipped: "AGENTIC_SEO_SKIP_TOPIC_SERP=1",
    };
  }

  const baseQ = buildTopicSerpQuery(params.keyword, params.subcategory);
  const o = params.strategyOverlay;
  const q = (() => {
    if (o?.seo_serp_query_hint?.trim()) {
      return [baseQ, o.seo_serp_query_hint.trim(), o.seo_positioning?.trim() ? `(${o.seo_positioning.trim().slice(0, 120)})` : ""]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 220);
    }
    if (o?.seo_positioning?.trim()) {
      return [baseQ, o.seo_positioning.trim().slice(0, 100)]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 220);
    }
    return baseQ;
  })();

  const out: Record<string, unknown> = {
    instructions:
      "Use `phase7_topic_serp_organic` (live web titles/snippets) and `phase7_topic_serp_crawl_markdown` (page excerpts) as primary evidence. Ground the keyword in this subcategory; do not invent sources. The assigned **keyword row is fixed** — `phase7_topic_serp_query` may include Chief/Executive *framing* (hot subtopics) but you must not abandon the topic.",
    phase7_topic_serp_query: q,
  };
  if (o?.seo_positioning?.trim()) {
    out.audit_strategy_seo_positioning = o.seo_positioning.trim();
  }
  const notes: string[] = [];

  // Use fallback wrapper: if SerpAPI returns < 5 items, Gemini fills in
  const serp = await serpApiSearchWithFallback(
    (q, n) => serpApiSearch(q, n),
    q,
    MAX_SERP,
    5,
  );
  const items = serp.items ?? [];
  if (serp.fallback) {
    notes.push(`Topic SerpAPI: using Gemini fallback (${items.length} items)`);
  }
  out.phase7_topic_serp_organic = items.slice(0, MAX_SERP).map((i) => ({
    title: i.title,
    link: i.link,
    snippet: i.snippet,
  }));

  const urls = Array.from(
    new Set(
      items
        .map((i) => i.link)
        .filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u)),
    ),
  ).slice(0, MAX_CRAWL_URLS);

  if (urls.length === 0) {
    notes.push("Topic research: no http(s) URLs to Firecrawl");
  } else {
    const parts: string[] = [];
    for (const url of urls) {
      const r = await firecrawlScrapeWithFallback(
        (u, _fmts) => firecrawlScrape(u, ["markdown"]),
        url,
      );
      if (r.fallback) {
        notes.push(`Firecrawl ${url}: using Gemini fallback`);
      }
      if (r.markdown) {
        parts.push(`## ${url}\n${truncate(r.markdown, PER_URL)}\n`);
      }
    }
    if (parts.length) {
      out.phase7_topic_serp_crawl_markdown = parts.join("\n");
    }
  }

  if (notes.length) {
    out.phase7_topic_research_notes = notes.join(" | ");
  }
  return out;
}

export function mergePhase7Extras(
  base: Record<string, unknown>,
  research: Record<string, unknown>,
): Record<string, unknown> {
  const o = { ...base, ...research };
  const rNote = research["phase7_topic_research_notes"];
  if (rNote != null) delete o["phase7_topic_research_notes"];
  const parts: string[] = [];
  if (typeof base["phase7_integration_notes"] === "string" && base["phase7_integration_notes"]) {
    parts.push(base["phase7_integration_notes"] as string);
  }
  if (typeof rNote === "string" && rNote) parts.push(rNote);
  if (parts.length) o["phase7_integration_notes"] = parts.join(" | ");
  return o;
}
