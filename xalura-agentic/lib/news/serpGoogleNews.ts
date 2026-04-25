/**
 * SerpAPI Google News + same-day filtering for the News Pre-Production team.
 * @see https://serpapi.com/google-news-api
 */
import { resolveWorkerEnv } from "../resolveWorkerEnv";
import { firecrawlScrape } from "../phase7Clients";

export type GoogleNewsItem = {
  title: string;
  link: string;
  snippet: string;
  /** Raw date string from SerpAPI if present */
  date?: string;
  source?: string;
};

export type SerpGoogleNewsResult = {
  items?: GoogleNewsItem[];
  error?: string;
  errorBody?: string;
  httpStatus?: number;
};

function redactKey(text: string, key: string): string {
  if (!key || key.length < 8) return text;
  return text.split(key).join("***REDACTED***");
}

function bodyDebug(json: Record<string, unknown>, raw: string, key: string): string {
  return redactKey(
    Object.keys(json).length ? JSON.stringify(json, null, 2) : raw,
    key,
  ).slice(0, 12_000);
}

/** SerpAPI `google_news` max `num` is often 100; we use chunks of 10 for stability. */
const CHUNK = 10;

export async function serpGoogleNewsSearch(
  query: string,
  options?: { num?: number; start?: number },
): Promise<SerpGoogleNewsResult> {
  const apiKey = (await resolveWorkerEnv("SERPAPI_API_KEY"))?.trim();
  if (!apiKey) {
    return { error: "SERPAPI_API_KEY not set" };
  }
  const num = Math.min(
    100,
    Math.max(1, Math.floor(options?.num ?? CHUNK)),
  );
  const start = Math.max(0, Math.floor(options?.start ?? 0));

  const u = new URL("https://serpapi.com/search.json");
  u.searchParams.set("engine", "google_news");
  u.searchParams.set("q", query);
  u.searchParams.set("api_key", apiKey);
  u.searchParams.set("num", String(num));
  if (start > 0) u.searchParams.set("start", String(start));

  const res = await fetch(u.toString());
  const rawText = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    json = {};
  }
  const err =
    typeof json["error"] === "string"
      ? json["error"].trim()
      : typeof (json["error"] as { message?: string } | null)?.message ===
          "string"
        ? String((json["error"] as { message: string }).message).trim()
        : "";
  if (!res.ok || err) {
    return {
      error: err || `SerpAPI HTTP ${res.status}`,
      errorBody: bodyDebug(json, rawText, apiKey),
      httpStatus: res.status,
    };
  }

  const rawList = Array.isArray(json["news_results"])
    ? json["news_results"]
    : Array.isArray(json["top_stories"])
      ? json["top_stories"]
      : [];
  const items: GoogleNewsItem[] = [];
  for (const row of rawList) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const title = typeof o["title"] === "string" ? o["title"] : "";
    const link = typeof o["link"] === "string" ? o["link"] : "";
    const snippet = typeof o["snippet"] === "string" ? o["snippet"] : "";
    const date = typeof o["date"] === "string" ? o["date"] : undefined;
    const source =
      typeof o["source"] === "string"
        ? o["source"]
        : typeof (o["source"] as { name?: string })?.name === "string"
          ? (o["source"] as { name: string }).name
          : undefined;
    if (link) {
      items.push({ title, link, snippet, date, source });
    }
  }
  return { items };
}

/**
 * Fetch up to `target` news rows using multiple `start` offsets and optional extra queries.
 */
export async function serpGoogleNewsCollect(
  query: string,
  target: number,
): Promise<SerpGoogleNewsResult> {
  const out: GoogleNewsItem[] = [];
  const seen = new Set<string>();
  let start = 0;
  const maxRounds = 20;
  for (let r = 0; r < maxRounds && out.length < target; r++) {
    const res = await serpGoogleNewsSearch(query, { num: CHUNK, start });
    if (res.error || !res.items?.length) {
      if (out.length === 0) return res;
      break;
    }
    for (const it of res.items) {
      const k = it.link.trim();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(it);
      if (out.length >= target) return { items: out };
    }
    start += CHUNK;
  }
  return { items: out };
}

function calDaySimple(d: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${day}`;
}

/**
 * Heuristic: keep items that are plausibly from "today" in the given timezone.
 * Serp often returns "5 hours ago", "Apr 25, 2025", or ISO-like strings.
 */
export function filterSameCalendarDayNews(
  items: GoogleNewsItem[],
  now: Date,
  timeZone: string,
): GoogleNewsItem[] {
  const today = calDaySimple(now, timeZone);
  const yNow = now.getFullYear();

  return items.filter((it) => {
    const raw = (it.date || "").trim();
    if (!raw) return true; // lenient: keep if unknown (still deduped)
    const lower = raw.toLowerCase();
    if (
      lower.includes("hour") ||
      lower.includes("minute") ||
      lower.includes("just now")
    ) {
      return true;
    }
    if (lower.includes("day ago") && !lower.includes("0 day")) {
      const m = /(\d+)\s*day/i.exec(lower);
      if (m && parseInt(m[1]!, 10) >= 1) return false;
    }
    // "Apr 25, 2026" style
    const tryDate = Date.parse(raw);
    if (!Number.isNaN(tryDate)) {
      return calDaySimple(new Date(tryDate), timeZone) === today;
    }
    // Fallthrough: if year in string is current year, keep (weak)
    if (String(yNow) && raw.includes(String(yNow))) {
      return true;
    }
    return true;
  });
}

/**
 * "Recent" for backfill: today or **yesterday** in `timeZone`, or relative &lt; 2 days, or undated.
 * Google News often tags items as "1 day ago" / yesterday’s calendar date even when the pool
 * is meant to be “same day” — use after strict `filterSameCalendarDayNews` to reach `minCount`.
 */
export function filterRelaxedRecentNews(
  items: GoogleNewsItem[],
  now: Date,
  timeZone: string,
): GoogleNewsItem[] {
  const today = calDaySimple(now, timeZone);
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  const yesterday = calDaySimple(y, timeZone);

  return items.filter((it) => {
    if (filterSameCalendarDayNews([it], now, timeZone).length) return true;
    const raw = (it.date || "").trim();
    if (!raw) return true;
    const lower = raw.toLowerCase();
    if (lower.includes("yesterday") || lower.includes("1 day ago")) return true;
    if (lower.includes("hour") || lower.includes("minute") || lower.includes("just now")) {
      return true;
    }
    const m = /(\d+)\s*day\s*ago/i.exec(lower);
    if (m && parseInt(m[1]!, 10) === 1) return true;
    if (m && parseInt(m[1]!, 10) >= 2) return false;
    const tryDate = Date.parse(raw);
    if (!Number.isNaN(tryDate)) {
      const d = calDaySimple(new Date(tryDate), timeZone);
      return d === today || d === yesterday;
    }
    return true;
  });
}

export function dedupeNewsByLink(items: GoogleNewsItem[]): GoogleNewsItem[] {
  const seen = new Set<string>();
  const out: GoogleNewsItem[] = [];
  for (const it of items) {
    const k = it.link.trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

/**
 * Merged pool: several Serp queries → same-day (strict) first, then relaxed (today or yesterday) backfill
 * to reach `minCount`.
 */
export async function gatherPreprodNewsPool(params: {
  minCount: number;
  timeZone: string;
}): Promise<{
  ok: true;
  items: (GoogleNewsItem & { firecrawl_excerpt?: string })[];
} | { ok: false; error: string }> {
  const { minCount, timeZone } = params;
  const qAi =
    (await resolveWorkerEnv("NEWS_SERP_QUERY_AI"))?.trim() || "artificial intelligence";
  const qTech =
    (await resolveWorkerEnv("NEWS_SERP_QUERY_TECH"))?.trim() || "technology";
  const q3 =
    (await resolveWorkerEnv("NEWS_SERP_QUERY_EXTRA"))?.trim() || "artificial intelligence news";
  const q4 =
    (await resolveWorkerEnv("NEWS_SERP_QUERY_EXTRA2"))?.trim() || "technology news today";

  const perQuery = Math.max(minCount * 3, 50);
  const [ai, tech, e1, e2] = await Promise.all([
    serpGoogleNewsCollect(qAi, perQuery),
    serpGoogleNewsCollect(qTech, perQuery),
    serpGoogleNewsCollect(q3, perQuery),
    serpGoogleNewsCollect(q4, perQuery),
  ]);
  if (!(ai.items?.length || tech.items?.length)) {
    return {
      ok: false,
      error: `No Serp results. AI: ${ai.error || "0 items"}; Tech: ${tech.error || "0 items"}`,
    };
  }
  const now = new Date();
  const rawPool = dedupeNewsByLink([
    ...(ai.items || []),
    ...(tech.items || []),
    ...(e1.error ? [] : e1.items || []),
    ...(e2.error ? [] : e2.items || []),
  ]);
  if (rawPool.length === 0) {
    return { ok: false, error: "Serp returned no news_results (empty pool)" };
  }
  const strict = dedupeNewsByLink(filterSameCalendarDayNews([...rawPool], now, timeZone));
  let merged = strict;
  if (merged.length < minCount) {
    const loose = filterRelaxedRecentNews([...rawPool], now, timeZone);
    const seen = new Set(merged.map((i) => i.link.trim()));
    for (const it of loose) {
      const k = it.link.trim();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      merged.push(it);
      if (merged.length >= minCount) break;
    }
  }
  if (merged.length < minCount) {
    for (const it of rawPool) {
      const k = it.link.trim();
      if (!k || merged.some((m) => m.link.trim() === k)) continue;
      merged.push(it);
      if (merged.length >= minCount) break;
    }
  }
  const trimmed = merged.slice(0, minCount);
  if (trimmed.length < minCount) {
    return {
      ok: false,
      error: `Only ${trimmed.length} items after all filters (need ${minCount}). Try lowering NEWS_PREPROD_MIN or add NEWS_SERP_QUERY_* queries.`,
    };
  }
  return { ok: true, items: trimmed };
}

const MAX_FC = 8;

/**
 * Add Firecrawl markdown excerpts to the first `max` links (not Google URLs).
 */
export async function addFirecrawlExcerpts(
  items: GoogleNewsItem[],
  max: number = MAX_FC,
): Promise<(GoogleNewsItem & { firecrawl_excerpt?: string })[]> {
  const out: (GoogleNewsItem & { firecrawl_excerpt?: string })[] = items.map(
    (i) => ({ ...i }),
  );
  let n = 0;
  for (let i = 0; i < out.length && n < max; i++) {
    const u = out[i]!.link;
    if (!u || u.includes("google.com/")) continue;
    const r = await firecrawlScrape(u, ["markdown"]);
    n++;
    if (r.markdown) {
      out[i]!.firecrawl_excerpt = r.markdown.replace(/\s+/g, " ").trim().slice(0, 1_200);
    }
  }
  return out;
}

/**
 * 30-item checklist: repeated Serp "AI news" (or override query).
 */
export async function fetchAiNewsChecklist30(): Promise<
  | { ok: true; items: GoogleNewsItem[] }
  | { ok: false; error: string }
> {
  const q =
    (await resolveWorkerEnv("NEWS_CHECKLIST_SERP_QUERY"))?.trim() || "AI news";
  const all: GoogleNewsItem[] = [];
  const seen = new Set<string>();
  for (let off = 0; all.length < 30 && off < 120; off += CHUNK) {
    const r = await serpGoogleNewsSearch(q, { num: CHUNK, start: off });
    if (r.error && !r.items?.length) {
      return { ok: false, error: r.error || "Serp failed" };
    }
    for (const it of r.items || []) {
      if (seen.has(it.link)) continue;
      seen.add(it.link);
      all.push(it);
      if (all.length >= 30) break;
    }
  }
  if (all.length < 30) {
    return { ok: false, error: `Checklist: only ${all.length} items` };
  }
  return { ok: true, items: all.slice(0, 30) };
}
