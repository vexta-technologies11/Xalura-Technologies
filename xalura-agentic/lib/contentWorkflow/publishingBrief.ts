import { readDailyProduction } from "./dailyProductionStore";

/** Prepends the PDF “Publishing Worker Daily Brief” block to the Worker task. */
export function buildPublishingDailyBriefPrefix(cwd: string): string {
  const d = readDailyProduction(cwd);
  return [
    "## Publishing Worker daily brief",
    `Date: ${d.date}`,
    `Articles completed today: ${d.articles.completed} / target ${d.articles.target}`,
    `Article topics covered today:`,
    d.articles.published.length
      ? d.articles.published.map((t) => `- ${t}`).join("\n")
      : "- (none yet)",
    `Course: status **${d.course.status}**, modules ${d.course.modules_complete}/${d.course.modules_total}, topic: ${d.course.topic || "(unset)"}`,
    "",
    "Follow Xalura content workflow quality rules (no em dashes, no filler openers, specific claims).",
    "---",
    "",
  ].join("\n");
}
