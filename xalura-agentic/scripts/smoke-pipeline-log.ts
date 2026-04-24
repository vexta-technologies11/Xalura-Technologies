/**
 * Verifies Supabase `agentic_pipeline_stage_log` insert + read (service role).
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in env;
 * table from `supabase/schema.sql`; AGENTIC_PIPELINE_LOG_DISABLE not "true".
 *
 *   npx tsx --env-file=.env.local xalura-agentic/scripts/smoke-pipeline-log.ts
 */
import {
  fetchRecentAgenticPipelineLogs,
  fireAgenticPipelineLog,
} from "../../lib/agenticPipelineLogSupabase";
import { createServiceClient, readEnvSync } from "../../lib/supabase/service";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

void (async () => {
  const disable = readEnvSync("AGENTIC_PIPELINE_LOG_DISABLE")?.toLowerCase() === "true";
  const svc = createServiceClient();

  console.log("AGENTIC_PIPELINE_LOG_DISABLE:", disable || false);
  console.log("Service client OK:", Boolean(svc));
  if (disable) {
    console.error("FAIL: logging disabled; set AGENTIC_PIPELINE_LOG_DISABLE=false or unset.");
    process.exitCode = 1;
    return;
  }
  if (!svc) {
    console.error("FAIL: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exitCode = 1;
    return;
  }

  const marker = `smoke-${Date.now()}`;
  fireAgenticPipelineLog({
    department: "smoke",
    stage: "verify",
    event: "smoke_test",
    summary: `Pipeline log smoke ${marker}`,
    detail: { marker, source: "smoke-pipeline-log.ts" },
  });

  // Allow async insert to complete
  await sleep(800);

  const rows = await fetchRecentAgenticPipelineLogs(20);
  const hit = rows.find((r) => r.summary.includes(marker));
  if (hit) {
    console.log("OK: insert round-trip visible in fetch.");
    console.log(
      JSON.stringify(
        { created_at: hit.created_at, department: hit.department, stage: hit.stage, event: hit.event, summary: hit.summary },
        null,
        2,
      ),
    );
    process.exitCode = 0;
    return;
  }

  console.error("FAIL: expected row with marker not found in last 20 rows.");
  console.error("Recent summaries:", rows.map((r) => r.summary.slice(0, 80)));
  process.exitCode = 1;
})();
