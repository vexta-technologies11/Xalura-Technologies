/**
 * One SerpAPI search + full error body on failure (API key masked in debug JSON).
 * npx tsx --env-file=.env.local xalura-agentic/scripts/diagnose-serpapi-search.ts
 */
import { serpApiSearch } from "../lib/contentWorkflow/serpApiSearch";
import { resolveWorkerEnv } from "../lib/resolveWorkerEnv";

function mask(s: string | undefined): string {
  if (!s) return "(unset)";
  const t = s.trim();
  if (t.length <= 6) return `${t.length} chars`;
  return `${t.slice(0, 3)}…${t.slice(-3)} (${t.length} chars)`;
}

void (async () => {
  const key = (await resolveWorkerEnv("SERPAPI_API_KEY"))?.trim();
  console.log("SERPAPI_API_KEY:", mask(key));

  const r = await serpApiSearch("test", 5);
  if (r.error) {
    console.log("\nSummary:\n", r.error);
    if (r.httpStatus != null) console.log("\nHTTP:", r.httpStatus);
    if (r.errorBody?.trim()) {
      console.log("\n--- Full SerpAPI response body (key redacted) ---\n");
      console.log(r.errorBody);
    }
    process.exitCode = 1;
    return;
  }
  console.log("\nOK —", r.items?.length ?? 0, "organic results");
  for (const it of r.items ?? []) {
    console.log(" -", it.title.slice(0, 90));
  }
})();
