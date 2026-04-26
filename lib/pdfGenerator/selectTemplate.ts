import type { PdfTemplateId } from "./types";

export const REPORT_AUTO_PICK_VALUE = "Auto (from your notes + style)";

const FROM_UI: Record<string, PdfTemplateId> = {
  "Status or quick brief (minimal)": "minimal",
  "Executive / strategic summary": "executive",
  "Data, KPIs, and tables": "data_focused",
  "Long-form article or essay": "editorial",
  "Internal business proposal": "structured_proposal",
  "Client proposal": "client_proposal",
  "Invoice or billing": "invoice",
  "Study or learning notes": "study_notes",
  "Step-by-step guide or manual": "guide",
  "Technical documentation (code)": "technical",
};

const RULES: Array<{
  id: PdfTemplateId;
  weight: number;
  test: (t: string) => boolean;
}> = [
  {
    id: "invoice",
    weight: 6,
    test: (t) =>
      /\b(invoice|invoic(e|ing)|remit to|line items?|amount due|subtotal|taxable|net\s*30|p\.?o\.?\s*#?)\b/i.test(
        t,
      ),
  },
  {
    id: "data_focused",
    weight: 4,
    test: (t) =>
      /\b(kpi|metric(s)?|yoy|y\/y|dashboard|percent(age)?|qoq|mom|p\.75|csv|pivot|benchmark|series)\b/i.test(
        t,
      ),
  },
  {
    id: "guide",
    weight: 3,
    test: (t) =>
      /\b(step\s*\d|how to|walkthrough|tutorial|manual|click\s+|press\s+|navigate|install(ation)?\s+steps)\b/i.test(
        t,
      ),
  },
  {
    id: "technical",
    weight: 4,
    test: (t) =>
      /\b(api|endpoint|npm|function\s*\(|import\s+from|curl|stack trace|code\s+block|error\s+code|repository)\b/i.test(
        t,
      ),
  },
  {
    id: "editorial",
    weight: 2,
    test: (t) =>
      /\b(essay|chapter|narrative|opinion|editorial|long[ -]form|thousand\s+word)\b/i.test(t),
  },
  {
    id: "client_proposal",
    weight: 2,
    test: (t) => /\b(rfp|sow|scope of work|client[:\s]|our proposal|pricing proposal)\b/i.test(t),
  },
  {
    id: "structured_proposal",
    weight: 2,
    test: (t) =>
      /\b(proposal|recommendation|phased delivery|milestone|deliverables?)\b/i.test(t) &&
      !/\b(sow|rfp)\b/i.test(t),
  },
  {
    id: "study_notes",
    weight: 3,
    test: (t) =>
      /\b(exam|flashcard|definition(s)?|chapter\s+\d|lecture|study guide|glossary|key terms)\b/i.test(t),
  },
  {
    id: "executive",
    weight: 1,
    test: (t) =>
      /\b(executive summary|board|strategic|q[1-4]\s*\d{4}|roadmap|initiative|steerco)\b/i.test(t),
  },
  {
    id: "minimal",
    weight: 1,
    test: (t) => /\b(status|progress|standup|quick update|one[- ]pager)\b/i.test(t),
  },
];

/**
 * Picks a layout template. When `reportType` is the "Auto" value, uses keyword scoring on `request`.
 */
export function selectPdfTemplate(reportType: string, request: string): PdfTemplateId {
  const t = (request || "").toLowerCase();

  if (reportType.trim() === REPORT_AUTO_PICK_VALUE) {
    let best: PdfTemplateId = "executive";
    let bestScore = 0;
    for (const { id, weight, test } of RULES) {
      if (test(t)) {
        if (weight > bestScore) {
          bestScore = weight;
          best = id;
        }
      }
    }
    return best;
  }

  return FROM_UI[reportType.trim()] ?? "executive";
}
