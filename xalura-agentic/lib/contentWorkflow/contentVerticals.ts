/**
 * Content verticals — AI/tech lenses for SEO + Publishing workers (one lane per run).
 * Each SEO refresh ranks topics across **all** verticals (single Serp + Gemini).
 */

export type ContentVertical = {
  id: string;
  label: string;
  exampleAngles: string;
  /** When true, keep copy product/tooling-focused; avoid medical/legal advice claims. */
  regulated: boolean;
};

export const CONTENT_VERTICALS: ContentVertical[] = [
  {
    id: "business-startups",
    label: "Business & startups",
    exampleAngles: "AI pricing, GTM stack, SMB automation",
    regulated: false,
  },
  {
    id: "product-engineering",
    label: "Product & engineering",
    exampleAngles: "Spec-to-code, evals, shipping AI features",
    regulated: false,
  },
  {
    id: "developer-tools-oss",
    label: "Developer tools & OSS",
    exampleAngles: "SDKs, agents in CI, local models",
    regulated: false,
  },
  {
    id: "cloud-infrastructure",
    label: "Cloud & infrastructure",
    exampleAngles: "Inference cost, regions, GPU/CPU tradeoffs",
    regulated: false,
  },
  {
    id: "security-trust",
    label: "Security & trust",
    exampleAngles: "Red team for LLMs, data leakage, supply chain",
    regulated: false,
  },
  {
    id: "data-mlops",
    label: "Data & MLOps",
    exampleAngles: "Pipelines, observability, RAG hygiene",
    regulated: false,
  },
  {
    id: "education-skills",
    label: "Education & skills",
    exampleAngles: "Curricula, certifications, practitioner paths",
    regulated: false,
  },
  {
    id: "marketing-growth-tech",
    label: "Marketing & growth tech",
    exampleAngles: "SEO + AI, attribution, content ops",
    regulated: false,
  },
  {
    id: "entertainment-media-tech",
    label: "Entertainment & media tech",
    exampleAngles: "Streaming infra, tooling, rights tech (not gossip)",
    regulated: false,
  },
  {
    id: "environment-climate-tech",
    label: "Environment & climate tech",
    exampleAngles: "Energy use of training/inference, green DC angle",
    regulated: false,
  },
  {
    id: "workplace-hr-tech",
    label: "Workplace & HR tech",
    exampleAngles: "Copilots at work, bias/process (careful tone)",
    regulated: false,
  },
  {
    id: "healthcare-bioinformatics",
    label: "Healthcare / bioinformatics",
    exampleAngles: "Optional lane — tooling & research infra; no clinical claims",
    regulated: true,
  },
  {
    id: "legal-compliance-tooling",
    label: "Legal / compliance tooling",
    exampleAngles: "Product-focused compliance tech; not legal advice",
    regulated: true,
  },
  {
    id: "gov-civic-tech",
    label: "Gov / civic tech",
    exampleAngles: "Procurement, public-sector AI adoption",
    regulated: false,
  },
];

const BY_ID = new Map(CONTENT_VERTICALS.map((v) => [v.id, v]));

export function isValidVerticalId(id: string): boolean {
  return BY_ID.has(id);
}

export function getVerticalById(id: string): ContentVertical | undefined {
  return BY_ID.get(id);
}

export function verticalCatalogForPrompt(): string {
  return CONTENT_VERTICALS.map(
    (v) =>
      `- \`${v.id}\` — ${v.label}. Angles: ${v.exampleAngles}.${v.regulated ? " **Regulated lane:** stay product/research; no professional advice.**" : ""}`,
  ).join("\n");
}

export function defaultVerticalId(): string {
  return CONTENT_VERTICALS[0]!.id;
}
