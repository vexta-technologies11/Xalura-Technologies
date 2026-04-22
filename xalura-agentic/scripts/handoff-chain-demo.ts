/**
 * SEO (handoff) → Publishing (handoff) → Marketing (handoff) in order.
 * Uses append-only `shared/event-queue.log` (gitignored).
 *
 * npm run agentic:handoff-demo
 */
import {
  runMarketingPipelineWithHandoff,
  runPublishingPipelineWithHandoff,
  runSeoPipelineWithHandoff,
} from "../lib/handoff";

async function main() {
  const seo = await runSeoPipelineWithHandoff({
    task: "Propose one primary keyword cluster for 'brake pad replacement DIY'.",
    keyword: "brake pad replacement",
  });
  console.log("SEO:", seo.status);

  const pub = await runPublishingPipelineWithHandoff({
    task: "Outline 3 sections for an article on brake pad replacement for beginners.",
    keyword: "brake pad replacement",
  });
  console.log(
    "Publishing:",
    pub.status === "waiting" ? `WAITING — ${pub.reason}` : pub.status,
  );

  const mkt = await runMarketingPipelineWithHandoff({
    task: "Two tweet-length hooks for the brake pad article.",
    keyword: "brake pad replacement",
  });
  console.log(
    "Marketing:",
    mkt.status === "waiting" ? `WAITING — ${mkt.reason}` : mkt.status,
  );
}

void main();
