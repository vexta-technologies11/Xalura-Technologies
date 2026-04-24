/** Curated subcategory labels for the public articles library filter. */
export const ARTICLE_SUBCATEGORY_OPTIONS = [
  "AI for Small Business Automation",
  "AI for Content Creation & Marketing",
  "AI for Customer Support & Chatbots",
  "AI for Software Development Productivity",
  "AI for E-commerce Personalization",
  "AI for Workplace Productivity & Task Management",
  "AI for Creative Design",
  "AI for Data Analysis & Insights",
  "AI for Education & Learning Tools",
  "AI for Personal Productivity",
] as const;

export type ArticleSubcategoryOption = (typeof ARTICLE_SUBCATEGORY_OPTIONS)[number];
