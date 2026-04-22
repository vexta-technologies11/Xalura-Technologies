import fs from "fs";
import path from "path";
import { DEPARTMENT_IDS } from "./departments";
import { loadCycleState } from "./cycleStateStore";
import { getAgenticRoot } from "../lib/paths";

/**
 * Chief AI — **stub** (Phase 2): aggregates counters from `data/cycle-state.json`.
 * Phase 7 can replace body with Gemini + real metrics.
 */
export function renderChiefDailyReportMarkdown(cwd: string = process.cwd()): string {
  const state = loadCycleState(cwd);
  const dateIso = new Date().toISOString().slice(0, 10);

  const rows = DEPARTMENT_IDS.map((id) => {
    const d = state.departments[id];
    const label =
      id === "seo" ? "SEO & Audit" : id.charAt(0).toUpperCase() + id.slice(1);
    return `| ${label} | ${d.approvalsInWindow}/10 window | ${d.auditsCompleted} audits | (stub) |`;
  }).join("\n");

  return `# Chief AI Daily Report
**Date:** ${dateIso}
## Department Scores
| Department | Progress | Audits completed | Directive |
|---|---|---|---|
${rows}
## Inefficiencies Detected
- _Stub — Phase 7_

## Strategic Directives Issued
- Marketing: _stub_
- Publishing: _stub_
- SEO & Audit: _stub_
`;
}

export function writeChiefDailyReport(cwd: string = process.cwd()): string {
  const body = renderChiefDailyReportMarkdown(cwd);
  const root = getAgenticRoot(cwd);
  const dir = path.join(root, "reports");
  fs.mkdirSync(dir, { recursive: true });
  const name = `chief-ai-daily-${new Date().toISOString().slice(0, 10)}.md`;
  const rel = path.join("reports", name);
  fs.writeFileSync(path.join(root, rel), body, "utf8");
  return rel.replace(/\\/g, "/");
}
