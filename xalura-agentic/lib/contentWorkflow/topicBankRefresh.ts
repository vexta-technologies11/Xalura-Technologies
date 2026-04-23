import { appendEvent } from "../eventQueue";
import { firecrawlScrape, gscSearchAnalyticsByPage } from "../phase7Clients";
import { auditBankWithGemini } from "./geminiBankAuditor";
import { rankTopicsWithGemini } from "./geminiTopicRanker";
import { googleCustomSearch } from "./googleCustomSearch";
import { readJsonFile, writeJsonFile } from "./jsonStore";
import { recentKeywords } from "./publishedTopicsStore";
import { topicBankLastAuditPath } from "./paths";
import { extendCooldownForSubcategories, readTopicRotation } from "./topicRotationStore";
import type { TopicBankAuditFile, TopicBankFile } from "./types";
import { readTopicBank, writeTopicBank } from "./topicBankStore";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function buildCrawlSummary(urls: string[]): Promise<string> {
  const parts: string[] = [];
  for (const url of urls.slice(0, 4)) {
    const r = await firecrawlScrape(url, ["markdown"]);
    if (r.error) parts.push(`## ${url}\n_Error: ${r.error}_\n`);
    else if (r.markdown)
      parts.push(
        `## ${url}\n${r.markdown.slice(0, 3500)}${r.markdown.length > 3500 ? "\n…" : ""}\n`,
      );
  }
  return parts.join("\n");
}

/**
 * Before a full bank refresh: audit used topics + GSC pages, persist summary, adjust cooldowns.
 */
export async function auditPreviousTopicBank(cwd: string): Promise<void> {
  const bank = readTopicBank(cwd);
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

export async function refreshTopicBank(
  cwd: string,
  opts: { skipAudit?: boolean; auditHint?: string } = {},
): Promise<{ ok: true; topicCount: number } | { ok: false; error: string }> {
  if (!opts.skipAudit) {
    await auditPreviousTopicBank(cwd);
  }

  const search = await googleCustomSearch(
    "latest artificial intelligence machine learning developer tools news",
    10,
  );
  if (search.error) {
    return { ok: false, error: search.error };
  }
  const items = search.items ?? [];
  if (!items.length) {
    return { ok: false, error: "Google Custom Search returned no items" };
  }

  const urls = Array.from(
    new Set(items.map((i) => i.link).filter(Boolean) as string[]),
  ).slice(0, 6);
  const crawlSummary = await buildCrawlSummary(urls);
  const searchSummary = JSON.stringify(
    items.map((i) => ({ title: i.title, link: i.link, snippet: i.snippet })),
  );

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

  const prev = readTopicBank(cwd);
  const next: TopicBankFile = {
    last_crawled_at: new Date().toISOString(),
    crawl_count: (prev?.crawl_count ?? 0) + 1,
    used_count: 0,
    depleted: false,
    topics: ranked.topics.map((t, i) => ({ ...t, rank: i + 1 })),
  };
  writeTopicBank(cwd, next);
  appendEvent(
    {
      type: "TOPIC_BANK_REFRESHED",
      payload: { topic_count: next.topics.length, crawl_count: next.crawl_count },
    },
    cwd,
  );
  return { ok: true, topicCount: next.topics.length };
}

/** Admin / cron: new crawl immediately (runs bank audit first unless skipped). */
export async function forceRefreshTopicBank(
  cwd: string,
  options: { skipAudit?: boolean } = {},
): Promise<{ ok: true; topicCount: number } | { ok: false; error: string }> {
  if (!options.skipAudit) {
    await auditPreviousTopicBank(cwd);
  }
  return refreshTopicBank(cwd, { skipAudit: true });
}

/** Seed a minimal bank when search APIs are not yet configured (dev only). */
export function seedStubTopicBank(cwd: string): TopicBankFile {
  const bank: TopicBankFile = {
    last_crawled_at: new Date().toISOString(),
    crawl_count: 0,
    used_count: 0,
    depleted: false,
    topics: [
      {
        id: "stub-1",
        rank: 1,
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
  writeTopicBank(cwd, bank);
  return bank;
}
