import { createServiceClient } from "@/lib/supabase/service";
import { ARTICLE_COVERS_BUCKET } from "@/lib/articleCoverStorage";

/**
 * News covers use the same public bucket with a `news/` prefix to avoid colliding with article slugs.
 */
export async function uploadNewsCoverPng(params: {
  slug: string;
  pngBase64: string;
  mimeType?: string;
}): Promise<{ ok: true; publicUrl: string } | { ok: false; error: string }> {
  const supabase = createServiceClient();
  if (!supabase) {
    return { ok: false, error: "Supabase service client unavailable" };
  }
  const mime = (params.mimeType || "image/png").split(";")[0]!.trim().toLowerCase();
  const ext = mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : "png";
  const contentType = ext === "jpg" ? "image/jpeg" : "image/png";
  const safe = params.slug.replace(/[^a-z0-9-]/gi, "-").slice(0, 80);
  const path = `news/${safe}.${ext}`;
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
      contentType,
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
