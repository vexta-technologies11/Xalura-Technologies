import { runChiefAI } from "../agents/chiefAI";
import { appendFileUtf8Agentic, mkdirRecursiveAgentic } from "./agenticDisk";
import { getCycleSnapshot } from "../engine/cycleEngine";
import { readEvents } from "./eventQueue";
import { readSeoTrendLogs } from "./contentWorkflow/seoTrendLogsStore";
import { chiefSweepLogPath } from "./contentWorkflow/paths";
import path from "path";

function summarizeCycleState(cwd: string): string {
  const s = getCycleSnapshot(cwd);
  const lines: string[] = ["Department windows (approvals in current 1–10):"];
  for (const id of ["marketing", "publishing", "seo"] as const) {
    const d = s.departments[id];
    lines.push(`- ${id}: ${d.approvalsInWindow}/10, audits_completed=${d.auditsCompleted}`);
  }
  const lanes = s.agentLanes ?? {};
  const keys = Object.keys(lanes);
  if (keys.length) {
    lines.push("Per-vertical agent lanes:");
    for (const k of keys.slice(0, 30)) {
      const d = lanes[k]!;
      lines.push(`- ${k}: ${d.approvalsInWindow}/10, audits=${d.auditsCompleted}`);
    }
    if (keys.length > 30) lines.push(`- … +${keys.length - 30} more lanes`);
  }
  return lines.join("\n");
}

/**
 * Lightweight Chief oversight pass for 24/7 cron — reads cycle + trend snapshot, no Serp.
 */
export async function runChiefSweepCron(
  cwd: string = process.cwd(),
): Promise<{ ok: true; markdown: string } | { ok: false; error: string }> {
  const trends = readSeoTrendLogs(cwd);
  const trendLine =
    trends.entries.length > 0
      ? `Latest trend log: ${trends.topic_count} rows, updated ${trends.updated_at}. Top keyword: ${trends.entries[0]?.keyword ?? "—"}.`
      : "No seo-trend-logs.json yet.";

  const events = readEvents(cwd).slice(-12);
  const evSummary = events
    .map((e) => `- ${e.ts} ${e.type}`)
    .join("\n");

  const digest = [
    "## Automated snapshot (do not invent metrics)",
    summarizeCycleState(cwd),
    "",
    trendLine,
    "",
    "## Recent queue tail",
    evSummary || "(no events)",
  ].join("\n");

  try {
    const chiefMd = await runChiefAI({
      department: "All",
      task: `You are Chief AI for Xalura Tech (scheduled 10-minute oversight).

Read the factual snapshot below. Respond in **markdown** with:
## Health (1 sentence)
## Risks (bullets, max 5)
## Orders (max 3 concrete directives for Executives — no secrets, no API keys)

Snapshot:
---
${digest.slice(0, 14_000)}`,
      context: { mode: "chief_cron_sweep" },
    });

    const logPath = chiefSweepLogPath(cwd);
    mkdirRecursiveAgentic(path.dirname(logPath));
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      preview: chiefMd.replace(/\s+/g, " ").slice(0, 400),
    });
    appendFileUtf8Agentic(logPath, `${line}\n`);

    return { ok: true, markdown: chiefMd };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
