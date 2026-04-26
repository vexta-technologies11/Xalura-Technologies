import { runAiToolsGemini } from "@/lib/aiToolsGemini";
import { buildReportPrompt, jsonError, jsonOk } from "@/lib/aiToolsPrompts";

export const runtime = "nodejs";

type Body = {
  title?: string;
  reportType?: string;
  content?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const title = (body.title ?? "").trim();
  if (!title) {
    return jsonError("Title is required.", 400);
  }
  const content = (body.content ?? "").trim();
  if (!content) {
    return jsonError("Content or notes are required.", 400);
  }

  const prompt = buildReportPrompt({
    title,
    reportType: body.reportType ?? "General business / technical",
    content,
  });

  const result = await runAiToolsGemini(prompt);
  if (!result.ok) {
    return jsonError(result.error, 502);
  }
  return jsonOk(result.text);
}
