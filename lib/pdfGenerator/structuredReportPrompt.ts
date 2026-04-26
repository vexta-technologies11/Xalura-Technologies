import type { PdfTemplateId } from "./types";
import { documentHintsForTemplate } from "./parseAndNormalizeDocument";
import { templateLabel } from "./templateMeta";

const MAX = 8_000;

function clip(s: string, max: number = MAX): string {
  const t = (s || "").trim();
  return t.length > max ? t.slice(0, max) : t;
}

const JSON_SHAPE = `Return a single JSON object (no surrounding prose) with this shape. Use only plain strings: no markdown, no # hash headings, no --- rules, no blockquotes. For lists use the "bullets" string arrays, not text lines starting with # or *.
{
  "documentTitle": "string (required)",
  "subtitle": "string or omit",
  "executiveSummary": "string or omit",
  "keyMetrics": [ { "label": "string", "value": "string" } ],
  "keyNumbersHighlight": [ { "label": "string", "value": "string" } ],
  "sections": [
    {
      "title": "string",
      "paragraphs": [ "string" ],
      "bullets": [ "string" ],
      "subsections": [ { "title": "string", "paragraphs": [ "string" ], "bullets": [ "string" ] } ]
    }
  ],
  "tables": [ { "caption": "string or omit", "headers": [ "string" ], "rows": [ [ "string" ] ] } ],
  "invoice": {
    "from": "string", "billTo": "string", "invoiceId": "string", "date": "string",
    "lines": [ { "description": "string", "quantity": "string or omit", "amount": "string" } ],
    "totals": { "subtotal": "string or omit", "tax": "string or omit", "total": "string" }
  },
  "steps": [ { "title": "string or omit", "body": "string" } ],
  "codeSamples": [ { "title": "string or omit", "code": "string", "language": "string or omit" } ],
  "tableOfContents": [ "string" ],
  "closingCta": "string or omit"
}
Always include "documentTitle" and a non-empty "sections" array unless the layout is almost entirely "invoice" or "steps" for that template.`;

/**
 * System prompt for Gemini JSON mode. Template id drives emphasis; AI must not add markdown # noise.
 */
export function buildStructuredReportPrompt(input: {
  title: string;
  reportType: string;
  tone: string;
  request: string;
  lengthInstruction: string;
  templateId: PdfTemplateId;
}): string {
  const hint = documentHintsForTemplate(input.templateId);
  const tlabel = templateLabel(input.templateId);

  return `You are a professional report composer. The user will print this document or save as PDF from a styled template. Content is data-only: your job is accurate structure and clear wording — never decorative symbols.

Selected PDF template: "${input.templateId}" (${tlabel}).
Form fields (context): report style choice = ${clip(input.reportType, 200)}; user title hint = ${clip(input.title, 200)}; tone = ${clip(input.tone, 200)}; length: ${clip(input.lengthInstruction, 500)}.

Template focus:
${clip(hint, 1_200)}

Hard rules:
- Output MUST be valid JSON only (per schema below). No markdown document, no code fences, no # headings.
- Never start any string with "#" or use markdown heading syntax. Section titles go only in JSON "title" fields.
- Use bullet string arrays for lists. Write numbers and labels in plain text.
- Do not add irrelevant Unicode ornaments (e.g. decorative arrows, double-box signs). Stay professional and minimal.
- If uncertain about facts, phrase conservatively. No Mochi branding.

Source material to synthesize:
${clip(input.request)}

${JSON_SHAPE}`;
}
