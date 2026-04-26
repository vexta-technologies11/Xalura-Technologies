import { runAiToolsGeminiJson } from "@/lib/aiToolsGemini";
import { lengthWordsLabel } from "@/lib/aiToolFormConfig";
import { jsonError, jsonOkReport } from "@/lib/aiToolsPrompts";
import { parseAndNormalizeDocument, extractJsonText } from "@/lib/pdfGenerator/parseAndNormalizeDocument";
import { buildStructuredReportPrompt } from "@/lib/pdfGenerator/structuredReportPrompt";
import { selectPdfTemplate } from "@/lib/pdfGenerator/selectTemplate";
import { templateLabel } from "@/lib/pdfGenerator/templateMeta";
export const runtime = "nodejs";

type Body = {
  request?: string;
  title?: string;
  reportType?: string;
  content?: string;
  tone?: string;
  length?: string;
};

function firstLine(s: string): string {
  const t = s.trim();
  const line = t.split(/\n/)[0]?.trim() ?? "";
  return line.slice(0, 120) || "Report";
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const request = (body.request ?? body.content ?? "").trim();
  if (!request) {
    return jsonError("Add your notes or outline in the main field.", 400);
  }

  const title = (body.title ?? "").trim() || firstLine(request);
  const len = (body.length ?? "800").trim();
  const lengthInstruction = lengthWordsLabel("report", len);
  const reportType = (body.reportType ?? "").trim() || "Executive / strategic summary";

  const templateId = selectPdfTemplate(reportType, request);

  const prompt = buildStructuredReportPrompt({
    title,
    reportType,
    tone: body.tone ?? "Professional",
    request,
    lengthInstruction,
    templateId,
  });

  const result = await runAiToolsGeminiJson(prompt);
  if (!result.ok) {
    return jsonError(result.error, 502);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonText(result.text));
  } catch {
    return jsonError("The model returned invalid JSON. Try again or shorten your input.", 502);
  }

  const document = parseAndNormalizeDocument(parsed, { title, request });

  return jsonOkReport({
    document,
    templateId,
    templateLabel: templateLabel(templateId),
    documentTitle: document.documentTitle,
  });
}
