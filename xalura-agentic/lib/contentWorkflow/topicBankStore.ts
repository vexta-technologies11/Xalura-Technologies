import type { TopicBankEntry, TopicBankFile } from "./types";
import { readJsonFile, writeJsonFile } from "./jsonStore";
import { topicBankPath } from "./paths";

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
  return data as TopicBankFile;
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
