import { generateImagenImage } from "./imagenGenerate";
import { resolveGeminiApiKey, runAgent } from "./gemini";
import { resolveWorkerEnv } from "./resolveWorkerEnv";

export type PublishingHeroImageResult =
  | { ok: true; imagePrompt: string; base64: string; mimeType: string }
  | { ok: false; error: string; imagePrompt?: string };

/**
 * Flash-lite art brief → Imagen (when `AGENTIC_GRAPHIC_DESIGNER_ON_PUBLISH` is on).
 * Used for article cover + optional email attachment (caller dedupes).
 */
export async function generatePublishingHeroImage(params: {
  title: string;
  executiveSummary: string;
  slug: string;
  /** When set, steers the hero away from generic stock visuals toward the article pillar. */
  primaryKeyword?: string;
  subcategory?: string;
}): Promise<PublishingHeroImageResult> {
  const flag = (await resolveWorkerEnv("AGENTIC_GRAPHIC_DESIGNER_ON_PUBLISH"))
    ?.trim()
    .toLowerCase();
  if (flag !== "true" && flag !== "1") {
    return { ok: false, error: "AGENTIC_GRAPHIC_DESIGNER_ON_PUBLISH not enabled" };
  }
  try {
    const kw = params.primaryKeyword?.trim();
    const sub = params.subcategory?.trim();
    const anchor =
      [kw ? `Primary keyword: ${kw}` : "", sub ? `Subcategory: ${sub}` : ""]
        .filter(Boolean)
        .join("\n") + (kw || sub ? "\n" : "");
    const promptBrief = await runAgent({
      role: "Worker",
      department: "Publishing — Graphic Designer",
      task: `You are the **Graphic Designer**. Produce **only** a single compact English image generation prompt (max 500 characters) for one hero illustration for this published article. No quotes, no markdown — raw prompt text only. The image must visually support the **keyword pillar** below, not a generic tech stock scene unless it fits that pillar.

Article title: ${params.title}
${anchor}Executive summary:
${params.executiveSummary.slice(0, 2000)}`,
      context: { kind: "graphic_designer_prompt", slug: params.slug },
    });
    const imagePrompt = promptBrief.trim().slice(0, 500);
    const apiKey = await resolveGeminiApiKey();
    if (!apiKey) {
      return { ok: false, error: "GEMINI_API_KEY missing", imagePrompt };
    }
    const img = await generateImagenImage({ apiKey, prompt: imagePrompt });
    if (!img.ok) {
      return { ok: false, error: img.error, imagePrompt };
    }
    return { ok: true, imagePrompt, base64: img.base64, mimeType: img.mimeType };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
