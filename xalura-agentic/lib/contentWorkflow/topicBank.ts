import type { TopicBankEntry, TopicBankFile } from "./types";
import { readTopicRotation } from "./topicRotationStore";
import { getUnusedTopics, readTopicBank, writeTopicBank } from "./topicBankStore";
import { refreshTopicBank, seedStubTopicBank } from "./topicBankRefresh";

export const CRAWL_THRESHOLD = 5;
export const STALE_HOURS = 12;
export const MIN_CRAWL_GAP_MS = 2 * 60 * 60 * 1000;

function isStale(lastCrawledAt: string | null, hours: number): boolean {
  if (!lastCrawledAt) return true;
  return Date.now() - new Date(lastCrawledAt).getTime() > hours * 60 * 60 * 1000;
}

function tooSoonToCrawl(bank: TopicBankFile | null): boolean {
  if (!bank?.last_crawled_at) return false;
  return Date.now() - new Date(bank.last_crawled_at).getTime() < MIN_CRAWL_GAP_MS;
}

function shouldRefreshBank(
  bank: TopicBankFile | null,
  force: boolean,
): boolean {
  if (force) return true;
  if (!bank) return true;
  if (bank.depleted) return true;
  if (bank.used_count >= CRAWL_THRESHOLD) return true;
  if (isStale(bank.last_crawled_at, STALE_HOURS)) return true;
  if (getUnusedTopics(bank).length === 0) return true;
  return false;
}

export type NextTopicResult =
  | { ok: true; topic: TopicBankEntry }
  | { ok: false; reason: string };

/**
 * Consume next topic from bank, refreshing via Google Search + Firecrawl + Gemini when rules allow.
 */
export async function getNextTopic(
  cwd: string,
  opts: { forceRefresh?: boolean; allowStubFallback?: boolean } = {},
): Promise<NextTopicResult> {
  const force = opts.forceRefresh === true;
  let bank = readTopicBank(cwd);

  const need = shouldRefreshBank(bank, force);
  const cooldownBlocks = need && !force && tooSoonToCrawl(bank);

  if (need && !cooldownBlocks) {
    const refreshed = await refreshTopicBank(cwd, {});
    if (!refreshed.ok) {
      if (opts.allowStubFallback) {
        bank = seedStubTopicBank(cwd);
      } else {
        return {
          ok: false,
          reason: `Topic bank refresh failed: ${refreshed.error}. Configure Google Custom Search + Firecrawl + GEMINI_API_KEY, or pass allowStubFallback for local dev.`,
        };
      }
    } else {
      bank = readTopicBank(cwd);
    }
  }

  if (!bank) {
    if (opts.allowStubFallback) {
      bank = seedStubTopicBank(cwd);
    } else {
      return { ok: false, reason: "No topic bank on disk" };
    }
  }

  if (need && cooldownBlocks) {
    const remaining = getUnusedTopics(bank);
    if (remaining.length > 0) {
      return { ok: true, topic: markTopicUsed(cwd, bank, remaining[0]!) };
    }
    return {
      ok: false,
      reason:
        "Topic bank depleted and minimum crawl interval (2h) not met. Retry later or use forceTopicBankRefresh.",
    };
  }

  const unused = getUnusedTopics(bank);
  if (!unused.length) {
    if (opts.allowStubFallback) {
      const stub = seedStubTopicBank(cwd);
      const u = getUnusedTopics(stub);
      if (!u.length) return { ok: false, reason: "Stub bank empty" };
      return { ok: true, topic: markTopicUsed(cwd, stub, u[0]!) };
    }
    return { ok: false, reason: "No unused topics in bank" };
  }

  const picked = unused[0]!;
  if (conflictsRotation(picked, cwd)) {
    const alt = unused.find((t) => !conflictsRotation(t, cwd));
    if (alt) return { ok: true, topic: markTopicUsed(cwd, bank, alt) };
  }

  return { ok: true, topic: markTopicUsed(cwd, bank, picked) };
}

function conflictsRotation(topic: TopicBankEntry, cwd: string): boolean {
  const rot = readTopicRotation(cwd);
  const sub = topic.subcategory.trim().toLowerCase();
  const last3 = rot.last_5_subcategories.slice(0, 3).map((s) => s.toLowerCase());
  if (last3.includes(sub)) return true;
  const cd = rot.cooldown_topics.some((c) => {
    const t = c.topic.toLowerCase();
    return (
      topic.keyword.toLowerCase().includes(t) ||
      sub.includes(t) ||
      t.includes(sub)
    );
  });
  return cd;
}

/** Re-read bank from disk after potential refresh (paths use cwd). */
function markTopicUsed(
  cwd: string,
  bank: TopicBankFile,
  topic: TopicBankEntry,
): TopicBankEntry {
  const fresh = readTopicBank(cwd) ?? bank;
  const idx = fresh.topics.findIndex((t) => t.id === topic.id || t.keyword === topic.keyword);
  if (idx === -1) {
    return topic;
  }
  const prev = fresh.topics[idx]!;
  if (prev.status === "used") {
    return prev;
  }
  fresh.topics[idx] = {
    ...prev,
    status: "used",
    used_at: new Date().toISOString(),
  };
  fresh.used_count += 1;
  fresh.depleted = fresh.used_count >= CRAWL_THRESHOLD;
  writeTopicBank(cwd, fresh);
  return fresh.topics[idx]!;
}
