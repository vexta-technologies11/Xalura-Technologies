import { geminiSuggestUrls, geminiExtractFromHtml, geminiConfigured } from "../lib/geminiClient";

async function main() {
  console.log("Diagnose Gemini: starting");
  const ok = await geminiConfigured();
  console.log("Gemini configured:", ok);
  const query = process.env.DIAGNOSE_QUERY || "artificial intelligence news";
  if (ok) {
    console.log(`Running geminiSuggestUrls for query: ${query}`);
    const s = await geminiSuggestUrls(query, 5);
    console.log("Suggest result:", JSON.stringify(s, null, 2));

    const sampleUrl = (s.items && s.items[0] && s.items[0].link) || process.env.DIAGNOSE_URL || "https://example.com/";
    console.log(`Attempting extract for: ${sampleUrl}`);
    try {
      const res = await fetch(sampleUrl, { method: "GET" });
      const html = await res.text().catch(() => "");
      const ex = await geminiExtractFromHtml(html, { maxChars: 20000 });
      console.log("Extract result (truncated):", (ex.markdown || ex.error || '').slice(0, 2000));
    } catch (err) {
      console.error("Fetch/extract error:", err);
    }
  } else {
    console.log("Gemini not configured. Set GEMINI_API_KEY in .env.local to run diagnostics.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
