/**
 * One SEO Worker, all external APIs: Gemini (Worker/Manager/Executive), SerpAPI, Firecrawl, topic bank row.
 * Does not use stub mode.
 *
 * From repo root (requires `.env.local` with keys):
 *   npx tsx --env-file=.env.local xalura-agentic/scripts/smoke-seo-one-worker-all-apis.ts
 *
 * Needs: GEMINI_API_KEY, SERPAPI_API_KEY, FIRECRAWL_API_KEY, and a non-empty topic bank
 * (run `smoke-architecture-live.ts` or POST refresh-topic-bank first if the bank is empty).
 */
import { runSeoPipeline } from "../departments/seo";
import { getNextTopic } from "../lib/contentWorkflow/topicBank";
import { readTopicBank } from "../lib/contentWorkflow/topicBankStore";
import { refreshTopicBank } from "../lib/contentWorkflow/topicBankRefresh";
import { isGeminiConfigured } from "../lib/gemini";
import { serpApiSearch, serpApiConfigured } from "../lib/contentWorkflow/serpApiSearch";
import { resolveWorkerEnv } from "../lib/resolveWorkerEnv";
import { buildTopicSerpQuery } from "../lib/seoTopicResearchContext";

const cwd = process.cwd();

async function main() {
  const gemini = await isGeminiConfigured();
  const serp = await serpApiConfigured();
  const fc = !!(await resolveWorkerEnv("FIRECRAWL_API_KEY"))?.trim();
  console.log("=== Config (booleans only) ===");
  console.log(`  GEMINI_API_KEY: ${gemini ? "set" : "MISSING"}`);
  console.log(`  SERPAPI_API_KEY: ${serp ? "set" : "MISSING"}`);
  console.log(`  FIRECRAWL_API_KEY: ${fc ? "set" : "MISSING"}`);
  if (!gemini || !serp || !fc) {
    console.error("\nSet all three in .env.local, then:\n  npx tsx --env-file=.env.local xalura-agentic/scripts/smoke-seo-one-worker-all-apis.ts");
    process.exitCode = 1;
    return;
  }

  let bank = await readTopicBank(cwd);
  const unused = (bank?.topics ?? []).filter((t) => t.status === "unused");
  if (!bank?.topics?.length || unused.length === 0) {
    console.log("\n=== Refill topic bank (SerpAPI + Firecrawl + Gemini) ===\n");
    const ref = await refreshTopicBank(cwd, { skipAudit: true });
    if (!ref.ok) {
      console.error("refreshTopicBank failed:", ref.error);
      process.exitCode = 1;
      return;
    }
    bank = await readTopicBank(cwd);
  }

  console.log("\n=== Next topic from bank (consumes one row) ===\n");
  const gate = await getNextTopic(cwd, { allowStubFallback: false });
  if (!gate.ok) {
    console.error("getNextTopic:", gate.reason);
    process.exitCode = 1;
    return;
  }
  const topic = gate.topic;

  console.log("TOPIC (full row):");
  console.log(JSON.stringify(topic, null, 2));

  const q = buildTopicSerpQuery(topic.keyword, topic.subcategory);
  console.log("\n=== SerpAPI preview (same query as Worker context) ===");
  console.log("Query:", q, "\n");

  const search = await serpApiSearch(q, 8);
  if (search.error) {
    console.error("SerpAPI error:", search.error);
    process.exitCode = 1;
    return;
  }
  console.log("Organic results (titles / links / snippets):");
  for (let i = 0; i < (search.items ?? []).length; i++) {
    const it = search.items![i]!;
    console.log(`\n  ${i + 1}. ${it.title}`);
    console.log(`     ${it.link}`);
    console.log(`     ${(it.snippet ?? "").slice(0, 220)}${(it.snippet?.length ?? 0) > 220 ? "…" : ""}`);
  }

  console.log("\n=== runSeoPipeline (one Worker + Manager + Executive; live Serp+Firecrawl in Worker turn) ===\n");
  const r = await runSeoPipeline({
    cwd,
    task:
      "Using the live search and page excerpts in your context, write 2 short paragraphs: (1) what this keyword captures for readers, (2) one concrete angle for an article. Cite themes from the sources, not generic AI hype.",
    useTopicBank: true,
    topicSnapshot: topic,
    allowStubFallback: false,
    skipPhase7Fetch: false,
    skipChiefEnrich: true,
  });

  if (r.status !== "approved") {
    console.log("Result:", JSON.stringify(r, null, 2).slice(0, 8000));
    process.exitCode = 1;
    return;
  }

  console.log("--- SEO WORKER OUTPUT (full) ---\n");
  console.log(r.workerOutput);
  console.log("\n--- Manager (first line) ---\n");
  console.log(r.managerOutput.split(/\r?\n/)[0]);
  console.log("\n--- Handoff keyword / topic id ---");
  console.log("  contentWorkflow.keyword:", r.contentWorkflow?.keyword);
  console.log("  contentWorkflow.topic_id:", r.contentWorkflow?.topic_id);
  console.log("  contentWorkflow.subcategory:", r.contentWorkflow?.subcategory);
  console.log("\n--- Cycle log file ---\n  ", r.cycle.cycleFileRelative);
  console.log("\nDone.");
}

void main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
