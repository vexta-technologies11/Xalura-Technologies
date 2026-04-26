import type { PdfDocument } from "./types";

export function documentToPlainText(doc: PdfDocument): string {
  const lines: string[] = [doc.documentTitle, doc.subtitle ?? ""].filter(Boolean);
  if (doc.executiveSummary) {
    lines.push("", "Executive summary", doc.executiveSummary);
  }
  for (const m of doc.keyMetrics ?? []) lines.push(`${m.label}: ${m.value}`);
  for (const m of doc.keyNumbersHighlight ?? []) lines.push(`${m.label} — ${m.value}`);
  if (doc.invoice) {
    const inv = doc.invoice;
    if (inv.from) lines.push("", "From", inv.from);
    if (inv.billTo) lines.push("Bill to", inv.billTo);
    for (const line of inv.lines) {
      lines.push([line.description, line.quantity, line.amount].filter(Boolean).join(" · "));
    }
  }
  for (const s of doc.steps ?? []) {
    if (s.title) lines.push(s.title);
    lines.push(s.body);
  }
  for (const s of doc.sections) {
    lines.push("", s.title);
    for (const p of s.paragraphs ?? []) lines.push(p);
    for (const b of s.bullets ?? []) lines.push(`• ${b}`);
  }
  if (doc.closingCta) lines.push("", doc.closingCta);
  return lines.join("\n").trim();
}
