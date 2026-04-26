import { runAiToolsGemini } from "@/lib/aiToolsGemini";
import { buildContentPrompt, jsonError, jsonOk } from "@/lib/aiToolsPrompts";

export const runtime = "nodejs";

type Body = {
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

  const topic = (body.topic ?? "").trim();
  if (!topic) {
    return jsonError("Topic is required.", 400);
  }

  const prompt = buildContentPrompt({
    topic,
    contentType: body.contentType ?? "Article / blog",
    tone: body.tone ?? "Professional",
    length: body.length ?? "Medium",
    keywords: body.keywords ?? "",
  });

  const result = await runAiToolsGemini(prompt);
  if (!result.ok) {
    return jsonError(result.error, 502);
  }
  return jsonOk(result.text);
}
