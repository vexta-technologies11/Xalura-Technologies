import { resolveWorkerEnv } from "../resolveWorkerEnv";

export type SerpOrganicItem = {
  title: string;
  link: string;
  snippet: string;
};

export type SerpApiSearchResult = {
  items?: SerpOrganicItem[];
  error?: string;
  /** Full JSON body from SerpAPI (API key redacted in logs — never put key in returned JSON). */
  errorBody?: string;
  httpStatus?: number;
};

function redactKeyInText(text: string, apiKey: string): string {
  if (!apiKey || apiKey.length < 8) return text;
  return text.split(apiKey).join("***REDACTED***");
}

function bodyForDebug(json: Record<string, unknown>, rawText: string, apiKey: string): string {
  const raw = redactKeyInText(
    Object.keys(json).length > 0 ? JSON.stringify(json, null, 2) : rawText,
    apiKey,
  );
  return raw.slice(0, 12_000);
}

function formatSerpErrorMessage(
  json: Record<string, unknown>,
  httpStatus: number,
  rawText: string,
): string {
  const e = json["error"];
  if (typeof e === "string" && e.trim()) return e.trim().slice(0, 600);
  if (typeof e === "object" && e !== null) {
    const o = e as Record<string, unknown>;
    if (typeof o["message"] === "string") return o["message"].slice(0, 600);
  }
  const t = rawText.trim();
  if (t) return `SerpAPI HTTP ${httpStatus}: ${t.slice(0, 400)}`;
  return `SerpAPI HTTP ${httpStatus}`;
}

/**
 * [SerpAPI](https://serpapi.com/) — Google organic-style results for the topic bank.
 * Env: **`SERPAPI_API_KEY`** (required). Optional **`SERPAPI_ENGINE`** (default `google`).
 */
export async function serpApiConfigured(): Promise<boolean> {
  const k = (await resolveWorkerEnv("SERPAPI_API_KEY"))?.trim();
  return !!k;
}

export async function serpApiSearch(
  query: string,
  num: number = 10,
): Promise<SerpApiSearchResult> {
  const apiKey = (await resolveWorkerEnv("SERPAPI_API_KEY"))?.trim();
  if (!apiKey) {
    return {
      error:
        "SerpAPI not configured: set SERPAPI_API_KEY (https://serpapi.com/manage-api-key).",
    };
  }

  const engine =
    (await resolveWorkerEnv("SERPAPI_ENGINE"))?.trim().toLowerCase() || "google";
  const u = new URL("https://serpapi.com/search.json");
  u.searchParams.set("engine", engine);
  u.searchParams.set("q", query);
  u.searchParams.set("api_key", apiKey);
  u.searchParams.set(
    "num",
    String(Math.min(Math.max(Math.floor(num), 1), 10)),
  );

  const res = await fetch(u.toString());
  const rawText = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    json = {};
  }

  const errMsg =
    typeof json["error"] === "string"
      ? (json["error"] as string).trim()
      : typeof json["error"] === "object" &&
          json["error"] !== null &&
          typeof (json["error"] as { message?: string }).message === "string"
        ? String((json["error"] as { message: string }).message).trim()
        : "";

  if (!res.ok || errMsg) {
    const summary = errMsg || formatSerpErrorMessage(json, res.status, rawText);
    return {
      error: summary,
      errorBody: bodyForDebug(json, rawText, apiKey),
      httpStatus: res.status,
    };
  }

  const organicRaw = Array.isArray(json["organic_results"])
    ? json["organic_results"]
    : [];
  const items: SerpOrganicItem[] = [];
  for (const row of organicRaw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const title = typeof o["title"] === "string" ? o["title"] : "";
    const link = typeof o["link"] === "string" ? o["link"] : "";
    const snippet = typeof o["snippet"] === "string" ? o["snippet"] : "";
    if (link) items.push({ title, link, snippet });
  }

  return { items };
}
