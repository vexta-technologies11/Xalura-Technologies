export const DEPARTMENT_IDS = [
  "marketing",
  "publishing",
  "seo",
  "news",
  "news_preprod",
] as const;

export type DepartmentId = (typeof DEPARTMENT_IDS)[number];

export function isDepartmentId(s: string): s is DepartmentId {
  return (DEPARTMENT_IDS as readonly string[]).includes(s);
}
