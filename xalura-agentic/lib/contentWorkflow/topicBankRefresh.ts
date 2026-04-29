import { appendEvent } from "../eventQueue";
import { firecrawlScrape, gscSearchAnalyticsByPage } from "../phase7Clients";
import { firecrawlScrapeWithFallback, geminiSerpOrganicFallback } from "../researchFallback";
import { auditBankWithGemini } from "./geminiBankAuditor";
import { rankTopicsWithGemini } from "./geminiTopicRanker";
import { serpApiSearch } from "./serpApiSearch";
import { isAgenticDiskWritable } from "../agenticDisk";
import { readJsonFile, writeJsonFile } from "./jsonStore";
import { recentKeywords } from "./publishedTopicsStore";
import { CONTENT_VERTICALS } from "./contentVerticals";
import { writeSeoTrendLogsFromBank } from "./seoTrendLogsStore";
import { topicBankLastAuditPath } from "./paths";
import { extendCooldownForSubcategories, readTopicRotation } from "./topicRotationStore";
import type { TopicBankAuditFile, TopicBankFile } from "./types";
import { readTopicBank, writeTopicBank } from "./topicBankStore";
import {
  hoursSinceLastTopicBankCrawl,
  minSerpIntervalHoursFromEnv,
} from "./topicBankSerpPolicy";
import { topicBankSupabaseEnabled } from "@/lib/agenticTopicBankSupabase";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Reused by pillar-based refresh (one Serp + crawl per public subcategory). Falls back to Gemini. */
export async function buildCrawlSummary(urls: string[]): Promise<string> {
  const parts: string[] = [];
  for (const url of urls.slice(0, 4)) {
    const r = await firecrawlScrapeWithFallback(
      (u, _fmts) => firecrawlScrape(u, ["markdown"]),
      url,
    );
    if (r.markdown) {
      parts.push(
        `## ${url}\n${r.markdown.slice(0, 3500)}${r.markdown.length > 3500 ? "\n…" : ""}\n`,
      );
    }
  }
  return parts.join("\n");
}

/**
 * Before a full bank refresh: audit used topics + GSC pages, persist summary, adjust cooldowns.
 */
export async function auditPreviousTopicBank(cwd: string): Promise<void> {
  const bank = await readTopicBank(cwd);
  if (!bank?.topics?.length) return;
  const used = bank.topics.filter((t) => t.status === "used");
  if (!used.length) return;

  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 7);
  const gsc = await gscSearchAnalyticsByPage({
    startDate: isoDate(start),
    endDate: isoDate(end),
    rowLimit: 100,
  });
  const gscSummary = gsc.error
    ? `GSC unavailable: ${gsc.error}`
    : JSON.stringify(gsc.rows ?? []).slice(0, 12_000);

  const audit = await auditBankWithGemini({
    usedTopics: used,
    gscPageSummary: gscSummary,
  });

  const out: TopicBankAuditFile = {
    audited_at: new Date().toISOString(),
    bank_crawl_count: bank.crawl_count,
    topics_used: used.length,
    audit,
  };
  writeJsonFile(topicBankLastAuditPath(cwd), out);

  if (audit?.underperforming_subcategories?.length) {
    extendCooldownForSubcategories(cwd, audit.underperforming_subcategories, 14);
  }
}

export type RefreshTopicBankResult =
  | { ok: true; topicCount: number; skippedSerp?: boolean }
  | { ok: false; error: string };

export async function refreshTopicBank(
  cwd: string,
  opts: { skipAudit?: boolean; auditHint?: string; forceSerp?: boolean } = {},
): Promise<RefreshTopicBankResult> {
  if (!opts.skipAudit) {
    await auditPreviousTopicBank(cwd);
  }

  const bankPeek = await readTopicBank(cwd);
  const minH = minSerpIntervalHoursFromEnv();
  if (!opts.forceSerp && minH > 0 && bankPeek?.last_crawled_at) {
    const ageH = hoursSinceLastTopicBankCrawl(bankPeek.last_crawled_at);
    if (ageH < minH) {
      const unused = (bankPeek.topics ?? []).filter((t) => t.status === "unused").length;
      if (unused > 0) {
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
        error: `Topic bank has no unused topics and min Serp interval (${minH}h) blocks refresh until ~${eligibleAt}. Use POST /api/agentic/content/refresh-topic-bank (admin) or set AGENTIC_TOPIC_BANK_MIN_SERP_INTERVAL_HOURS=0 to disable.`,
      };
    }
  }

  const search = await serpApiSearch(
    "artificial intelligence enterprise developer cloud security MLOps education marketing infrastructure news 2026",
    10,
  );
  const items = (search.items ?? []).filter(Boolean);
  let searchSummary: string;
  let usedFallback = false;

  if (search.error || items.length === 0) {
    // SerpAPI exhausted — use Gemini fallback to synthesize research context
    const fb = await geminiSerpOrganicFallback(
      search.error
        ? "artificial intelligence enterprise developer cloud security MLOps education marketing infrastructure 2026"
        : "artificial intelligence trends 2026",
      5,
      10,
    );
    if (fb.items && fb.items.length >= 3) {
      searchSummary = JSON.stringify(
        fb.items.map((i) => ({ title: i.title, link: i.link, snippet: i.snippet })),
      );
      usedFallback = true;
    } else {
      const detail =
        search.errorBody != null && search.errorBody.trim().length > 0
          ? `\n\n--- SerpAPI response body (debug) ---\n${search.errorBody}`
          : "";
      return { ok: false, error: `${search.error}${detail}` };
    }
  } else {
    searchSummary = JSON.stringify(
      items.map((i) => ({ title: i.title, link: i.link, snippet: i.snippet })),
    );
  }

  const urls = usedFallback
    ? []
    : Array.from(
        new Set(items.map((i) => i.link).filter(Boolean) as string[]),
      ).slice(0, 6);
  const crawlSummary = usedFallback
    ? "(Gemini fallback — no Firecrawl pages available)"
    : await buildCrawlSummary(urls);

  const rot = readTopicRotation(cwd);
  const recent = recentKeywords(cwd, 30);
  const lastAudit = readJsonFile<{ audit?: { next_crawl_recommendation?: string } }>(
    topicBankLastAuditPath(cwd),
    {},
  );
  const auditHint =
    opts.auditHint ??
    (typeof lastAudit.audit?.next_crawl_recommendation === "string"
      ? lastAudit.audit.next_crawl_recommendation
      : undefined);

  const ranked = await rankTopicsWithGemini({
    searchSummary,
    crawlSummary,
    last5Subcategories: rot.last_5_subcategories,
    cooldownTopics: rot.cooldown_topics.map((c) => c.topic),
    recentKeywords30d: recent.map((r) => r.keyword),
    auditHint,
  });

  if (!ranked.topics.length) {
    return {
      ok: false,
      error: ranked.raw_error ?? "Gemini produced no ranked topics",
    };
  }

  const prev = await readTopicBank(cwd);
  const next: TopicBankFile = {
    last_crawled_at: new Date().toISOString(),
    crawl_count: (prev?.crawl_count ?? 0) + 1,
    used_count: 0,
    depleted: false,
    topics: ranked.topics.map((t, i) => ({ ...t, rank: i + 1 })),
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
        ? "Topic bank did not persist after crawl (Supabase read-back empty). Check `agentic_topic_bank` table and RLS/service role."
        : isAgenticDiskWritable()
          ? "Topic bank did not persist after crawl (read-back empty or invalid). Check permissions on xalura-agentic/state/."
          : "Topic bank cannot be saved: this host reports a read-only agentic filesystem (typical on Cloudflare Workers). Enable AGENTIC_TOPIC_BANK_USE_SUPABASE or run on Node with writable xalura-agentic/state.",
    };
  }
  writeSeoTrendLogsFromBank(cwd, persisted);
  appendEvent(
    {
      type: "TOPIC_BANK_REFRESHED",
      payload: {
        topic_count: persisted.topics.length,
        crawl_count: persisted.crawl_count,
        vertical_catalog_size: CONTENT_VERTICALS.length,
        trend_log_path: "state/seo-trend-logs.json",
        mode: "catalog_serp",
      },
    },
    cwd,
  );
  return { ok: true, topicCount: next.topics.length };
}

/** Admin / cron: new crawl immediately (runs bank audit first unless skipped). */
export async function forceRefreshTopicBank(
  cwd: string,
  options: { skipAudit?: boolean } = {},
): Promise<RefreshTopicBankResult> {
  if (!options.skipAudit) {
    await auditPreviousTopicBank(cwd);
  }
  return refreshTopicBank(cwd, { skipAudit: true, forceSerp: true });
}

/** Seed a minimal bank when search APIs are not yet configured (dev only). */
export async function seedStubTopicBank(cwd: string): Promise<TopicBankFile> {
  const bank: TopicBankFile = {
    last_crawled_at: new Date().toISOString(),
    crawl_count: 0,
    used_count: 0,
    depleted: false,
    topics: [
      {
        id: "stub-1",
        rank: 1,
        vertical_id: "developer-tools-oss",
        vertical_label: "Developer tools & OSS",
        angle: "Ship safer agentic workflows in CI",
        keyword: "agentic AI workflows for developers",
        subcategory: "agentic AI",
        content_type: "article",
        final_score: 9,
        supporting_keywords: ["agents", "automation"],
        source_urls: [],
        status: "unused",
        used_at: null,
      },
    ],
  };
  await writeTopicBank(cwd, bank);
  return bank;
}
