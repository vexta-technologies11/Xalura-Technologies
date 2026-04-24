import type { TopicBankEntry, TopicBankFile } from "./types";
import { readJsonFile, writeJsonFile } from "./jsonStore";
import { topicBankPath } from "./paths";
import { defaultVerticalId, getVerticalById } from "./contentVerticals";

export function emptyTopicBank(): TopicBankFile {
  return {
    last_crawled_at: null,
    crawl_count: 0,
    used_count: 0,
    depleted: false,
    topics: [],
  };
}

export function readTopicBank(cwd: string): TopicBankFile | null {
  const p = topicBankPath(cwd);
  const data = readJsonFile<TopicBankFile | Record<string, never>>(p, {});
  if (!data || !Array.isArray((data as TopicBankFile).topics)) return null;
  const bank = data as TopicBankFile;
  let mutated = false;
  for (const t of bank.topics) {
    const row = t as TopicBankEntry;
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
  if (mutated) writeJsonFile(p, bank);
  return bank;
}

export function writeTopicBank(cwd: string, bank: TopicBankFile): void {
  writeJsonFile(topicBankPath(cwd), bank);
}

export function newTopicId(): string {
  return `tp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getUnusedTopics(bank: TopicBankFile): TopicBankEntry[] {
  return (bank.topics || [])
    .filter((t) => t.status === "unused")
    .sort((a, b) => b.final_score - a.final_score);
}

/** True when there is no readable bank file or the bank has no topic rows yet. */
export function isTopicBankMissingOrEmpty(cwd: string): boolean {
  const b = readTopicBank(cwd);
  if (!b) return true;
  return (b.topics?.length ?? 0) === 0;
}
