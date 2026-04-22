/**
 * Runs one approval cycle for Marketing, Publishing, and SEO (stub LLM).
 * From repo root: npm run agentic:all-departments-demo
 */
import { runMarketingPipeline } from "../departments/marketing";
import { runPublishingPipeline } from "../departments/publishing";
import { runSeoPipeline } from "../departments/seo";

async function main() {
  const seo = await runSeoPipeline({
    task:
      "List 3 long-tail keyword ideas for 'check engine light' for a DIY automotive audience.",
    keyword: "check engine light",
  });
  console.log(
    "SEO:",
    seo.status === "approved" ? seo.cycle.cycleFileRelative : JSON.stringify(seo),
  );

  const pub = await runPublishingPipeline({
    task: "One-sentence angle for a blog post about winter tire pressure.",
    keyword: "winter tire pressure",
  });
  console.log(
    "Publishing:",
    pub.status === "approved" ? pub.cycle.cycleFileRelative : JSON.stringify(pub),
  );

  const mkt = await runMarketingPipeline({
    task:
      "Draft 2 short social post hooks promoting that article (no hashtags required).",
    keyword: "winter tire pressure",
  });
  console.log(
    "Marketing:",
    mkt.status === "approved" ? mkt.cycle.cycleFileRelative : JSON.stringify(mkt),
  );
}

void main();
