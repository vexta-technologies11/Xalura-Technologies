import type { PdfDocument, PdfKeyMetric, PdfSection, PdfTemplateId } from "./types";

const MAX = 20_000;

function clip(s: string, m = MAX): string {
  const t = (s || "").trim();
  return t.length > m ? t.slice(0, m) : t;
}

/** Strip markdown noise (# headings, blockquote junk) and prefer clean prose for PDF. */
export function stripMarkdownNoise(s: string): string {
  return clip(
    s
      .split("\n")
      .map((line) => line.replace(/^#+\s*/, "").replace(/^\s*>\s*/, "").trim())
      .filter(Boolean)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

function cleanStr(s: unknown): string {
  if (typeof s !== "string") return "";
  return stripMarkdownNoise(s);
}

function cleanStrArray(a: unknown): string[] {
  if (!Array.isArray(a)) return [];
  return a.map((x) => cleanStr(x)).filter(Boolean);
}

function cleanMetrics(a: unknown): PdfKeyMetric[] {
  if (!Array.isArray(a)) return [];
  const out: PdfKeyMetric[] = [];
  for (const row of a) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const label = cleanStr(o.label);
    const value = cleanStr(o.value);
    if (label && value) out.push({ label, value });
  }
  return out.slice(0, 32);
}

function cleanSubsections(a: unknown): PdfSection["subsections"] {
  if (!Array.isArray(a)) return undefined;
  const out: NonNullable<PdfSection["subsections"]> = [];
  for (const row of a) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const title = cleanStr(o.title);
    if (!title) continue;
    out.push({
      title,
      paragraphs: cleanStrArray(o.paragraphs),
      bullets: cleanStrArray(o.bullets),
    });
  }
  return out.length ? out : undefined;
}

function cleanSections(a: unknown): PdfSection[] {
  if (!Array.isArray(a)) return [];
  const out: PdfSection[] = [];
  for (const row of a) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const title = cleanStr(o.title) || "Section";
    out.push({
      title,
      paragraphs: cleanStrArray(o.paragraphs),
      bullets: cleanStrArray(o.bullets),
      subsections: cleanSubsections(o.subsections),
    });
  }
  return out;
}

function cleanTables(a: unknown): PdfDocument["tables"] {
  if (!Array.isArray(a)) return undefined;
  const out: NonNullable<PdfDocument["tables"]> = [];
  for (const row of a) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const headers = cleanStrArray(o.headers);
    if (headers.length < 1) continue;
    const rowsIn = Array.isArray(o.rows) ? o.rows : [];
    const rows: string[][] = [];
    for (const r of rowsIn) {
      if (!Array.isArray(r)) continue;
      const line = r.map((c) => cleanStr(c));
      if (line.length) rows.push(line);
    }
    out.push({
      caption: o.caption != null ? cleanStr(o.caption) : undefined,
      headers,
      rows: rows.slice(0, 200),
    });
  }
  return out.length ? out : undefined;
}

function cleanInvoice(a: unknown): PdfDocument["invoice"] {
  if (!a || typeof a !== "object") return undefined;
  const o = a as Record<string, unknown>;
  const linesIn = Array.isArray(o.lines) ? o.lines : [];
  const lines: NonNullable<PdfDocument["invoice"]>["lines"] = [];
  for (const row of linesIn) {
    if (!row || typeof row !== "object") continue;
    const l = row as Record<string, unknown>;
    const description = cleanStr(l.description);
    const amount = cleanStr(l.amount);
    if (!description && !amount) continue;
    lines.push({
      description: description || "Item",
      quantity: l.quantity != null ? cleanStr(l.quantity) : undefined,
      amount: amount || "—",
    });
  }
  const tot = o.totals && typeof o.totals === "object" ? (o.totals as Record<string, unknown>) : {};
  const total = cleanStr(tot.total);
  if (!lines.length && !total) return undefined;
  return {
    from: o.from != null ? cleanStr(o.from) : undefined,
    billTo: o.billTo != null ? cleanStr(o.billTo) : undefined,
    invoiceId: o.invoiceId != null ? cleanStr(o.invoiceId) : undefined,
    date: o.date != null ? cleanStr(o.date) : undefined,
    lines,
    totals: {
      subtotal: tot.subtotal != null ? cleanStr(tot.subtotal) : undefined,
      tax: tot.tax != null ? cleanStr(tot.tax) : undefined,
      total: total || "—",
    },
  };
}

function cleanSteps(a: unknown): PdfDocument["steps"] {
  if (!Array.isArray(a)) return undefined;
  const out: NonNullable<PdfDocument["steps"]> = [];
  for (const row of a) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const body = cleanStr(o.body);
    if (!body) continue;
    out.push({
      title: o.title != null ? cleanStr(o.title) : undefined,
      body,
    });
  }
  return out.length ? out : undefined;
}

function cleanCode(a: unknown): PdfDocument["codeSamples"] {
  if (!Array.isArray(a)) return undefined;
  const out: NonNullable<PdfDocument["codeSamples"]> = [];
  for (const row of a) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const code = typeof o.code === "string" ? o.code : "";
    if (!code.trim()) continue;
    out.push({
      title: o.title != null ? cleanStr(o.title) : undefined,
      code: clip(code, 16_000),
      language: o.language != null ? cleanStr(o.language) : undefined,
    });
  }
  return out.length ? out : undefined;
}

/**
 * Coerce model JSON (possibly partial) into a valid PdfDocument. Never throws.
 */
export function parseAndNormalizeDocument(raw: unknown, fallback: { title: string; request: string }): PdfDocument {
  let o: Record<string, unknown> = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) o = raw as Record<string, unknown>;

  const documentTitle = cleanStr(o.documentTitle) || cleanStr(fallback.title) || "Report";
  const sections = cleanSections(o.sections);
  const merged: PdfDocument = {
    documentTitle,
    subtitle: o.subtitle != null ? cleanStr(o.subtitle) : undefined,
    executiveSummary: o.executiveSummary != null ? cleanStr(o.executiveSummary) : undefined,
    keyMetrics: cleanMetrics(o.keyMetrics),
    keyNumbersHighlight: cleanMetrics(o.keyNumbersHighlight),
    sections: sections.length
      ? sections
      : [
          {
            title: "Summary",
            paragraphs: [clip(stripMarkdownNoise(fallback.request)) || "Add more detail in your notes and generate again."],
            bullets: [],
          },
        ],
    tables: cleanTables(o.tables),
    invoice: cleanInvoice(o.invoice),
    steps: cleanSteps(o.steps),
    codeSamples: cleanCode(o.codeSamples),
    tableOfContents: cleanStrArray(o.tableOfContents).slice(0, 40) || undefined,
    closingCta: o.closingCta != null ? cleanStr(o.closingCta) : undefined,
  };

  return merged;
}

export function extractJsonText(text: string): string {
  const t = (text || "").trim();
  const m = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) return m[1].trim();
  return t;
}

/**
 * Bias which blocks show prominently per template (cosmetic: model may still over-fill).
 */
export function documentHintsForTemplate(id: PdfTemplateId): string {
  const m: Record<PdfTemplateId, string> = {
    minimal:
      "Few sections, calm spacing. Short executiveSummary optional. Prefer bullets for lists, not long prose.",
    executive: "Start with a crisp executiveSummary. Subsections for recommendations if useful.",
    data_focused: "keyMetrics and keyNumbersHighlight are required. Include at least one data tables[] entry.",
    editorial: "Narrative paragraphs; chapter-style section titles. Avoid list-heavy content unless natural.",
    structured_proposal: "Subsections: problem, approach, deliverables, timeline, risks, next step.",
    invoice: "Use invoice object with lines and totals. Minimal sections.",
    study_notes: "Dense bullets in sections; add keyMetrics only if the topic has figures.",
    guide: "Use steps[] as the main body; keep sections for intro and troubleshooting.",
    client_proposal: "Polished sections + closingCta. Optional invoice-style pricing in tables.",
    technical: "codeSamples for snippets; keep paragraphs short. tables for request/response or parameters.",
  };
  return m[id] ?? m.executive;
}
