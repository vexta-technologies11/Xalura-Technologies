import {
  ARTICLE_SUBCATEGORY_OPTIONS,
  type ArticleSubcategoryOption,
} from "./articleSubcategories";
import { isArticleSubcategoryLabel } from "./articleSubcategoryGate";

/**
 * Stable filesystem-safe ids for the 10 public library subcategories. SEO and Publishing
 * share the same id for a pillar so they form one agent pair (independent of other pillars).
 */
export const ARTICLE_SUBCATEGORY_TO_AGENT_LANE_ID: Record<
  ArticleSubcategoryOption,
  string
> = {
  "AI for Small Business Automation": "sc-smb-automation",
  "AI for Content Creation & Marketing": "sc-content-marketing",
  "AI for Customer Support & Chatbots": "sc-support-chatbots",
  "AI for Software Development Productivity": "sc-dev-productivity",
  "AI for E-commerce Personalization": "sc-ecommerce-personalization",
  "AI for Workplace Productivity & Task Management": "sc-workplace-productivity",
  "AI for Creative Design": "sc-creative-design",
  "AI for Data Analysis & Insights": "sc-data-insights",
  "AI for Education & Learning Tools": "sc-education-learning",
  "AI for Personal Productivity": "sc-personal-productivity",
};

const LANE_ID_SET = new Set<string>(Object.values(ARTICLE_SUBCATEGORY_TO_AGENT_LANE_ID));

const LANE_ID_TO_LABEL = new Map<string, string>(
  (Object.keys(ARTICLE_SUBCATEGORY_TO_AGENT_LANE_ID) as ArticleSubcategoryOption[]).map(
    (label) => [ARTICLE_SUBCATEGORY_TO_AGENT_LANE_ID[label]!, label],
  ),
);

/** @returns Short lane id (e.g. `sc-smb-automation`) when `s` is exactly one of the 10 public labels. */
export function agentLaneIdForArticleSubcategory(
  s: string | undefined | null,
): string | undefined {
  if (!s?.trim() || !isArticleSubcategoryLabel(s)) return undefined;
  return ARTICLE_SUBCATEGORY_TO_AGENT_LANE_ID[s.trim() as ArticleSubcategoryOption];
}

/** @returns Public pillar title for a lane id, or `undefined` if not one of the 10. */
export function articleSubcategoryTitleForAgentLaneId(
  laneId: string | undefined | null,
): string | undefined {
  const t = laneId?.trim();
  if (!t) return undefined;
  return LANE_ID_TO_LABEL.get(t);
}

export function isArticleSubcategoryAgentLaneId(id: string): boolean {
  return LANE_ID_SET.has(id.trim());
}

export const ARTICLE_SUBCATEGORY_AGENT_LANE_ID_LIST: readonly string[] = [
  ...ARTICLE_SUBCATEGORY_OPTIONS.map((l) => ARTICLE_SUBCATEGORY_TO_AGENT_LANE_ID[l]),
];
