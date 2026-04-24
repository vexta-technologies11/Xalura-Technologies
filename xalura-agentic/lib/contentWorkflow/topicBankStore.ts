import type { TopicBankEntry, TopicBankFile } from "./types";
import { readJsonFile, writeJsonFile } from "./jsonStore";
import { topicBankPath } from "./paths";
import { defaultVerticalId, getVerticalById } from "./contentVerticals";
import {
  fetchTopicBankFromSupabase,
  topicBankSupabaseEnabled,
  upsertTopicBankToSupabase,
} from "@/lib/agenticTopicBankSupabase";

export function emptyTopicBank(): TopicBankFile {
  return {
    last_crawled_at: null,
    crawl_count: 0,
    used_count: 0,
    depleted: false,
    topics: [],
  };
}

/** Disk-only parse (no Supabase, no vertical migration). */
export function readTopicBankFromDisk(cwd: string): TopicBankFile | null {
  const p = topicBankPath(cwd);
  const data = readJsonFile<TopicBankFile | Record<string, never>>(p, {});
  if (!data || !Array.isArray((data as TopicBankFile).topics)) return null;
  return data as TopicBankFile;
}

export function writeTopicBankToDisk(cwd: string, bank: TopicBankFile): void {
  writeJsonFile(topicBankPath(cwd), bank);
}

function migrateVerticalLabels(bank: TopicBankFile): { bank: TopicBankFile; mutated: boolean } {
  const topics = bank.topics.map((t) => ({ ...t }));
  let mutated = false;
  for (const row of topics) {
    if (!row.vertical_id?.trim()) {
      row.vertical_id = defaultVerticalId();
      mutated = true;
    }
    const v = getVerticalById(row.vertical_id);
    if (v && !row.vertical_label) {
      row.vertical_label = v.label;
      mutated = true;
    }
  }
  return { bank: { ...bank, topics }, mutated };
}

/**
 * Topic bank: Supabase row when `AGENTIC_TOPIC_BANK_USE_SUPABASE=true`, else JSON on disk.
 * Falls back disk → Supabase when Supabase enabled but row missing (migration path).
 */
export async function readTopicBank(cwd: string): Promise<TopicBankFile | null> {
  let raw: TopicBankFile | null = null;
  if (topicBankSupabaseEnabled()) {
    raw = await fetchTopicBankFromSupabase();
  }
  if (!raw) {
    raw = readTopicBankFromDisk(cwd);
  }
  if (!raw) return null;

  const { bank, mutated } = migrateVerticalLabels({
    ...raw,
    topics: raw.topics.map((t) => ({ ...t })),
  });
  if (mutated) {
    try {
      await writeTopicBank(cwd, bank);
    } catch (e) {
      console.error("[topicBankStore] failed to persist vertical-label migration", e);
    }
  }
  return bank;
}

export async function writeTopicBank(cwd: string, bank: TopicBankFile): Promise<void> {
  const { bank: toSave } = migrateVerticalLabels({
    ...bank,
    topics: bank.topics.map((t) => ({ ...t })),
  });
  if (topicBankSupabaseEnabled()) {
    const r = await upsertTopicBankToSupabase(toSave);
    if (!r.ok) {
      throw new Error(`Topic bank Supabase upsert failed: ${r.error}`);
    }
  }
  writeTopicBankToDisk(cwd, toSave);
}

export function newTopicId(): string {
  return `tp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getUnusedTopics(bank: TopicBankFile): TopicBankEntry[] {
  return (bank.topics || [])
    .filter((t) => t.status === "unused")
    .sort((a, b) => b.final_score - a.final_score);
}

/** True when there is no readable bank or the bank has no topic rows yet. */
export async function isTopicBankMissingOrEmpty(cwd: string): Promise<boolean> {
  const b = await readTopicBank(cwd);
  if (!b) return true;
  return (b.topics?.length ?? 0) === 0;
}
