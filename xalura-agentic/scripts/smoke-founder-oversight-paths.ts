/**
 * Offline smoke: founder oversight briefing + optional one-line Gemini ping.
 * Repo root: `npm run agentic:smoke-founder-paths`
 * With `.env.local`: `npx tsx --env-file=.env.local xalura-agentic/scripts/smoke-founder-oversight-paths.ts`
 *
 * Requires `xalura-agentic/logs/publishing/cycle-1.md` (from `npm run agentic:dry-run` or full `agentic:verify`).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { readFileUtf8Agentic } from "../lib/agenticDisk";
import { buildFounderOversightBriefing } from "../lib/founderOversightPublish";
import { getAgenticRoot } from "../lib/paths";
import { pingGeminiForHealth } from "../lib/gemini";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const agenticRoot = getAgenticRoot(repoRoot);
const cycleRel = "logs/publishing/cycle-1.md";
const cycleAbs = path.join(agenticRoot, cycleRel);

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

async function main(): Promise<void> {
  if (!fs.existsSync(cycleAbs)) {
    fail(
      `Missing ${path.relative(repoRoot, cycleAbs)} — run \`npm run agentic:dry-run\` first.`,
    );
  }

  const briefing = buildFounderOversightBriefing({
    cwd: repoRoot,
    task: "Smoke: founder oversight paths",
    title: "Smoke article title",
    slug: "smoke-founder-paths",
    articlePath: "/articles/smoke-founder-paths",
    executiveSummary: "Executive summary stub for smoke.",
    workerOutputExcerpt: "# Hello\n\nWorker markdown stub for smoke test.",
    managerAttempts: 1,
    cycleIndex: 1,
    auditTriggered: false,
    cycleFileRelative: cycleRel,
    zernioLine: "Skipped: smoke",
    managerOutput:
      "APPROVED — smoke test manager rationale.\nSecond line for excerpt check.",
    contentVerticalId: "developer-tools-oss",
    contentVerticalLabel: "Developer tools",
  });

  const checks: [string, string][] = [
    ["Publishing Manager", "manager block"],
    ["Executive summary", "exec block"],
    ["Cycle file", "cycle section header"],
    [cycleRel, "cycle path echoed"],
    ["Zernio:", "zernio line"],
    ["Recent event queue", "events section"],
    ["Failed operations", "failed queue section"],
  ];
  for (const [needle, label] of checks) {
    if (!briefing.includes(needle)) {
      fail(`Briefing missing ${label} (expected "${needle}").`);
    }
  }

  const raw = readFileUtf8Agentic(cycleAbs.replace(/\\/g, "/"));
  if (!raw || !briefing.includes(raw.slice(0, 80))) {
    fail("Briefing cycle excerpt does not match cycle file start (path join / read).");
  }

  console.log("OK — buildFounderOversightBriefing:", briefing.length, "chars");

  const ping = await pingGeminiForHealth();
  if (!ping.executed) {
    console.log("Skip — Gemini:", ping.skipped_reason ?? "(not executed)");
  } else if (!ping.ok) {
    fail(
      `Gemini health ping failed: ${ping.error_truncated ?? "unknown"} (model=${ping.model ?? "?"})`,
    );
  } else {
    console.log("OK — Gemini ping", ping.model, `${ping.ms}ms`, ping.reply_preview?.slice(0, 60));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
