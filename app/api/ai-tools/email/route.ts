import { runAiToolsGemini } from "@/lib/aiToolsGemini";
import { lengthWordsLabel } from "@/lib/aiToolFormConfig";
import { buildEmailPrompt, jsonError, jsonOk } from "@/lib/aiToolsPrompts";

export const runtime = "nodejs";

type Body = {
  request?: string;
  /** Legacy */
  purpose?: string;
  tone?: string;
  length?: string;
  recipient?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const request = (body.request ?? body.purpose ?? "").trim();
  if (!request) {
    return jsonError("Describe what you need in the main field.", 400);
  }

  const len = (body.length ?? "100").trim();
  const lengthInstruction = lengthWordsLabel("email", len);

  const prompt = buildEmailPrompt({
    request,
    tone: body.tone ?? "Professional",
    lengthInstruction,
    recipient: body.recipient ?? "General audience",
  });

  const result = await runAiToolsGemini(prompt);
  if (!result.ok) {
    return jsonError(result.error, 502);
  }
  return jsonOk(result.text);
}
