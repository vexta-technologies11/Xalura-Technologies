/**
 * Article hero / graphic designer image backend: **Leonardo** (default when `LEONARDO_API_KEY` is set)
 * or **Google Imagen** (when `AGENTIC_HERO_IMAGE_PROVIDER=imagen` or no Leonardo key).
 */
import { resolveGeminiApiKey } from "./gemini";
import { generateImagenImage, type ImagenGenerateResult } from "./imagenGenerate";
import { generateLeonardoImage } from "./leonardoGenerate";
import { resolveWorkerEnv } from "./resolveWorkerEnv";

export type { ImagenGenerateResult as HeroImageGenerateResult };

/**
 * Renders the image from a **text prompt** (from the Graphic Designer agent).
 */
export async function generateHeroImage(params: { prompt: string }): Promise<ImagenGenerateResult> {
  const override = (await resolveWorkerEnv("AGENTIC_HERO_IMAGE_PROVIDER"))?.trim().toLowerCase();
  const leoKey = (await resolveWorkerEnv("LEONARDO_API_KEY"))?.trim();
  const forceImagen = override === "imagen";
  const forceLeonardo = override === "leonardo";

  if (forceImagen || (!forceLeonardo && !leoKey)) {
    const apiKey = await resolveGeminiApiKey();
    if (!apiKey) {
      return {
        ok: false,
        error: "GEMINI_API_KEY missing (set LEONARDO_API_KEY for Leonardo, or GEMINI for Imagen).",
      };
    }
    return generateImagenImage({ apiKey, prompt: params.prompt });
  }
  if (!leoKey) {
    return { ok: false, error: "LEONARDO_API_KEY not set (or set AGENTIC_HERO_IMAGE_PROVIDER=imagen)" };
  }
  return generateLeonardoImage({ apiKey: leoKey, prompt: params.prompt });
}
