import type { ContentType, PublishedTopicEntry, PublishedTopicsFile } from "./types";
import { readJsonFile, writeJsonFile } from "./jsonStore";
import { publishedTopicsPath } from "./paths";

const EMPTY: PublishedTopicsFile = { topics: [] };

export function readPublishedTopics(cwd: string): PublishedTopicsFile {
  return readJsonFile(publishedTopicsPath(cwd), EMPTY);
}

export function appendPublishedTopic(
  cwd: string,
  entry: PublishedTopicEntry,
): void {
  const cur = readPublishedTopics(cwd);
  cur.topics.push(entry);
  if (cur.topics.length > 500) cur.topics = cur.topics.slice(-500);
  writeJsonFile(publishedTopicsPath(cwd), cur);
}

export function recentKeywords(
  cwd: string,
  withinDays: number,
): { keyword: string; subcategory?: string; published_at: string }[] {
  const { topics } = readPublishedTopics(cwd);
  const cutoff = Date.now() - withinDays * 24 * 60 * 60 * 1000;
  return topics
    .filter((t) => new Date(t.published_at).getTime() >= cutoff)
    .map((t) => ({
      keyword: t.keyword,
      subcategory: t.subcategory,
      published_at: t.published_at,
    }));
}

export function slugForKeyword(keyword: string): string {
  return keyword
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "article";
}

export function recordArticlePublished(
  cwd: string,
  params: {
    keyword: string;
    slug?: string;
    content_type?: ContentType;
    subcategory?: string;
  },
): void {
  const slug = params.slug?.trim() || slugForKeyword(params.keyword);
  appendPublishedTopic(cwd, {
    slug,
    keyword: params.keyword,
    published_at: new Date().toISOString(),
    content_type: params.content_type ?? "article",
    subcategory: params.subcategory,
  });
}
