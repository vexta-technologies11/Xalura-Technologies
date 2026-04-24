import type { TopicBankEntry, TopicBankFile } from "./types";
import { readJsonFile, writeJsonFile } from "./jsonStore";
import { seoTrendLogsPath } from "./paths";
import { getVerticalById } from "./contentVerticals";

export type SeoTrendLogEntry = {
  rank: number;
  vertical_id: string;
  vertical_label: string;
  keyword: string;
  subcategory: string;
  angle?: string;
  final_score: number;
  content_type: TopicBankEntry["content_type"];
  source_urls: string[];
};

export type SeoTrendLogsFile = {
  updated_at: string;
  crawl_count: number;
  topic_count: number;
  /** One row per ranked topic (target 20) — shared evidence for hierarchy / Chief. */
  entries: SeoTrendLogEntry[];
};

const EMPTY: SeoTrendLogsFile = {
  updated_at: "",
  crawl_count: 0,
  topic_count: 0,
  entries: [],
};

export function readSeoTrendLogs(cwd: string): SeoTrendLogsFile {
  return readJsonFile(seoTrendLogsPath(cwd), EMPTY);
}

export function writeSeoTrendLogsFromBank(cwd: string, bank: TopicBankFile): void {
  const entries: SeoTrendLogEntry[] = (bank.topics ?? []).map((t) => {
    const v = getVerticalById(t.vertical_id);
    return {
      rank: t.rank,
      vertical_id: t.vertical_id,
      vertical_label: t.vertical_label ?? v?.label ?? t.vertical_id,
      keyword: t.keyword,
      subcategory: t.subcategory,
      angle: t.angle,
      final_score: t.final_score,
      content_type: t.content_type,
      source_urls: (t.source_urls ?? []).slice(0, 5),
    };
  });
  const out: SeoTrendLogsFile = {
    updated_at: bank.last_crawled_at ?? new Date().toISOString(),
    crawl_count: bank.crawl_count,
    topic_count: entries.length,
    entries,
  };
  writeJsonFile(seoTrendLogsPath(cwd), out);
}
