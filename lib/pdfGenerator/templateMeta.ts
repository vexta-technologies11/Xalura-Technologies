import type { PdfTemplateId } from "./types";

export const PDF_TEMPLATE_LABEL: Record<PdfTemplateId, string> = {
  minimal: "Minimal clean report",
  executive: "Executive report",
  data_focused: "Data-focused report",
  editorial: "Editorial (long-form)",
  structured_proposal: "Structured proposal (internal)",
  invoice: "Invoice",
  study_notes: "Study notes",
  guide: "Guide / instructions",
  client_proposal: "Client proposal",
  technical: "Technical documentation",
};

export function templateLabel(id: PdfTemplateId): string {
  return PDF_TEMPLATE_LABEL[id] ?? id;
}
