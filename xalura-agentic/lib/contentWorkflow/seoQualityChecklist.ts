/**
 * Standard 10-point contract after SEO approval, passed to Publishing and Chief context.
 * Grounded in the SEO handoff (keyword, theme, sources) — informational tech only.
 */
export function buildSeoQualityChecklist(input: {
  primary_keyword: string;
  subcategory: string;
  theme_label: string;
  source_urls: string[];
  /** Approved SEO Worker output (used for handoff body elsewhere; optional echo). */
  seo_worker_excerpt: string;
}): string[] {
  const sourceNote =
    input.source_urls?.length > 0
      ? `Ground claims in: ${input.source_urls.slice(0, 5).join(", ")}.`
      : "Do not invent statistics or sources not implied by the SEO package.";

  return [
    `Primary keyword **${input.primary_keyword}** is central in the H1 title, lede, and body (not replaced by a generic theme).`,
    "Content satisfies **search intent** for this keyword in an **AI / technology** context (concrete, reader-relevant).",
    `No topic drift: stay in subcategory **${input.subcategory}** and theme **${input.theme_label}** as fixed by SEO.`,
    "Specific and non-generic: concrete detail, tradeoffs, or examples — not a shallow encyclopedia summary.",
    "Includes at least one **real-world** application, scenario, or industry touchpoint (no fabricated data).",
    "Strong structure: logical flow, scannable headings, sections that build on each other.",
    "No filler openers, empty transitions, or repetitive phrasing; every paragraph adds value.",
    "Human, expert tone: authoritative and clear; avoid bland “AI can help” template voice.",
    `No medical, legal, tax, or personalized investment advice; **informational and product-appropriate** only. ${sourceNote}`,
    "High readability: varied sentence length, crisp paragraphs, engaging but not hyped.",
  ];
}
