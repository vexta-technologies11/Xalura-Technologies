/** Shared dropdown options and length labels for public AI tool forms. */

export const TONE_OPTIONS = [
  "Professional",
  "Kind",
  "Direct",
  "Warm",
  "Formal",
  "Polite and casual",
] as const;

export const EMAIL_RECIPIENT_OPTIONS = [
  "Client or customer",
  "Colleague",
  "Manager or executive",
  "External partner",
  "General audience",
] as const;

/** Value sent to API → maps to target word count in the prompt. */
export const EMAIL_LENGTH_OPTIONS = [
  { value: "50", label: "Short — about 50 words" },
  { value: "100", label: "Standard — about 100 words" },
  { value: "1000", label: "Long — up to 1,000 words" },
] as const;

export const CONTENT_TYPE_OPTIONS = [
  "Blog / article",
  "Landing page",
  "Product or feature page",
  "Social or newsletter",
  "Documentation or help",
] as const;

export const CONTENT_LENGTH_OPTIONS = [
  { value: "400", label: "Short — about 400 words" },
  { value: "800", label: "Medium — about 800 words" },
  { value: "1500", label: "Long — up to 1,500 words" },
] as const;

import { REPORT_AUTO_PICK_VALUE } from "@/lib/pdfGenerator/selectTemplate";

export const REPORT_TYPE_OPTIONS = [
  REPORT_AUTO_PICK_VALUE,
  "Status or quick brief (minimal)",
  "Executive / strategic summary",
  "Data, KPIs, and tables",
  "Long-form article or essay",
  "Internal business proposal",
  "Client proposal",
  "Invoice or billing",
  "Study or learning notes",
  "Step-by-step guide or manual",
  "Technical documentation (code)",
] as const;

export const REPORT_LENGTH_OPTIONS = [...CONTENT_LENGTH_OPTIONS] as const;

export function lengthWordsLabel(kind: "email" | "content" | "report", value: string): string {
  if (kind === "email") {
    if (value === "50") return "Target about 50 words. Stay concise.";
    if (value === "100") return "Target about 100 words.";
    return "Up to 1,000 words; use full structure if needed.";
  }
  if (value === "400") return "Target about 400 words total.";
  if (value === "800") return "Target about 800 words total.";
  return "Target up to 1,500 words; use full sections and detail as appropriate.";
}
