import { Buffer } from "node:buffer";

/**
 * Leonardo.Ai image generation (REST v1) — used for article hero / graphic designer.
 * @see https://docs.leonardo.ai/reference/creategeneration
 *
 * Default: artistic/abstract style (no photoReal). Set LEONARDO_PHOTO_REAL=true for photorealism.
 * Default preset: DYNAMIC (set LEONARDO_PRESET_STYLE to override, e.g. PHOTOGRAPHY, CINEMATIC, FANTASY).
 */

import { resolveWorkerEnv } from "./resolveWorkerEnv";
import type { ImagenGenerateResult } from "./imagenGenerate";

const API_BASE = "https://cloud.leonardo.ai/api/rest/v1";

/**
 * PhotoReal **v2** only accepts specific base models (e.g. Kino / Diffusion / Vision XL).
 * When `LEONARDO_MODEL_ID` is unset we default to **Leonardo Kino XL** (docs example).
 * @see https://docs.leonardo.ai/docs/generate-images-using-photoreal
 */
const DEFAULT_PHOTOREAL_V2_MODEL_ID = "aa77f04e-3eec-4034-9c07-d0f619684628";

const DEFAULT_NEG =
  "photorealistic, photo, photography, realistic,no text,no letters, logo, watermark, signature, brand, deformed, ugly, blurry, low quality, low resolution, amateur, sketchy, cartoon, anime, cluttered, busy, noisy, oversaturated, hyperrealistic";

const PRESET_STYLE = "DYNAMIC";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function bufferToBase64(buf: ArrayBuffer, mime: string): ImagenGenerateResult {
  const b64 = Buffer.from(buf).toString("base64");
  return { ok: true, base64: b64, mimeType: mime || "image/png" };
}

function generationRoot(
  json: Record<string, unknown>,
): Record<string, unknown> | null {
  const d = json["data"] as Record<string, unknown> | undefined;
  const pk =
    (json["generations_by_pk"] as Record<string, unknown> | undefined) ??
    (d?.["generations_by_pk"] as Record<string, unknown> | undefined);
  if (pk) return pk;
  const gen = json["generation"] as Record<string, unknown> | undefined;
  return gen ?? null;
}

function pickImageUrlFromGenerationJson(json: Record<string, unknown>): string | null {
  const root = generationRoot(json) ?? json;
  const images = root["generated_images"] as unknown;
  if (!Array.isArray(images) || !images.length) return null;
  const first = images[0] as Record<string, unknown>;
  const url = first["url"];
  return typeof url === "string" && url.trim() ? url.trim() : null;
}

function pickStatusFromGenerationJson(json: Record<string, unknown>): string | null {
  const root = generationRoot(json) ?? json;
  const st = root["status"];
  return typeof st === "string" ? st : null;
}

export async function generateLeonardoImage(params: {
  apiKey: string;
  prompt: string;
}): Promise<ImagenGenerateResult> {
  const key = params.apiKey.trim();
  const prompt = params.prompt.trim();
  if (!key) {
    return { ok: false, error: "LEONARDO_API_KEY empty" };
  }
  if (!prompt) {
    return { ok: false, error: "empty prompt" };
  }

  const modelId = (await resolveWorkerEnv("LEONARDO_MODEL_ID"))?.trim() || undefined;
  const width = Math.min(1536, Math.max(32, parseInt((await resolveWorkerEnv("LEONARDO_WIDTH")) || "1280", 10) || 1280));
  const height = Math.min(1536, Math.max(32, parseInt((await resolveWorkerEnv("LEONARDO_HEIGHT")) || "720", 10) || 720));
  const w = Math.floor(width / 8) * 8;
  const h = Math.floor(height / 8) * 8;
  // Artistic/abstract mode by default. Set LEONARDO_PHOTO_REAL=true to force photorealistic.
  const photoRealRaw = (await resolveWorkerEnv("LEONARDO_PHOTO_REAL"))?.trim().toLowerCase();
  const usePhotoReal = photoRealRaw === "true" || photoRealRaw === "1";
  // Default to PhotoReal v1 (more widely available / affordable).
  let photoVersion = (await resolveWorkerEnv("LEONARDO_PHOTO_REAL_VERSION"))?.trim() || "v1";
  if (photoVersion !== "v1" && photoVersion !== "v2") {
    photoVersion = "v1";
  }
  const preset =
    (await resolveWorkerEnv("LEONARDO_PRESET_STYLE"))?.trim() || PRESET_STYLE;

  const body: Record<string, unknown> = {
    prompt,
    num_images: 1,
    width: w,
    height: h,
    alchemy: true,
    guidance_scale: 7,
    negative_prompt: DEFAULT_NEG,
    presetStyle: preset,
    // No photoReal by default — produces artistic/illustrative styles
  };

  if (usePhotoReal) {
    body["photoReal"] = true;
    body["photoRealVersion"] = photoVersion;
    // v1 only: API rejects `photoRealStrength` with PhotoReal v2.
    if (photoVersion === "v1") {
      body["photoRealStrength"] = 0.5;
    }
    // v2 requires a model id; v1 is documented to omit model. unset LEONARDO_PHOTO_REAL_VERSION v1 to skip model.
    if (photoVersion === "v2") {
      body["modelId"] = modelId || DEFAULT_PHOTOREAL_V2_MODEL_ID;
    } else if (modelId) {
      body["modelId"] = modelId;
    }
  } else if (modelId) {
    body["modelId"] = modelId;
  }

  try {
    const post = await fetch(`${API_BASE}/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    const postText = await post.text();
    let postJson: Record<string, unknown> = {};
    try {
      postJson = JSON.parse(postText) as Record<string, unknown>;
    } catch {
      /* empty */
    }
    if (!post.ok) {
      return {
        ok: false,
        error: `Leonardo create HTTP ${post.status}: ${postText.slice(0, 500)}`,
      };
    }
    const job = postJson["sdGenerationJob"] as Record<string, unknown> | undefined;
    const genId =
      (job?.["generationId"] as string | undefined) ||
      (postJson["generationId"] as string | undefined);
    if (!genId?.trim()) {
      return {
        ok: false,
        error: `Leonardo create: no generationId. Body: ${postText.slice(0, 400)}`,
      };
    }

    const maxWaitMs = 180_000;
    const stepMs = 2_000;
    const t0 = Date.now();
    let lastStatus = "";

    while (Date.now() - t0 < maxWaitMs) {
      const get = await fetch(`${API_BASE}/generations/${encodeURIComponent(genId)}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${key}`,
          accept: "application/json",
        },
      });
      const getText = await get.text();
      let getJson: Record<string, unknown> = {};
      try {
        getJson = JSON.parse(getText) as Record<string, unknown>;
      } catch {
        getJson = {};
      }
      if (!get.ok) {
        return {
          ok: false,
          error: `Leonardo poll HTTP ${get.status}: ${getText.slice(0, 400)}`,
        };
      }
      lastStatus = pickStatusFromGenerationJson(getJson) || "";
      if (lastStatus === "FAILED") {
        return { ok: false, error: "Leonardo generation FAILED" };
      }
      if (lastStatus === "COMPLETE") {
        const url = pickImageUrlFromGenerationJson(getJson);
        if (url) {
          const imgRes = await fetch(url, { method: "GET" });
          if (!imgRes.ok) {
            return {
              ok: false,
              error: `Leonardo image fetch HTTP ${imgRes.status} for ${url.slice(0, 120)}`,
            };
          }
          const buf = await imgRes.arrayBuffer();
          const ct = imgRes.headers.get("content-type") || "image/png";
          return bufferToBase64(buf, ct.split(";")[0]!.trim());
        }
        return {
          ok: false,
          error: "Leonardo COMPLETE but no image URL in response",
        };
      }
      await sleep(stepMs);
    }
    return {
      ok: false,
      error: `Leonardo timeout after ${maxWaitMs}ms (last status: ${lastStatus || "unknown"})`,
    };
  } catch (e) {
    return {
      ok: false,
      error: (e instanceof Error ? e.message : String(e)).replace(/\s+/g, " ").slice(0, 500),
    };
  }
}
