/**
 * Imagen via Gemini API key (same key as text models).
 * Default model: **Imagen 4 Ultra** — override with `AGENTIC_IMAGE_MODEL` (Worker-safe via resolveWorkerEnv).
 *
 * Google’s current REST shape is `v1beta/models/{model}:predict` with
 * `{ instances: [{ prompt }], parameters: { sampleCount } }`.
 * The older `:generateImages` route returns 404 for these models.
 */

import { resolveWorkerEnv } from "./resolveWorkerEnv";

export type ImagenGenerateResult =
  | { ok: true; mimeType: string; base64: string }
  | { ok: false; error: string };

const DEFAULT_MODEL = "imagen-4.0-ultra-generate-001";

function pickFromPredictJson(json: Record<string, unknown>): {
  mimeType: string;
  base64: string;
} | null {
  const preds = json["predictions"];
  if (!Array.isArray(preds) || !preds.length) return null;
  const first = preds[0];
  if (!first || typeof first !== "object") return null;
  const o = first as Record<string, unknown>;
  const img = o["image"];
  if (img && typeof img === "object") {
    const io = img as Record<string, unknown>;
    const b64 = io["imageBytes"] ?? io["bytesBase64Encoded"];
    if (typeof b64 !== "string" || !b64.trim()) return null;
    const mime =
      typeof io["mimeType"] === "string" && io["mimeType"].trim()
        ? String(io["mimeType"])
        : "image/png";
    return { mimeType: mime, base64: b64.trim() };
  }
  const b64 = o["bytesBase64Encoded"] ?? o["imageBytes"];
  if (typeof b64 !== "string" || !b64.trim()) return null;
  const mime =
    typeof o["mimeType"] === "string" && o["mimeType"].trim()
      ? String(o["mimeType"])
      : "image/png";
  return { mimeType: mime, base64: b64.trim() };
}

export async function generateImagenImage(params: {
  apiKey: string;
  prompt: string;
  model?: string;
}): Promise<ImagenGenerateResult> {
  const model =
    params.model?.trim() ||
    (await resolveWorkerEnv("AGENTIC_IMAGE_MODEL"))?.trim() ||
    DEFAULT_MODEL;
  const key = params.apiKey.trim();
  const prompt = params.prompt.trim();
  if (!prompt) {
    return { ok: false, error: "empty prompt" };
  }

  const predictUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:predict?key=${encodeURIComponent(key)}`;
  const predictBody = {
    instances: [{ prompt }],
    parameters: { sampleCount: 1 },
  };

  try {
    const res = await fetch(predictUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(predictBody),
    });
    const rawText = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      json = {};
    }
    if (!res.ok) {
      const err =
        typeof json["error"] === "object" && json["error"] !== null
          ? JSON.stringify(json["error"]).slice(0, 900)
          : rawText.slice(0, 900) || "(empty body)";
      return { ok: false, error: `Imagen predict HTTP ${res.status}: ${err}` };
    }
    const picked = pickFromPredictJson(json);
    if (picked) return { ok: true, ...picked };
    return {
      ok: false,
      error: `Imagen predict HTTP 200 but no image bytes (model=${model}). Body: ${rawText.slice(0, 400)}`,
    };
  } catch (e) {
    return {
      ok: false,
      error: (e instanceof Error ? e.message : String(e)).replace(/\s+/g, " ").slice(0, 500),
    };
  }
}
