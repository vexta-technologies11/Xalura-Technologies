/**
 * Smoke test: topic bank consume with stub fallback (no Google keys required).
 * From repo root: npx tsx xalura-agentic/scripts/content-workflow-demo.ts
 * With APIs: npx tsx --env-file=.env.local xalura-agentic/scripts/content-workflow-demo.ts
 */
import { runSeoPipeline } from "../departments/seo";
import { readTopicBank } from "../lib/contentWorkflow/topicBankStore";

async function main() {
  const r = await runSeoPipeline({
    task: "Summarize why this topic matters for Xalura readers in 2 short paragraphs.",
    useTopicBank: true,
    allowStubFallback: true,
  });
  if (r.status === "blocked") {
    console.log("Blocked:", r.reason);
    process.exitCode = 1;
    return;
  }
  if (r.status !== "approved") {
    console.log(JSON.stringify(r));
    process.exitCode = 1;
    return;
  }
  console.log("OK — keyword:", r.contentWorkflow?.keyword ?? "(manual)");
  console.log("Cycle:", r.cycle.cycleFileRelative);
  const bank = readTopicBank(process.cwd());
  console.log("Bank used_count:", bank?.used_count, "depleted:", bank?.depleted);
}

void main();
