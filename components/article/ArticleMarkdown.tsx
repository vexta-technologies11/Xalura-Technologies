"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  /** Stored article body (Markdown from agentic / editors). */
  source: string;
};

/**
 * Renders article Markdown safely (no raw HTML pass-through).
 * GitHub-flavored extras: tables, strikethrough, task lists, autolinks.
 */
export function ArticleMarkdown({ source }: Props) {
  return (
    <div className="article-markdown">
      <Markdown remarkPlugins={[remarkGfm]}>{source}</Markdown>
    </div>
  );
}
