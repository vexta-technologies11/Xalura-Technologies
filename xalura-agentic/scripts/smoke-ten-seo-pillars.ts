/**
 * Runs SEO once per public subcategory (10 pillars) with synthetic topicSnapshot rows.
 * Stub LLM when GEMINI_API_KEY is unset — Manager approves with APPROVED.
 *
 * From repo root: npx tsx xalura-agentic/scripts/smoke-ten-seo-pillars.ts
 */
import fs from "fs";
import path from "path";
import { ARTICLE_SUBCATEGORY_OPTIONS } from "@/lib/articleSubcategories";
import { agentLaneIdForArticleSubcategory } from "@/lib/articleSubcategoryAgentLanes";
import { runSeoPipeline } from "../departments/seo";
import { loadCycleState } from "../engine/cycleStateStore";
import { getAgenticRoot } from "../lib/paths";
import { defaultVerticalId, getVerticalById } from "../lib/contentWorkflow/contentVerticals";
import { newTopicId } from "../lib/contentWorkflow/topicBankStore";
import type { TopicBankEntry } from "../lib/contentWorkflow/types";

function makeTopic(subcategory: string, idx: number): TopicBankEntry {
  const vid = defaultVerticalId();
  const v = getVerticalById(vid)!;
  return {
    id: newTopicId(),
    rank: idx + 1,
    vertical_id: vid,
    vertical_label: v.label,
    angle: "Smoke test",
    keyword: `smoke-test pillar ${idx + 1}`.slice(0, 64),
    subcategory,
    content_type: "article",
    final_score: 90,
    supporting_keywords: ["smoke"],
    source_urls: ["https://example.com/xalura-smoke"],
    status: "unused",
    used_at: null,
  };
}

function firstLine(s: string): string {
  return s.trim().split(/\r?\n/)[0]?.trim() ?? "";
}

async function main() {
  const cwd = process.cwd();
  const root = getAgenticRoot(cwd);
  const report: string[] = [];
  const results: {
    subcategory: string;
    lane: string;
    status: string;
    managerFirstLine: string;
    cycleRel?: string;
    cycleIndex?: number;
    workerExcerpt: string;
  }[] = [];
  /** What each run fed the pipeline (matches cycle log Input / Task for topic-bank fields). */
  const received: {
    subcategory: string;
    lane: string;
    topic: TopicBankEntry;
    cycleRel?: string;
  }[] = [];

  report.push("=== Smoke: 10 SEO pillar workers (synthetic topic per subcategory) ===\n");
  report.push(
    `cwd=${cwd} | stub=${!process.env["GEMINI_API_KEY"]?.trim() ? "yes (Manager APPROVED)" : "no (live Gemini)"}\n`,
  );
  report.push(
    "Each run: Worker → Manager (strict off) → Executive → recordApproval once → cycle log for that SEO lane (sc-…).\n",
  );
  report.push("The 10-approval window toward Chief is per lane over time; one run = one increment.\n\n");

  for (let i = 0; i < ARTICLE_SUBCATEGORY_OPTIONS.length; i++) {
    const sub = ARTICLE_SUBCATEGORY_OPTIONS[i]!;
    const topic = makeTopic(sub, i);
    const lane = agentLaneIdForArticleSubcategory(sub) ?? "(none)";

    const r = await runSeoPipeline({
      cwd,
      task: `In 2 short sentences, state why this keyword is relevant to the ${sub} pillar for Xalura readers.`,
      useTopicBank: true,
      topicSnapshot: topic,
      allowStubFallback: true,
      skipChiefEnrich: true,
      /** Fast smoke: no SerpAPI/Firecrawl per pillar (set false + keys to test live research). */
      skipPhase7Fetch: true,
    });

    if (r.status === "approved") {
      const mf = firstLine(r.managerOutput);
      received.push({
        subcategory: sub,
        lane,
        topic: { ...topic },
        cycleRel: r.cycle.cycleFileRelative,
      });
      results.push({
        subcategory: sub,
        lane,
        status: r.status,
        managerFirstLine: mf,
        cycleRel: r.cycle.cycleFileRelative,
        cycleIndex: r.cycle.cycleIndex,
        workerExcerpt: r.workerOutput.slice(0, 4000),
      });
      report.push(`--- ${i + 1}/10: ${sub} ---`);
      report.push(`  lane: ${lane} | topic id: ${topic.id} | keyword: ${topic.keyword}`);
      report.push(`  result: ${r.status} | manager 1st line: ${mf}`);
      report.push(`  cycle: ${r.cycle.cycleFileRelative} (index ${r.cycle.cycleIndex})`);
      report.push(
        `  manager attempts: ${r.managerAttempts}\n  --- SEO WORKER OUTPUT ---\n${r.workerOutput}\n  --- end worker ---\n`,
      );
    } else {
      const reason = r.status === "blocked" ? r.reason : JSON.stringify(r).slice(0, 800);
      received.push({ subcategory: sub, lane, topic: { ...topic } });
      results.push({
        subcategory: sub,
        lane,
        status: r.status,
        managerFirstLine: "—",
        workerExcerpt: "—",
      });
      report.push(`--- ${i + 1}/10: ${sub} --- FAIL: ${reason}\n`);
    }
  }

  const keywordsAndTopics = [
    "=== KEYWORDS & TOPIC ROW (what each SEO run received) ===",
    "Cycle files store the same: Input → `Keyword:` = primary keyword; Task body = full topic (id, subcategory, supporting, URLs).",
    "",
    ...received.map((row, j) => {
      const t = row.topic;
      return [
        `${j + 1}. ${row.subcategory}`,
        `   agent lane: ${row.lane}`,
        `   topic_id: ${t.id}`,
        `   primary keyword: ${t.keyword}`,
        `   supporting_keywords: ${t.supporting_keywords.join(", ")}`,
        `   subcategory: ${t.subcategory}`,
        `   vertical_id: ${t.vertical_id} (${t.vertical_label ?? ""})`,
        `   source_urls: ${t.source_urls.join(" | ")}`,
        `   content_type: ${t.content_type}  final_score: ${t.final_score}`,
        `   cycle_log: ${row.cycleRel ?? "(none — run did not record approval)"}`,
        "",
      ].join("\n");
    }),
  ].join("\n");

  report.unshift(keywordsAndTopics, "\n");

  const state = loadCycleState(cwd);
  report.push("\n=== cycle-state.json agentLanes (seo) ===\n");
  for (const [k, v] of Object.entries(state.agentLanes ?? {})) {
    if (k.startsWith("seo:")) {
      report.push(`  ${k}: approvalsInWindow=${v.approvalsInWindow} auditsCompleted=${v.auditsCompleted}`);
    }
  }
  report.push("");

  report.push("=== sample on-disk cycle files (last written path per run) ===\n");
  for (const x of results) {
    if (x.cycleRel) {
      const abs = path.join(getAgenticRoot(cwd), x.cycleRel);
      if (fs.existsSync(abs)) {
        const body = fs.readFileSync(abs, "utf8");
        report.push(
          `FILE ${x.cycleRel} (${body.length} chars) — first 600 chars:\n${body.slice(0, 600)}…\n`,
        );
      } else {
        report.push(`FILE missing: ${abs}\n`);
      }
    }
  }

  const out = report.join("\n");
  console.log(out);
  const outPath = path.join(root, "state", "smoke-ten-seo-pillars-report.txt");
  const jsonPath = path.join(root, "state", "smoke-ten-seo-pillars-keywords-topics.json");
  try {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, out, "utf8");
    const jsonPayload = received.map((r) => ({
      subcategory: r.subcategory,
      agent_lane: r.lane,
      topic_id: r.topic.id,
      primary_keyword: r.topic.keyword,
      supporting_keywords: r.topic.supporting_keywords,
      subcategory_field: r.topic.subcategory,
      vertical_id: r.topic.vertical_id,
      vertical_label: r.topic.vertical_label,
      source_urls: r.topic.source_urls,
      content_type: r.topic.content_type,
      final_score: r.topic.final_score,
      cycle_log_relative: r.cycleRel ?? null,
    }));
    fs.writeFileSync(jsonPath, JSON.stringify(jsonPayload, null, 2), "utf8");
    console.log(`\nWrote: ${outPath}`);
    console.log(`Wrote: ${jsonPath}`);
  } catch {
    // ignore
  }
}

void main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
