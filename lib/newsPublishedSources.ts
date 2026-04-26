import { createServiceClient } from "@/lib/supabase/service";

function normalizeNewsUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    u.hash = "";
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.replace(/\/+$/, "");
    }
    return u.toString();
  } catch {
    return t.replace(/#.*$/, "").replace(/\/+$/, "") || null;
  }
}

function looksLikeUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

function extractPrimaryUrlFromCitation(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const direct =
    typeof obj["primary_source_url"] === "string"
      ? obj["primary_source_url"]
      : typeof obj["primarySourceUrl"] === "string"
        ? obj["primarySourceUrl"]
        : null;
  if (direct && looksLikeUrl(direct)) {
    return normalizeNewsUrl(direct);
  }
  const pool = obj["pool"];
  if (Array.isArray(pool) && pool.length > 0) {
    const first = pool[0];
    if (first && typeof first === "object") {
      const link = (first as Record<string, unknown>)["link"];
      if (typeof link === "string" && looksLikeUrl(link)) {
        return normalizeNewsUrl(link);
      }
    }
  }
  return null;
}

/**
 * Published news source URLs, normalized. This includes:
 * - `primary_source_url` when present
 * - URLs found anywhere inside `source_citations` (pool/checklist payloads)
 */
export async function fetchPublishedNewsSourceUrls(): Promise<Set<string>> {
  const supabase = createServiceClient();
  if (!supabase) return new Set();
  const { data, error } = await supabase
    .from("news_items")
    .select("primary_source_url, source_citations")
    .eq("is_published", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(1000);
  if (error || !data) {
    return new Set();
  }
  const out = new Set<string>();
  for (const row of data as Array<{ primary_source_url?: string | null; source_citations?: unknown }>) {
    if (row.primary_source_url) {
      const n = normalizeNewsUrl(row.primary_source_url);
      if (n) out.add(n);
    }
    const c = extractPrimaryUrlFromCitation(row.source_citations);
    if (c) out.add(c);
  }
  return out;
}

export function normalizeNewsSourceUrl(raw: string): string | null {
  return normalizeNewsUrl(raw);
}

export function filterOutPublishedNewsItems<T extends { link: string }>(
  items: T[],
  publishedUrls: Set<string>,
): T[] {
  if (publishedUrls.size === 0) return items;
  return items.filter((item) => {
    const n = normalizeNewsUrl(item.link);
    if (!n) return true;
    return !publishedUrls.has(n);
  });
}
