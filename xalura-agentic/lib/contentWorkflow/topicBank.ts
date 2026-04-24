import { isArticleSubcategoryLabel } from "@/lib/articleSubcategoryGate";
import type { TopicBankEntry, TopicBankFile } from "./types";
import { getVerticalById } from "./contentVerticals";
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
 * When true, incremental/admin should pass `forceTopicBankRefresh` so Serp can refill even under crawl cooldown:
 * missing bank, empty topics, no unused rows globally, or no unused row for the scheduled vertical lane.
 */
export async function shouldForceTopicBankForVertical(
  cwd: string,
  verticalId: string,
): Promise<boolean> {
  const v = verticalId.trim().toLowerCase();
  const bank = await readTopicBank(cwd);
  if (!bank) return true;
  if ((bank.topics?.length ?? 0) === 0) return true;
  const unused = getUnusedTopics(bank);
  if (unused.length === 0) return true;
  if (!v) return false;
  return !unused.some((t) => (t.vertical_id || "").trim().toLowerCase() === v);
}

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
  let bank = await readTopicBank(cwd);

  const need = shouldRefreshBank(bank, force);
  const cooldownBlocks = need && !force && tooSoonToCrawl(bank);

  if (need && !cooldownBlocks) {
    const refreshed = await refreshTopicBank(cwd, {
      forceSerp: opts.forceRefresh === true,
    });
    if (!refreshed.ok) {
      if (opts.allowStubFallback) {
        bank = await seedStubTopicBank(cwd);
      } else {
        return {
          ok: false,
          reason: `Topic bank refresh failed: ${refreshed.error}. Configure SERPAPI_API_KEY + Firecrawl + GEMINI_API_KEY, or pass allowStubFallback for local dev.`,
        };
      }
    } else {
      bank = await readTopicBank(cwd);
      if (!bank && refreshed.ok) {
        return {
          ok: false,
          reason:
            "Topic bank refresh reported success but the bank is still missing or unreadable (persist may have failed). Check Supabase `agentic_topic_bank` or xalura-agentic/state.",
        };
      }
    }
  }

  if (!bank) {
    if (opts.allowStubFallback) {
      bank = await seedStubTopicBank(cwd);
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
      return { ok: true, topic: await markTopicUsed(cwd, bank, remaining[0]!) };
    }
    /** Depleted (or wrong vertical) while 2h crawl gap blocks a normal refresh — run a **forced** Serp+Firecrawl+Gemini refill. */
    const forced = await refreshTopicBank(cwd, { skipAudit: true, forceSerp: true });
    if (forced.ok) {
      const bank2 = (await readTopicBank(cwd)) ?? bank;
      let rem = getUnusedTopics(bank2);
      if (vfCooldown) {
        rem = rem.filter(
          (t) => (t.vertical_id || "").trim().toLowerCase() === vfCooldown.toLowerCase(),
        );
      }
      if (rem.length > 0) {
        return { ok: true, topic: await markTopicUsed(cwd, bank2, rem[0]!) };
      }
    } else if (opts.allowStubFallback) {
      bank = await seedStubTopicBank(cwd);
      let rem = getUnusedTopics(bank);
      if (vfCooldown) {
        rem = rem.filter(
          (t) => (t.vertical_id || "").trim().toLowerCase() === vfCooldown.toLowerCase(),
        );
      }
      if (rem.length > 0) {
        return { ok: true, topic: await markTopicUsed(cwd, bank, rem[0]!) };
      }
    }
    return {
      ok: false,
      reason: vfCooldown
        ? `No unused topic for vertical \`${vfCooldown}\` after a forced bank refresh. ${forced.ok ? "Refresh did not return a row for this vertical — broaden the bank or run POST /api/agentic/content/refresh-topic-bank." : `Refresh failed: ${"error" in forced ? forced.error : "unknown"}.`}`
        : `Topic bank depleted under crawl cooldown; forced refresh ${forced.ok ? "succeeded but no unused rows" : "failed"}. ${
            forced.ok
              ? "Check persist / Supabase."
              : "error" in forced
                ? String(forced.error)
                : "Configure SERPAPI, Firecrawl, GEMINI, or pass allowStubFallback for local dev."
          }`,
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
      const stub = await seedStubTopicBank(cwd);
      let u = getUnusedTopics(stub);
      if (vFilter) {
        u = u.filter(
          (t) => (t.vertical_id || "").trim().toLowerCase() === vFilter.toLowerCase(),
        );
      }
      if (!u.length) return { ok: false, reason: "Stub bank empty or no topic for this vertical" };
      return { ok: true, topic: await markTopicUsed(cwd, stub, u[0]!) };
    }
    return { ok: false, reason: "No unused topics in bank" };
  }

  const picked = unused[0]!;
  if (conflictsRotation(picked, cwd)) {
    const alt = unused.find((t) => !conflictsRotation(t, cwd));
    if (alt) return { ok: true, topic: await markTopicUsed(cwd, bank, alt) };
  }

  return { ok: true, topic: await markTopicUsed(cwd, bank, picked) };
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

export function minTopicScoreFromEnv(): number {
  const n = Number(process.env["AGENTIC_MIN_TOPIC_SCORE"]);
  return Number.isFinite(n) && n > 0 && n <= 100 ? Math.floor(n) : 80;
}

export function incrementalBatchSizeFromEnv(): number {
  const n = Number(process.env["AGENTIC_INCREMENTAL_BATCH_SIZE"]);
  if (Number.isFinite(n) && n >= 1 && n <= 10) return Math.floor(n);
  return 1;
}

function isNonRegulatedVertical(verticalId: string): boolean {
  const v = getVerticalById(verticalId.trim());
  if (!v) return true;
  return !v.regulated;
}

function filterEligibleTopics(topics: TopicBankEntry[], minScore: number): TopicBankEntry[] {
  return topics.filter((t) => {
    if (t.final_score < minScore) return false;
    if (!isArticleSubcategoryLabel(t.subcategory)) return false;
    if (!isNonRegulatedVertical(t.vertical_id)) return false;
    return true;
  });
}

/**
 * Picks up to `limit` unused topics, marks them `seo_in_progress` (reserves for parallel runs).
 * Prefer **diverse** `vertical_id` (round-robin) when `diverseVerticals` is true.
 */
export async function getNextBatchTopics(
  cwd: string,
  opts: { limit: number; minScore?: number; diverseVerticals?: boolean },
): Promise<
  { ok: true; topics: TopicBankEntry[] } | { ok: false; reason: string }
> {
  const minScore = opts.minScore ?? minTopicScoreFromEnv();
  const limit = Math.min(10, Math.max(1, opts.limit));
  const bank = await readTopicBank(cwd);
  if (!bank) {
    return { ok: false, reason: "No topic bank" };
  }

  let pool = filterEligibleTopics(getUnusedTopics(bank), minScore);
  if (pool.length === 0) {
    return {
      ok: false,
      reason: `No eligible topics (min score ${minScore}, public subcategory list, non-regulated vertical).`,
    };
  }

  const diverse = opts.diverseVerticals !== false;
  let picked: TopicBankEntry[] = [];

  if (diverse) {
    const byV = new Map<string, TopicBankEntry[]>();
    for (const t of pool) {
      const k = (t.vertical_id || "").trim().toLowerCase() || "_";
      if (!byV.has(k)) byV.set(k, []);
      byV.get(k)!.push(t);
    }
    Array.from(byV.values()).forEach((arr: TopicBankEntry[]) => {
      arr.sort((a, b) => b.final_score - a.final_score);
    });
    const verticalKeys = Array.from(byV.keys()).sort();
    while (picked.length < limit) {
      let any = false;
      for (const vk of verticalKeys) {
        if (picked.length >= limit) break;
        const arr = byV.get(vk);
        if (arr && arr.length > 0) {
          const next = arr.shift()!;
          picked.push(next);
          any = true;
        }
      }
      if (!any) break;
    }
  } else {
    pool.sort((a, b) => b.final_score - a.final_score);
    picked = pool.slice(0, limit);
  }

  const fresh = (await readTopicBank(cwd)) ?? bank;
  for (const p of picked) {
    const i = fresh.topics.findIndex((t) => t.id === p.id);
    if (i !== -1) {
      const row = fresh.topics[i]!;
      if (row.status === "unused") {
        fresh.topics[i] = { ...row, status: "seo_in_progress" as const };
      }
    }
  }
  await writeTopicBank(cwd, fresh);
  return {
    ok: true,
    topics: picked.map((p) => fresh.topics.find((t) => t.id === p.id) ?? p),
  };
}

/** Revert reserved topics when a parallel lane fails before `markTopicUsed`. */
export async function revertTopicsToUnused(
  cwd: string,
  topicIds: string[],
): Promise<void> {
  if (!topicIds.length) return;
  const bank = await readTopicBank(cwd);
  if (!bank) return;
  for (const id of topicIds) {
    const i = bank.topics.findIndex((t) => t.id === id);
    if (i === -1) continue;
    const t = bank.topics[i]!;
    if (t.status === "seo_in_progress") {
      bank.topics[i] = { ...t, status: "unused" as const, used_at: null };
    }
  }
  await writeTopicBank(cwd, bank);
}

/** Re-read bank after potential refresh (Supabase and/or disk). */
export async function markTopicUsed(
  cwd: string,
  bank: TopicBankFile,
  topic: TopicBankEntry,
): Promise<TopicBankEntry> {
  const fresh = (await readTopicBank(cwd)) ?? bank;
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
  await writeTopicBank(cwd, fresh);
  return fresh.topics[idx]!;
}
