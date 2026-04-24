/**
 * Local test: one hourly incremental tick (same logic as POST /api/cron/agentic-incremental).
 * npx tsx --env-file=.env.local xalura-agentic/scripts/incremental-hour-once.ts
 */
import { runIncrementalHourlyPublish } from "../lib/incrementalContentCron";

void (async () => {
  const r = await runIncrementalHourlyPublish(process.cwd());
  console.log(JSON.stringify(r, null, 2).slice(0, 12_000));
  if (!r.ok) process.exitCode = 1;
})();
