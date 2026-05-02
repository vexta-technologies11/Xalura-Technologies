import { runAiToolsGemini } from "@/lib/aiToolsGemini";
import { lengthWordsLabel } from "@/lib/aiToolFormConfig";
import { buildContentPrompt, jsonError, jsonOk } from "@/lib/aiToolsPrompts";
import { checkRateLimit, recordGeneration, getRateLimitHeaders } from "@/lib/serverRateLimit";

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
  // Server-side rate limiting
  const rateLimit = checkRateLimit(req);
  if (!rateLimit.allowed) {
    const retrySeconds = rateLimit.retryAfter
      ? Math.ceil(rateLimit.retryAfter / 1000)
      : 86400;
    return new Response(
      JSON.stringify({
        ok: false,
        error: `Daily limit reached. Try again in ${retrySeconds > 3600 ? `${Math.ceil(retrySeconds / 3600)}h` : `${Math.ceil(retrySeconds / 60)}m`}.`,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          ...getRateLimitHeaders(rateLimit),
        },
      },
    );
  }

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

  // Record successful generation
  recordGeneration(req);
  return jsonOk(result.text);
}
