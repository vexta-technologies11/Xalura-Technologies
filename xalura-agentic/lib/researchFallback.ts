/**
 * Research Fallback Layer
 * ========================
 *
 * When SerpAPI and/or Firecrawl are exhausted, rate-limited, or unconfigured,
 * fall back to Gemini (via runAgent) to generate plausible research-grade
 * data so the pipeline never hard-aborts on API exhaustion.
 *
 * Philosophy
 * ----------
 * - SerpAPI returns < 5 results? → Gemini synthesises organic results from its
 *   training knowledge so the Worker still has "web evidence" to ground its draft.
 * - Firecrawl fails? → Gemini writes a short factual note about the URL domain
 *   (not fabricated page content — just topic context).
 * - Chief of Audit: skip SerpAPI entirely → Gemini does the fact-check natively.
 */

import { runAgent } from "./gemini";

// ─── helpers ─────────────────────────────────────────────────────────────────

function parseOrganicItemsFromJson(raw: string): { title: string; link: string; snippet: string }[] {
  const t = raw.trim();
  const start = t.indexOf("[");
  const end = t.lastIndexOf("]");
  if (start === -1 || end <= start) return [];
  try {
    const arr = JSON.parse(t.slice(start, end + 1)) as unknown[];
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x: unknown) => {
        if (!x || typeof x !== "object") return null;
        const o = x as Record<string, unknown>;
        const title = typeof o["title"] === "string" ? o["title"].trim() : "";
        const link = typeof o["link"] === "string" ? o["link"].trim() : "";
        const snippet = typeof o["snippet"] === "string" ? o["snippet"].trim() : "";
        if (!title && !link) return null;
        return { title: title || "(research topic)", link: link || `https://example.com/${encodeURIComponent(title)}`, snippet };
      })
      .filter((x): x is { title: string; link: string; snippet: string } => x !== null);
  } catch {
    return [];
  }
}

function parseNewsItemsFromJson(raw: string): { title: string; link: string; snippet: string; date: string; source: string }[] {
  const t = raw.trim();
  const start = t.indexOf("[");
  const end = t.lastIndexOf("]");
  if (start === -1 || end <= start) return [];
  try {
    const arr = JSON.parse(t.slice(start, end + 1)) as unknown[];
    if (!Array.isArray(arr)) return [];
    const result: { title: string; link: string; snippet: string; date: string; source: string }[] = [];
    for (const x of arr) {
      if (!x || typeof x !== "object") continue;
      const o = x as Record<string, unknown>;
      const title = typeof o["title"] === "string" ? o["title"].trim() : "";
      const link = typeof o["link"] === "string" ? o["link"].trim() : "";
      const snippet = typeof o["snippet"] === "string" ? o["snippet"].trim() : "";
      const date = typeof o["date"] === "string" ? o["date"].trim() : "today";
      const source = typeof o["source"] === "string" ? o["source"].trim() : "";
      if (!title && !link) continue;
      result.push({
        title: title || "(news topic)",
        link: link || `https://news.example.com/${encodeURIComponent(title)}`,
        snippet,
        date,
        source,
      });
    }
    return result;
  } catch {
    return [];
  }
}

// ─── SerpAPI organic fallback ────────────────────────────────────────────────

/**
 * Caller should try `serpApiSearch` first. If it returns an error OR fewer than
 * `minItems` items, call this to ask Gemini for synthetic organic results.
 *
 * Returns the same shape as `serpApiSearch` so callers can use it transparently.
 */
export async function geminiSerpOrganicFallback(
  query: string,
  minItems: number,
  num: number = 8,
): Promise<{ items?: { title: string; link: string; snippet: string }[]; error?: string; fallback: true }> {
  const task = `You are a **research fallback** for an SEO pipeline. SerpAPI is unavailable.
Generate ${num} realistic organic search results for the query: "${query.slice(0, 400)}"

**Rules:**
- Each item must have a \`title\`, \`link\` (use \`https://example.com/…\` placeholder domains), and \`snippet\`.
- Topics must be relevant to the query and plausible for Google search results.
- At least ${minItems} items required.
- Return ONLY a JSON array, no markdown fences.

Example shape:
[
  {"title": "Title of Result", "link": "https://example.com/article", "snippet": "Short description..."}
]`;

  const raw = await runAgent({
    role: "Worker",
    department: "SEO & Audit",
    task,
    context: { mode: "research_fallback_serp", query: query.slice(0, 200) },
  });

  const items = parseOrganicItemsFromJson(raw).slice(0, num);
  if (items.length >= minItems) {
    return { items, fallback: true };
  }
  // Last resort: return whatever we got, even if < minItems
  return { items: items.length ? items : [{ title: query, link: "https://example.com", snippet: `Gemini fallback generated for: ${query.slice(0, 200)}` }], fallback: true };
}

/**
 * Wrapper: try real SerpAPI first; if it fails or returns < minItems, use Gemini fallback.
 * Set `minItems = 0` to always prefer the real API even with few results.
 * Set `minItems = 5` to require at least 5 organic results before trusting SerpAPI.
 */
export async function serpApiSearchWithFallback(
  serpApiFn: (query: string, num: number) => Promise<{ items?: { title: string; link: string; snippet: string }[]; error?: string }>,
  query: string,
  num: number = 8,
  minItems: number = 5,
): Promise<{ items?: { title: string; link: string; snippet: string }[]; error?: string; fallback?: boolean }> {
  const real = await serpApiFn(query, num);
  if (!real.error && real.items && real.items.length >= minItems) {
    return real;
  }
  // Fallback to Gemini
  return geminiSerpOrganicFallback(query, minItems, num);
}

// ─── SerpAPI Google News fallback ────────────────────────────────────────────

export async function geminiNewsFallback(
  query: string,
  minItems: number,
  num: number = 10,
): Promise<{ items?: { title: string; link: string; snippet: string; date?: string; source?: string }[]; error?: string; fallback: true }> {
  const task = `You are a **news research fallback**. SerpAPI Google News is unavailable.
Generate ${num} realistic news headlines for the query topic: "${query.slice(0, 300)}"

**Rules:**
- Each item: \`title\`, \`link\` (use \`https://news.example.com/…\` placeholders), \`snippet\`, \`date\` (e.g. "today"), \`source\` (e.g. "TechCrunch", "Reuters").
- At least ${minItems} items.
- Return ONLY a JSON array, no markdown fences.

Example:
[
  {"title": "AI Model Achieves Breakthrough", "link": "https://news.example.com/ai-breakthrough", "snippet": "Description...", "date": "today", "source": "TechCrunch"}
]`;

  const raw = await runAgent({
    role: "Worker",
    department: "News — Pre-Production",
    task,
    context: { mode: "research_fallback_news", query: query.slice(0, 200) },
  });

  const items = parseNewsItemsFromJson(raw).slice(0, num);
  if (items.length >= minItems) {
    return { items, fallback: true };
  }
  return { items: items.length ? items : [{ title: query, link: "https://news.example.com", snippet: `Gemini news fallback for: ${query.slice(0, 200)}`, date: "today", source: "Xalura Research" }], fallback: true };
}

// ─── Firecrawl fallback ─────────────────────────────────────────────────────

/**
 * When Firecrawl is exhausted, ask Gemini to write a short factual note about the
 * topic/domain of the URL (never fabricated body content). This keeps the Worker
 * from having an empty research context.
 */
export async function firecrawlFallback(url: string): Promise<{ markdown?: string; error?: string; fallback: true }> {
  const domain = (() => {
    try { return new URL(url).hostname; } catch { return url.slice(0, 80); }
  })();
  const task = `Firecrawl is unavailable. Provide a short (2-3 sentence) factual note about the general topic or domain of this URL.

**URL:** ${url}
**Domain:** ${domain}

Do NOT fabricate specific page content. Just describe what the domain/site is generally known for, in a way that a Worker researching this topic could use as context. Max 150 words.`;

  const raw = await runAgent({
    role: "Worker",
    department: "SEO & Audit",
    task,
    context: { mode: "research_fallback_firecrawl", url: url.slice(0, 200) },
  });

  const cleaned = raw
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2_000);

  return { markdown: cleaned || `(Gemini fallback: domain note for ${domain})`, fallback: true };
}

/**
 * Wrapper: try real Firecrawl first; if error, use Gemini fallback.
 */
export async function firecrawlScrapeWithFallback(
  firecrawlFn: (url: string, formats?: ("markdown" | "html")[]) => Promise<{ markdown?: string; html?: string; error?: string }>,
  url: string,
): Promise<{ markdown?: string; html?: string; error?: string; fallback?: boolean }> {
  const real = await firecrawlFn(url, ["markdown"]);
  if (!real.error && real.markdown) {
    return real;
  }
  return firecrawlFallback(url);
}

// ─── Chief of Audit — pure Gemini (no SerpAPI) ──────────────────────────────

/**
 * News Chief of Audit fact-check using **only Gemini**.
 * Replaces the SerpAPI-based `serpForAuditorLine` entirely.
 * Returns a concise paragraph the auditor can use to verify the draft.
 */
export async function auditorSerpWithGemini(draftTitle: string, draftBody: string): Promise<string> {
  const task = `You are the **Chief of Audit's research assistant**. The News Writer drafted a story titled: "${draftTitle}"

Your job: independently assess whether this topic is grounded in real-world events. Write a short paragraph (3-5 sentences) that:
1. Identifies what real-world events or trends this title refers to
2. Notes any factual claims in the body you can verify from your training knowledge
3. Flags anything that sounds implausible or fabricated
4. Is honest if you don't know something

**Draft body (excerpt):**
${draftBody.slice(0, 4_000)}

Output only the paragraph — no meta, no JSON, no role intro.`;

  const raw = await runAgent({
    role: "Worker",
    department: "News — Chief of Audit",
    task,
    context: { mode: "auditor_fact_check", title: draftTitle.slice(0, 200) },
  });

  return raw
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 3_000) || "(Chief of Audit fallback: Gemini was unable to verify this topic independently.)";
}
