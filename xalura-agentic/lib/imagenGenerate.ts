/**
 * Imagen via Gemini API key (same key as text models).
 * Default model: **Imagen 4 Ultra** — override with `AGENTIC_IMAGE_MODEL`.
 *
 * Uses REST `v1beta/models/{model}:generateImages`. Response shapes vary; we try two common bodies.
 */

export type ImagenGenerateResult =
  | { ok: true; mimeType: string; base64: string }
  | { ok: false; error: string };

function pickBase64FromJson(json: Record<string, unknown>): {
  mimeType: string;
  base64: string;
} | null {
  const imgs = json["generatedImages"];
  if (!Array.isArray(imgs) || !imgs.length) return null;
  const first = imgs[0];
  if (!first || typeof first !== "object") return null;
  const o = first as Record<string, unknown>;
  const img = o["image"];
  if (!img || typeof img !== "object") return null;
  const io = img as Record<string, unknown>;
  const b64 = io["imageBytes"] ?? io["bytesBase64Encoded"];
  if (typeof b64 !== "string" || !b64.trim()) return null;
  const mime =
    typeof io["mimeType"] === "string" && io["mimeType"].trim()
      ? String(io["mimeType"])
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
    process.env["AGENTIC_IMAGE_MODEL"]?.trim() ||
    "imagen-4.0-ultra-generate-001";
  const key = params.apiKey.trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateImages?key=${encodeURIComponent(key)}`;

  const bodies: Record<string, unknown>[] = [
    { prompt: params.prompt.trim(), numberOfImages: 1 },
    { prompt: { text: params.prompt.trim() }, numberOfImages: 1 },
  ];

  let lastErr = "No response";

  for (const body of bodies) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const rawText = await res.text();
      let json: Record<string, unknown> = {};
      try {
        json = JSON.parse(rawText) as Record<string, unknown>;
      } catch {
        json = {};
      }
      if (!res.ok) {
        lastErr =
          typeof json["error"] === "object" && json["error"] !== null
            ? JSON.stringify(json["error"]).slice(0, 900)
            : rawText.slice(0, 900);
        continue;
      }
      const picked = pickBase64FromJson(json);
      if (picked) return { ok: true, ...picked };
      lastErr = "200 but no generatedImages bytes in JSON";
    } catch (e) {
      lastErr = (e instanceof Error ? e.message : String(e)).replace(/\s+/g, " ").slice(0, 500);
    }
  }

  return { ok: false, error: lastErr };
}
