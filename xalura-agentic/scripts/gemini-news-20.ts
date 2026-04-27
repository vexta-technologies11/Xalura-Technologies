import { geminiSuggestUrls, geminiExtractFromHtml, geminiConfigured } from "../lib/geminiClient";

async function fetchWithTimeout(url: string, timeout = 15000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; XaluraBot/1.0)" } });
    clearTimeout(id);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!/html/i.test(ct)) return null;
    return await res.text().catch(() => null);
  } catch (e) {
    return null;
  }
}

function uniqByLink(items: { link: string }[]) {
  const seen = new Set<string>();
  const out: typeof items = [];
  for (const it of items) {
    const k = (it.link || "").trim();
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

async function gatherNews(query = "artificial intelligence news today", target = 20) {
  if (!(await geminiConfigured())) {
    throw new Error("Gemini not configured (GEMINI_API_KEY)");
  }

  // Ask Gemini for a larger candidate pool then filter
  const candSize = Math.max(target * 2, 40);
  const cand = await geminiSuggestUrls(query, candSize);
  if (cand.error) throw new Error(`Gemini suggest error: ${cand.error}`);
  let items = (cand.items || []).map((i) => ({ title: i.title, link: i.link, snippet: i.snippet }));
  items = uniqByLink(items);

  const out: Array<{ title: string; link: string; snippet?: string; excerpt?: string }> = [];

  const concurrency = 5;
  let idx = 0;
  while (out.length < target && idx < items.length) {
    const batch = items.slice(idx, idx + concurrency);
    const promises = batch.map(async (it) => {
      const html = await fetchWithTimeout(it.link, 12_000);
      if (!html) {
        // couldn't fetch or non-html — return snippet only
        return { ...it, excerpt: it.snippet };
      }
      const ex = await geminiExtractFromHtml(html, { maxChars: 12000 });
      if (ex.error) return { ...it, excerpt: it.snippet };
      return { ...it, excerpt: (ex.markdown || it.snippet)?.slice(0, 2000) };
    });
    const results = await Promise.all(promises);
    for (const r of results) {
      if (out.length >= target) break;
      out.push(r as any);
    }
    idx += concurrency;
  }

  return out.slice(0, target);
}

async function main() {
  const q = process.env.GEMINI_NEWS_QUERY || process.argv.slice(2).join(" ") || "artificial intelligence news today";
  const n = Number(process.env.GEMINI_NEWS_COUNT || process.argv[3] || 20);
  try {
    console.log(`Gathering ${n} news items for query: ${q}`);
    const items = await gatherNews(q, n);
    console.log(JSON.stringify({ ok: true, items }, null, 2));
  } catch (e: any) {
    console.error(JSON.stringify({ ok: false, error: (e && e.message) || String(e) }, null, 2));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
