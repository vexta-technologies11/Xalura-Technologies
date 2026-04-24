import { createServiceClient } from "@/lib/supabase/service";

/** Create a public bucket `article-covers` in Supabase (Dashboard → Storage) for live URLs. */
export const ARTICLE_COVERS_BUCKET = "article-covers";

/**
 * Upload PNG bytes for an article hero. Returns public URL when the bucket is public.
 */
export async function uploadArticleCoverPng(params: {
  slug: string;
  pngBase64: string;
}): Promise<{ ok: true; publicUrl: string } | { ok: false; error: string }> {
  const supabase = createServiceClient();
  if (!supabase) {
    return { ok: false, error: "Supabase service client unavailable" };
  }
  const path = `${params.slug.replace(/[^a-z0-9-]/gi, "-").slice(0, 96)}.png`;
  let buffer: Buffer;
  try {
    buffer = Buffer.from(params.pngBase64, "base64");
  } catch {
    return { ok: false, error: "Invalid base64 image payload" };
  }
  if (!buffer.length) {
    return { ok: false, error: "Empty image buffer" };
  }
  const { error: upErr } = await supabase.storage
    .from(ARTICLE_COVERS_BUCKET)
    .upload(path, buffer, {
      contentType: "image/png",
      upsert: true,
    });
  if (upErr) {
    return { ok: false, error: upErr.message };
  }
  const { data } = supabase.storage.from(ARTICLE_COVERS_BUCKET).getPublicUrl(path);
  const publicUrl = data?.publicUrl;
  if (!publicUrl) {
    return { ok: false, error: "getPublicUrl returned no URL" };
  }
  return { ok: true, publicUrl };
}
