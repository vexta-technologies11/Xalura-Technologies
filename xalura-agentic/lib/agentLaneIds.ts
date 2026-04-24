import { isArticleSubcategoryAgentLaneId } from "@/lib/articleSubcategoryAgentLanes";
import { isValidVerticalId } from "./contentWorkflow/contentVerticals";

/**
 * Lane directory names and `cycle-state` keys: **content pillar** (`sc-…`, 10 public
 * subcategories), catalog `vertical_id` (legacy), or topic bank id (`tp-…`).
 */
const TOPIC_OR_FALLBACK_RE = /^[a-z0-9._-]{1,128}$/i;

export function isValidAgentLaneId(id: string): boolean {
  const t = id.trim();
  if (!t) return false;
  if (isArticleSubcategoryAgentLaneId(t)) return true;
  if (isValidVerticalId(t)) return true;
  return TOPIC_OR_FALLBACK_RE.test(t);
}
