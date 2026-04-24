import { ARTICLE_SUBCATEGORY_OPTIONS } from "@/lib/articleSubcategories";

const SET = new Set<string>(ARTICLE_SUBCATEGORY_OPTIONS);

/** True if the string exactly matches a public library subcategory (trimmed). */
export function isArticleSubcategoryLabel(s: string | undefined | null): boolean {
  if (!s?.trim()) return false;
  return SET.has(s.trim());
}
