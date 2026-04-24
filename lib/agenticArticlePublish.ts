import { createServiceClient } from "@/lib/supabase/service";

export function slugifyArticle(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "article";
}

/** Stable slug for `articles.slug` (matches upsert logic). */
export function computeArticleSlug(title: string, slugOverride?: string): string {
  return (
    (slugOverride?.trim() && slugifyArticle(slugOverride.trim())) || slugifyArticle(title)
  );
}

/** First markdown `# Title` line, else null. */
export function extractMarkdownTitle(md: string): string | null {
  const m = /^#\s+(.+)$/m.exec(md.trim());
  const t = m?.[1]?.trim();
  return t || null;
}

export type PublishAgenticArticleInput = {
  title: string;
  body: string;
  slug?: string;
  excerpt?: string;
  author?: string;
  /** Public URL (e.g. Supabase Storage) for article hero — optional. */
  coverImageUrl?: string | null;
  /** Library subcategory label (e.g. AI for …). */
  subcategory?: string | null;
};

/**
 * Upsert a published row into Supabase `articles` (service role). Site: `/articles/[slug]`.
 */
export async function publishAgenticArticle(
  input: PublishAgenticArticleInput,
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
    author: input.author?.trim() || "Xalura Agentic",
    is_published: true,
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (input.coverImageUrl !== undefined) {
    row["cover_image_url"] = input.coverImageUrl?.trim() || null;
  }
  if (input.subcategory !== undefined) {
    row["subcategory"] = input.subcategory?.trim() || null;
  }
  const { error } = await supabase.from("articles").upsert(row, { onConflict: "slug" });
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, slug };
}
