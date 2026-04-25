/**
 * Smoke: Serp Google News pool + 30-item checklist (no Gemini).
 * Full pipeline: `NEWS_SMOKE_FULL=1` (needs GEMINI, long, uses credits).
 *
 *   npx tsx xalura-agentic/scripts/smoke-news.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  fetchAiNewsChecklist30,
  gatherPreprodNewsPool,
} from "../lib/news/serpGoogleNews";

function applyEnvFile(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) continue;
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (k) process.env[k] = v;
  }
}

applyEnvFile(join(process.cwd(), ".env.local"));

void (async () => {
  const tz = process.env["NEWS_SERP_TIMEZONE"]?.trim() || "UTC";
  const min = Math.max(5, parseInt(process.env["NEWS_PREPROD_MIN"] || "20", 10) || 20);

  if (process.env["NEWS_SMOKE_FULL"] === "1") {
    const { runNewsPipeline } = await import("../lib/news/runNewsPipeline");
    const r = await runNewsPipeline({
      publishToSite: false,
      withImage: false,
    });
    console.log("FULL:", r);
    process.exit(r.status === "published" ? 0 : 1);
    return;
  }

  console.log("=== Preprod pool (same-day) ===\n");
  const pool = await gatherPreprodNewsPool({ minCount: min, timeZone: tz });
  if (!pool.ok) {
    console.error("FAIL", pool.error);
    process.exit(1);
  }
  console.log("OK items:", pool.items.length, "\n");

  console.log("=== 30-item AI checklist ===\n");
  const ch = await fetchAiNewsChecklist30();
  if (!ch.ok) {
    console.error("FAIL", ch.error);
    process.exit(1);
  }
  console.log("OK checklist:", ch.items.length);
  process.exit(0);
})();
