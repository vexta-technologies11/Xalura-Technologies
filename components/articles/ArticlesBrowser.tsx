"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ARTICLE_SUBCATEGORY_OPTIONS } from "@/lib/articleSubcategories";
import { isArticleSubcategoryLabel } from "@/lib/articleSubcategoryGate";
import { ArticleCard } from "./ArticleCard";
import type { ArticleListItem } from "./types";

export type { ArticleListItem } from "./types";

type ArticlesBrowserProps = {
  articles: ArticleListItem[];
  /** Server-validated `?subcategory=` (public labels only; invalid ignored). */
  defaultSubcategory?: string | null;
};

const ALL = "";

export function ArticlesBrowser({ articles, defaultSubcategory }: ArticlesBrowserProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const fromProps =
    defaultSubcategory && isArticleSubcategoryLabel(defaultSubcategory)
      ? defaultSubcategory.trim()
      : ALL;

  const [subcategory, setSubcategory] = useState(fromProps);

  useEffect(() => {
    const raw = searchParams.get("subcategory");
    if (raw && isArticleSubcategoryLabel(raw)) {
      setSubcategory(raw.trim());
    } else {
      setSubcategory(ALL);
    }
  }, [searchParams]);

  const filtered = useMemo(() => {
    if (subcategory === ALL) return articles;
    return articles.filter((a) => (a.subcategory ?? "").trim() === subcategory);
  }, [articles, subcategory]);

  return (
    <div className="articles-browser">
      <div className="articles-browser__filter">
        <label className="articles-browser__label" htmlFor="subcategory-select">
          Subcategory
        </label>
        <select
          id="subcategory-select"
          className="articles-browser__select"
          value={subcategory}
          onChange={(e) => {
            const v = e.target.value;
            setSubcategory(v);
            const next = new URLSearchParams(searchParams.toString());
            if (v === ALL) next.delete("subcategory");
            else next.set("subcategory", v);
            const q = next.toString();
            router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
          }}
        >
          <option value={ALL}>All Subcategories</option>
          {ARTICLE_SUBCATEGORY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="body-text" style={{ marginTop: 24 }}>
          {articles.length === 0
            ? "No articles yet."
            : "No articles match this subcategory. Try All Subcategories."}
        </p>
      ) : (
        <ul className="articles-browser__grid">
          {filtered.map((a) => (
            <li key={a.id} className="articles-browser__cell">
              <ArticleCard article={a} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
