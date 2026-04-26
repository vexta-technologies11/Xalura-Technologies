import { createServiceClient } from "@/lib/supabase/service";
import { computeArticleSlug } from "@/lib/agenticArticlePublish";

export type PublishAgenticNewsInput = {
  title: string;
  body: string;
  slug?: string;
  excerpt?: string;
  author?: string;
  coverImageUrl?: string | null;
  /** ai | technology | both */
  track?: string | null;
  sourceCitations?: unknown;
  primarySourceUrl?: string | null;
};

function makeNewsExcerpt(body: string): string | null {
  const withoutTitle = body
    .replace(/^\s*#\s+.*\n+/, "")
    .replace(/\r\n/g, "\n")
    .trim();
  if (!withoutTitle) return null;
  const firstParagraph = withoutTitle.split(/\n\n+/).find((p) => p.trim().length > 0);
  const raw = (firstParagraph ?? withoutTitle).replace(/\s+/g, " ").trim();
  if (!raw) return null;
  const cleaned = raw
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 260) || null;
}

/**
 * Upsert a published row into Supabase `news_items` (service role). Site: `/news/[slug]`.
 */
export async function publishAgenticNews(
  input: PublishAgenticNewsInput,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const supabase = createServiceClient();
  if (!supabase) {
    return {
      ok: false,
      error:
        "Supabase service client unavailable (set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY).",
    };
  }
  const slug = computeArticleSlug(input.title, input.slug);
  const excerpt =
    input.excerpt?.trim() ||
    makeNewsExcerpt(input.body) ||
    null;
  const row: Record<string, unknown> = {
    slug,
    title: input.title.trim(),
    excerpt,
    body: input.body,
    author: input.author?.trim() || "Xalura News",
    is_published: true,
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (input.coverImageUrl !== undefined) {
    row["cover_image_url"] = input.coverImageUrl?.trim() || null;
  }
  if (input.track !== undefined) {
    row["track"] = input.track?.trim() || null;
  }
  if (input.sourceCitations !== undefined) {
    row["source_citations"] = input.sourceCitations ?? null;
  }
  if (input.primarySourceUrl !== undefined) {
    row["primary_source_url"] = input.primarySourceUrl?.trim() || null;
  }
  const { error } = await supabase.from("news_items").upsert(row, { onConflict: "slug" });
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, slug };
}
