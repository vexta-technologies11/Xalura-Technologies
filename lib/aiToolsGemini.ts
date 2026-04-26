import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GenerateContentRequest } from "@google/generative-ai";

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

  try {
    const gen = new GoogleGenerativeAI(key);
    const model = gen.getGenerativeModel({ model: getModelName() });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    if (!text?.trim()) {
      return { ok: false, error: "The model returned an empty response." };
    }
    return { ok: true, text: text.trim() };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed.";
    return { ok: false, error: msg };
  }
}

/**
 * JSON-only response (Gemini). Used by report builder for structured PDF templates.
 */
export async function runAiToolsGeminiJson(prompt: string): Promise<AiToolsResult> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    return { ok: false, error: "AI is not configured. Set GEMINI_API_KEY in the environment." };
  }
  if (!prompt?.trim()) {
    return { ok: false, error: "Request was empty." };
  }

  try {
    const gen = new GoogleGenerativeAI(key);
    const model = gen.getGenerativeModel({ model: getModelName() });
    const req: GenerateContentRequest = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.35,
        maxOutputTokens: 8192,
      },
    };
    const result = await model.generateContent(req);
    const text = result.response.text();
    if (!text?.trim()) {
      return { ok: false, error: "The model returned an empty response." };
    }
    return { ok: true, text: text.trim() };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed.";
    return { ok: false, error: msg };
  }
}
