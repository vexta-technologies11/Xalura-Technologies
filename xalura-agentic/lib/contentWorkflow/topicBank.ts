import type { TopicBankEntry, TopicBankFile } from "./types";
import { readTopicRotation } from "./topicRotationStore";
import { getUnusedTopics, readTopicBank, writeTopicBank } from "./topicBankStore";
import { refreshTopicBank, seedStubTopicBank } from "./topicBankRefresh";
import {
  hoursSinceLastTopicBankCrawl,
  minSerpIntervalHoursFromEnv,
} from "./topicBankSerpPolicy";

/** Max topics consumed from one bank before `depleted` (matches 20-topic refresh). */
export const CRAWL_THRESHOLD = 20;
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
 * Consume next topic from bank, refreshing via SerpAPI + Firecrawl + Gemini when rules allow.
 */
export async function getNextTopic(
  cwd: string,
  opts: {
    forceRefresh?: boolean;
    allowStubFallback?: boolean;
    /** When set, pick the highest-scoring unused topic in this vertical (matched SEO ↔ Publishing lane). */
    verticalId?: string;
  } = {},
): Promise<NextTopicResult> {
  const force = opts.forceRefresh === true;
  let bank = readTopicBank(cwd);

  const need = shouldRefreshBank(bank, force);
  const cooldownBlocks = need && !force && tooSoonToCrawl(bank);

  if (need && !cooldownBlocks) {
    const refreshed = await refreshTopicBank(cwd, {
      forceSerp: opts.forceRefresh === true,
    });
    if (!refreshed.ok) {
      if (opts.allowStubFallback) {
        bank = seedStubTopicBank(cwd);
      } else {
        return {
          ok: false,
          reason: `Topic bank refresh failed: ${refreshed.error}. Configure SERPAPI_API_KEY + Firecrawl + GEMINI_API_KEY, or pass allowStubFallback for local dev.`,
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
    let remaining = getUnusedTopics(bank);
    const vfCooldown = opts.verticalId?.trim();
    if (vfCooldown) {
      remaining = remaining.filter(
        (t) => (t.vertical_id || "").trim().toLowerCase() === vfCooldown.toLowerCase(),
      );
    }
    if (remaining.length > 0) {
      return { ok: true, topic: markTopicUsed(cwd, bank, remaining[0]!) };
    }
    return {
      ok: false,
      reason: vfCooldown
        ? `No unused topic for vertical \`${vfCooldown}\` while crawl cooldown is active. Retry later or use forceTopicBankRefresh.`
        : "Topic bank depleted and minimum crawl interval (2h) not met. Retry later or use forceTopicBankRefresh.",
    };
  }

  let unused = getUnusedTopics(bank);
  const vFilter = opts.verticalId?.trim();
  if (vFilter) {
    const narrowed = unused.filter(
      (t) => (t.vertical_id || "").trim().toLowerCase() === vFilter.toLowerCase(),
    );
    if (!narrowed.length) {
      const lanes = Array.from(new Set(unused.map((t) => t.vertical_id).filter(Boolean)));
      return {
        ok: false,
        reason: `No unused topic for vertical \`${vFilter}\`. Unused lanes in bank: ${lanes.length ? lanes.join(", ") : "(none)"}. Refresh bank or pick another verticalId.`,
      };
    }
    unused = narrowed;
  }

  if (!unused.length) {
    if (opts.allowStubFallback) {
      const stub = seedStubTopicBank(cwd);
      let u = getUnusedTopics(stub);
      if (vFilter) {
        u = u.filter(
          (t) => (t.vertical_id || "").trim().toLowerCase() === vFilter.toLowerCase(),
        );
      }
      if (!u.length) return { ok: false, reason: "Stub bank empty or no topic for this vertical" };
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
