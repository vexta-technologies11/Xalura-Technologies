import { resolveWorkerEnv } from "../resolveWorkerEnv";

export async function googleCustomSearchConfigured(): Promise<boolean> {
  const key =
    (await resolveWorkerEnv("GOOGLE_CUSTOM_SEARCH_API_KEY"))?.trim() ||
    (await resolveWorkerEnv("GOOGLE_SEARCH_API_KEY"))?.trim();
  const cx =
    (await resolveWorkerEnv("GOOGLE_CUSTOM_SEARCH_CX"))?.trim() ||
    (await resolveWorkerEnv("GOOGLE_SEARCH_ENGINE_ID"))?.trim();
  return !!(key && cx);
}

export type GoogleSearchResultItem = {
  title: string;
  link: string;
  snippet: string;
};

/** Full message + nested `errors[]` from Custom Search JSON API (no secrets). */
export function formatGoogleCustomSearchError(
  json: Record<string, unknown>,
  httpStatus: number,
): string {
  const errObj = json["error"];
  if (typeof errObj !== "object" || errObj === null) {
    return `Google Custom Search HTTP ${httpStatus}`;
  }
  const o = errObj as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof o["message"] === "string") parts.push(o["message"]);
  if (typeof o["status"] === "string") parts.push(`API status: ${o["status"]}`);
  const errs = o["errors"];
  if (Array.isArray(errs)) {
    for (const row of errs) {
      if (!row || typeof row !== "object") continue;
      const e = row as Record<string, unknown>;
      const line = [e["domain"], e["reason"], e["message"]]
        .filter((x) => typeof x === "string")
        .join(" | ");
      if (line) parts.push(line);
    }
  }
  const out = parts.join("\n").trim();
  return (out || `Google Custom Search HTTP ${httpStatus}`).slice(0, 900);
}

/**
 * [Programmable Search Engine](https://developers.google.com/custom-search/v1/overview)
 * — env: `GOOGLE_CUSTOM_SEARCH_API_KEY` + `GOOGLE_CUSTOM_SEARCH_CX`, or
 * `GOOGLE_SEARCH_API_KEY` + `GOOGLE_SEARCH_ENGINE_ID`.
 */
export async function googleCustomSearch(
  query: string,
  num: number = 10,
): Promise<{ items?: GoogleSearchResultItem[]; error?: string }> {
  const key =
    (await resolveWorkerEnv("GOOGLE_CUSTOM_SEARCH_API_KEY"))?.trim() ||
    (await resolveWorkerEnv("GOOGLE_SEARCH_API_KEY"))?.trim();
  const cx =
    (await resolveWorkerEnv("GOOGLE_CUSTOM_SEARCH_CX"))?.trim() ||
    (await resolveWorkerEnv("GOOGLE_SEARCH_ENGINE_ID"))?.trim();
  if (!key || !cx) {
    return {
      error:
        "Google Custom Search not configured: set GOOGLE_CUSTOM_SEARCH_API_KEY + GOOGLE_CUSTOM_SEARCH_CX (or GOOGLE_SEARCH_API_KEY + GOOGLE_SEARCH_ENGINE_ID).",
    };
  }
  const u = new URL("https://www.googleapis.com/customsearch/v1");
  u.searchParams.set("key", key);
  u.searchParams.set("cx", cx);
  u.searchParams.set("q", query);
  u.searchParams.set("num", String(Math.min(Math.max(num, 1), 10)));
  const referer =
    (await resolveWorkerEnv("GOOGLE_CUSTOM_SEARCH_HTTP_REFERER"))?.trim() ||
    (await resolveWorkerEnv("AGENTIC_PUBLIC_BASE_URL"))?.trim() ||
    (await resolveWorkerEnv("NEXT_PUBLIC_SITE_URL"))?.trim();
  const headers: Record<string, string> = {};
  if (referer) {
    headers["Referer"] = referer.replace(/\/$/, "");
  }
  const res = await fetch(u.toString(), {
    headers: Object.keys(headers).length ? headers : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    return { error: formatGoogleCustomSearchError(json, res.status) };
  }
  const itemsRaw = Array.isArray(json["items"]) ? json["items"] : [];
  const items: GoogleSearchResultItem[] = [];
  for (const row of itemsRaw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const title = typeof o["title"] === "string" ? o["title"] : "";
    const link = typeof o["link"] === "string" ? o["link"] : "";
    const snippet = typeof o["snippet"] === "string" ? o["snippet"] : "";
    if (link) items.push({ title, link, snippet });
  }
  return { items };
}
