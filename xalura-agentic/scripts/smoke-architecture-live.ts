/**
 * Live smoke: SerpAPI → topic bank refresh → SEO pipeline (no stub).
 * Repo root: npx tsx --env-file=.env.local xalura-agentic/scripts/smoke-architecture-live.ts
 *
 * Requires: SERPAPI_API_KEY, FIRECRAWL_API_KEY, GEMINI_API_KEY.
 * Prints topic keywords and Manager first lines only (no API keys).
 */
import { runSeoPipeline } from "../departments/seo";
import { refreshTopicBank } from "../lib/contentWorkflow/topicBankRefresh";
import { serpApiSearch } from "../lib/contentWorkflow/serpApiSearch";
import { parseManagerDecision } from "../lib/managerDecision";
import { readTopicBank } from "../lib/contentWorkflow/topicBankStore";

const cwd = process.cwd();

async function main() {
  console.log("=== 1) SerpAPI (same query as topic bank refresh) ===\n");
  const probe = await serpApiSearch(
    "latest artificial intelligence machine learning developer tools news",
    10,
  );
  if (probe.error) {
    console.error("FAIL:", probe.error);
    if (probe.httpStatus != null) console.error("HTTP:", probe.httpStatus);
    if (probe.errorBody?.trim()) {
      console.error("\n--- Full SerpAPI response body ---\n", probe.errorBody);
    }
    process.exitCode = 1;
    return;
  }
  const items = probe.items ?? [];
  console.log(`Returned ${items.length} items (titles only):`);
  const top = items.slice(0, 10);
  for (let i = 0; i < top.length; i++) {
    const it = top[i]!;
    console.log(`  ${i + 1}. ${it.title.slice(0, 120)}`);
    console.log(`     ${it.link}`);
  }

  console.log("\n=== 2) refreshTopicBank (skipAudit=true; Firecrawl + Gemini rank) ===\n");
  const ref = await refreshTopicBank(cwd, { skipAudit: true });
  if (!ref.ok) {
    console.error("FAIL:", ref.error);
    process.exitCode = 1;
    return;
  }
  console.log("OK — topicCount:", ref.topicCount);

  const bank = readTopicBank(cwd);
  console.log("\n=== 3) Ranked topics now on disk (keyword | subcategory | type | score) ===\n");
  if (!bank?.topics?.length) {
    console.error("No topics in bank after refresh.");
    process.exitCode = 1;
    return;
  }
  for (const t of bank.topics.slice(0, 10)) {
    console.log(
      `  ${t.rank}. ${t.keyword} | ${t.subcategory} | ${t.content_type} | score=${t.final_score}`,
    );
  }

  console.log("\n=== 4) Full SEO pipeline (useTopicBank, NO stub) — Worker → Manager → Executive ===\n");
  const seo = await runSeoPipeline({
    cwd,
    task:
      "In 2 short paragraphs, explain why this keyword matters for Xalura Tech readers (technical founders).",
    useTopicBank: true,
    allowStubFallback: false,
    forceTopicBankRefresh: false,
  });

  if (seo.status !== "approved") {
    console.log("Pipeline result:", JSON.stringify(seo, null, 2).slice(0, 4000));
    process.exitCode = 1;
    return;
  }

  const parsed = parseManagerDecision(seo.managerOutput);
  console.log("Manager raw output (first 1200 chars):\n---\n");
  console.log(seo.managerOutput.slice(0, 1200));
  console.log("\n---\nparseManagerDecision:", JSON.stringify(parsed, null, 2));
  console.log("\nExecutive summary (first 600 chars):\n---\n");
  console.log(seo.executiveSummary.slice(0, 600));
  console.log("\n---\nChosen keyword (handoff):", seo.contentWorkflow?.keyword ?? "(none)");
  console.log("Cycle file:", seo.cycle.cycleFileRelative);
}

void main();
