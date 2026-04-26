import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_MODEL = "gemini-2.5-flash-lite";

function getModelName(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

export type AiToolsResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

/**
 * Public AI Tools: single-turn Gemini 2.5 Flash Lite. Uses GEMINI_API_KEY in server context.
 */
export async function runAiToolsGemini(prompt: string): Promise<AiToolsResult> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    return { ok: false, error: "AI is not configured. Set GEMINI_API_KEY in the environment." };
  }
  if (!prompt?.trim()) {
    return { ok: false, error: "Request was empty." };
  }

  const gen = new GoogleGenerativeAI(key);
  const model = gen.getGenerativeModel({ model: getModelName() });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text?.trim()) {
    return { ok: false, error: "The model returned an empty response." };
  }
  return { ok: true, text: text.trim() };
}
