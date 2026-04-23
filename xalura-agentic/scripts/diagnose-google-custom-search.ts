/**
 * One Custom Search request + full error body (no API key values printed).
 * npx tsx --env-file=.env.local xalura-agentic/scripts/diagnose-google-custom-search.ts
 */
import { googleCustomSearch } from "../lib/contentWorkflow/googleCustomSearch";
import { resolveWorkerEnv } from "../lib/resolveWorkerEnv";

function mask(s: string | undefined): string {
  if (!s) return "(unset)";
  const t = s.trim();
  if (t.length <= 8) return `${t.length} chars`;
  return `${t.slice(0, 4)}…${t.slice(-4)} (${t.length} chars)`;
}

void (async () => {
  const keyName = (await resolveWorkerEnv("GOOGLE_CUSTOM_SEARCH_API_KEY"))
    ? "GOOGLE_CUSTOM_SEARCH_API_KEY"
    : (await resolveWorkerEnv("GOOGLE_SEARCH_API_KEY"))
      ? "GOOGLE_SEARCH_API_KEY"
      : "(none)";
  const cxRaw =
    (await resolveWorkerEnv("GOOGLE_CUSTOM_SEARCH_CX")) ||
    (await resolveWorkerEnv("GOOGLE_SEARCH_ENGINE_ID"));
  const keyRaw =
    (await resolveWorkerEnv("GOOGLE_CUSTOM_SEARCH_API_KEY")) ||
    (await resolveWorkerEnv("GOOGLE_SEARCH_API_KEY"));

  console.log("Env resolution:");
  console.log("  Key from:", keyName, "→", mask(keyRaw));
  console.log("  cx / engine id:", mask(cxRaw));

  const r = await googleCustomSearch("test", 3);
  if (r.error) {
    console.log("\nCustom Search returned an error string:\n", r.error);
    console.log(
      "\n--- What to check ---\n" +
        "1) Cloud Console → **same project** as this API key (Credentials → open key → project name in header).\n" +
        "2) APIs & Services → **Enabled APIs** → list must include **Custom Search API**.\n" +
        "3) Billing linked to **that** project.\n" +
        "4) Only ONE key pair in .env: prefer GOOGLE_CUSTOM_SEARCH_API_KEY + GOOGLE_CUSTOM_SEARCH_CX (remove duplicate GOOGLE_SEARCH_* if values differ).\n" +
        "5) If Google is blocking **new** projects for this product, search: Custom Search JSON API 403 new project — you may need Google support or another search provider.",
    );
    process.exitCode = 1;
    return;
  }
  console.log("\nOK —", r.items?.length ?? 0, "items");
  for (const it of r.items ?? []) {
    console.log(" -", it.title.slice(0, 80));
  }
})();
