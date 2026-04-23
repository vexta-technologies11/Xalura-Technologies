import type { DailyProductionFile } from "./types";
import { readJsonFile, writeJsonFile } from "./jsonStore";
import { dailyProductionPath } from "./paths";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultFile(date: string): DailyProductionFile {
  return {
    date,
    articles: {
      target: 5,
      completed: 0,
      in_progress: 0,
      published: [],
      failed: [],
    },
    course: {
      target: 1,
      status: "pending",
      modules_complete: 0,
      modules_total: 5,
      topic: "",
      published_at: null,
    },
  };
}

export function readDailyProduction(cwd: string): DailyProductionFile {
  const d = todayUtc();
  const p = dailyProductionPath(cwd);
  const cur = readJsonFile<DailyProductionFile>(p, defaultFile(d));
  if (cur.date !== d) {
    const fresh = defaultFile(d);
    writeJsonFile(p, fresh);
    return fresh;
  }
  return cur;
}

export function bumpArticleCompleted(
  cwd: string,
  topicLabel: string,
): DailyProductionFile {
  const cur = readDailyProduction(cwd);
  cur.articles.completed += 1;
  cur.articles.published.push(topicLabel.slice(0, 200));
  writeJsonFile(dailyProductionPath(cwd), cur);
  return cur;
}
