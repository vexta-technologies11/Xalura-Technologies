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
};

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
    input.body.replace(/\s+/g, " ").trim().slice(0, 280) ||
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
  const { error } = await supabase.from("news_items").upsert(row, { onConflict: "slug" });
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, slug };
}
