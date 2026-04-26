/**
 * Shared structured document for the Xalura report → print/PDF flow.
 * AI returns JSON only; presentation is handled by CSS templates in the app.
 */
export const PDF_TEMPLATE_IDS = [
  "minimal",
  "executive",
  "data_focused",
  "editorial",
  "structured_proposal",
  "invoice",
  "study_notes",
  "guide",
  "client_proposal",
  "technical",
] as const;

export type PdfTemplateId = (typeof PDF_TEMPLATE_IDS)[number];

export type PdfKeyMetric = { label: string; value: string };

export type PdfSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  subsections?: {
    title: string;
    paragraphs?: string[];
    bullets?: string[];
  }[];
};

export type PdfTable = {
  caption?: string;
  headers: string[];
  rows: string[][];
};

export type PdfInvoice = {
  from?: string;
  billTo?: string;
  invoiceId?: string;
  date?: string;
  lines: { description: string; quantity?: string; amount: string }[];
  totals: { subtotal?: string; tax?: string; total: string };
};

export type PdfStep = { title?: string; body: string };
export type PdfCodeSample = { title?: string; code: string; language?: string };

/** Universal payload — templates emphasize different subsets in the UI. */
export type PdfDocument = {
  documentTitle: string;
  subtitle?: string;
  executiveSummary?: string;
  keyMetrics?: PdfKeyMetric[];
  keyNumbersHighlight?: PdfKeyMetric[];
  sections: PdfSection[];
  tables?: PdfTable[];
  invoice?: PdfInvoice;
  steps?: PdfStep[];
  codeSamples?: PdfCodeSample[];
  tableOfContents?: string[];
  closingCta?: string;
};

export function isPdfTemplateId(s: string): s is PdfTemplateId {
  return (PDF_TEMPLATE_IDS as readonly string[]).includes(s);
}
