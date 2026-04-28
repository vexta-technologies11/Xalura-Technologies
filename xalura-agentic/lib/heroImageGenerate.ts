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

  // If explicitly forced to Imagen, or Leonardo not forced and no LEONARDO key, use Imagen.
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

  // Try Leonardo first when a key is present and not forced to Imagen. On failure, fallback to Imagen if possible.
  if (!leoKey) {
    return { ok: false, error: "LEONARDO_API_KEY not set (or set AGENTIC_HERO_IMAGE_PROVIDER=imagen)" };
  }

  const leoResult = await generateLeonardoImage({ apiKey: leoKey, prompt: params.prompt });
  if (leoResult.ok) return leoResult;

  // Leonardo failed — attempt Imagen fallback when a Gemini key is available.
  const gemApiKey = await resolveGeminiApiKey();
  if (!gemApiKey) {
    // Return the original Leonardo error when no fallback is available.
    return { ok: false, error: `Leonardo failed: ${leoResult.error}` };
  }
  const imagenResult = await generateImagenImage({ apiKey: gemApiKey, prompt: params.prompt });
  if (imagenResult.ok) return imagenResult;

  // Both failed — return combined message for diagnostics.
  return { ok: false, error: `Leonardo failed: ${leoResult.error}; Imagen fallback failed: ${imagenResult.error}` };
}
