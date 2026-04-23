/**
 * SEO pipeline without topic bank — captures live Manager + parse (needs GEMINI_API_KEY).
 * npx tsx --env-file=.env.local xalura-agentic/scripts/smoke-manager-seo.ts
 */
import { runSeoPipeline } from "../departments/seo";
import { parseManagerDecision } from "../lib/managerDecision";

void (async () => {
  const r = await runSeoPipeline({
    task:
      "List 3 bullet points on why TypeScript strict mode helps startups. Under 120 words.",
    keyword: "typescript strict mode",
  });
  console.log("status:", r.status);
  if (r.status === "approved") {
    console.log("\n--- Manager output (full) ---\n");
    console.log(r.managerOutput);
    console.log("\n--- parseManagerDecision ---\n");
    console.log(JSON.stringify(parseManagerDecision(r.managerOutput), null, 2));
    console.log("\n--- Executive (first 500 chars) ---\n");
    console.log(r.executiveSummary.slice(0, 500));
  } else {
    console.log(JSON.stringify(r, null, 2).slice(0, 3000));
    process.exitCode = 1;
  }
})();
