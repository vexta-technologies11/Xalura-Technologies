import { runAiToolsGemini } from "@/lib/aiToolsGemini";
import { buildEmailPrompt, jsonError, jsonOk } from "@/lib/aiToolsPrompts";

export const runtime = "nodejs";

type Body = {
  purpose?: string;
  tone?: string;
  length?: string;
  recipient?: string;
  keyPoints?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const purpose = (body.purpose ?? "").trim();
  if (!purpose) {
    return jsonError("Purpose is required.", 400);
  }

  const prompt = buildEmailPrompt({
    purpose,
    tone: body.tone ?? "Professional",
    length: body.length ?? "Medium",
    recipient: body.recipient ?? "General business",
    keyPoints: body.keyPoints ?? "",
  });

  const result = await runAiToolsGemini(prompt);
  if (!result.ok) {
    return jsonError(result.error, 502);
  }
  return jsonOk(result.text);
}
