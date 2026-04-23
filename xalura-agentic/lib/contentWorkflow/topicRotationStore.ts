import type { TopicRotationFile } from "./types";
import { readJsonFile, writeJsonFile } from "./jsonStore";
import { topicRotationPath } from "./paths";

const DEFAULT_ROTATION: TopicRotationFile = {
  last_5_subcategories: [],
  cooldown_topics: [],
};

export function readTopicRotation(cwd: string): TopicRotationFile {
  return readJsonFile(topicRotationPath(cwd), DEFAULT_ROTATION);
}

export function writeTopicRotation(cwd: string, data: TopicRotationFile): void {
  writeJsonFile(topicRotationPath(cwd), data);
}

/** Push subcategory into rolling last-5 list (Publishing / SEO on approve). */
export function recordSubcategoryUsed(cwd: string, subcategory: string): void {
  const s = subcategory.trim().toLowerCase();
  if (!s) return;
  const rot = readTopicRotation(cwd);
  const next = [s, ...rot.last_5_subcategories.filter((x) => x !== s)].slice(0, 5);
  writeTopicRotation(cwd, { ...rot, last_5_subcategories: next });
}

/** Extend cooldowns for underperforming subcategories (from bank audit). */
export function extendCooldownForSubcategories(
  cwd: string,
  subcategories: string[],
  cooldownDays: number = 14,
): void {
  if (!subcategories.length) return;
  const rot = readTopicRotation(cwd);
  const today = new Date().toISOString().slice(0, 10);
  const extra = subcategories.map((topic) => ({
    topic: topic.trim(),
    published_at: today,
    cooldown_days: cooldownDays,
  }));
  const merged = [...rot.cooldown_topics];
  for (const e of extra) {
    if (!e.topic) continue;
    merged.push(e);
  }
  writeTopicRotation(cwd, { ...rot, cooldown_topics: merged.slice(-80) });
}
