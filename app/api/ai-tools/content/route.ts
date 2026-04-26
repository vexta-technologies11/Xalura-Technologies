import { runAiToolsGemini } from "@/lib/aiToolsGemini";
import { lengthWordsLabel } from "@/lib/aiToolFormConfig";
import { buildContentPrompt, jsonError, jsonOk } from "@/lib/aiToolsPrompts";

export const runtime = "nodejs";

type Body = {
  request?: string;
  /** Legacy */
  topic?: string;
  contentType?: string;
  tone?: string;
  length?: string;
  keywords?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const base = (body.request ?? body.topic ?? "").trim();
  if (!base) {
    return jsonError("Describe what you need in the main field.", 400);
  }
  const request = body.keywords?.trim() ? `${base}\n\nKeywords: ${body.keywords.trim()}` : base;

  const len = (body.length ?? "800").trim();
  const lengthInstruction = lengthWordsLabel("content", len);

  const prompt = buildContentPrompt({
    request,
    contentType: body.contentType ?? "Blog / article",
    tone: body.tone ?? "Professional",
    lengthInstruction,
  });

  const result = await runAiToolsGemini(prompt);
  if (!result.ok) {
    return jsonError(result.error, 502);
  }
  return jsonOk(result.text);
}
