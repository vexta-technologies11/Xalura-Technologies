import { createServiceClient } from "@/lib/supabase/service";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "article";
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
  const slug = (input.slug?.trim() && slugify(input.slug.trim())) || slugify(input.title);
  const excerpt =
    input.excerpt?.trim() ||
    input.body.replace(/\s+/g, " ").trim().slice(0, 280) ||
    null;
  const row = {
    slug,
    title: input.title.trim(),
    excerpt,
    body: input.body,
    author: input.author?.trim() || "Xalura Agentic",
    is_published: true,
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("articles").upsert(row, { onConflict: "slug" });
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, slug };
}
