/**
 * One real Leonardo generation (small prompt) — same API path as article hero.
 *
 *   npx tsx xalura-agentic/scripts/smoke-leonardo.ts
 *   # (loads `.env.local` from the repo root automatically; still overrides with `LEONARDO_API_KEY=...` in shell)
 *
 * Cloudflare: for local smoke, put `LEONARDO_API_KEY` in project `.env.local` (same as Cloudflare secret name).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readEnvSync } from "@/lib/supabase/service";
import { generateHeroImage } from "@/xalura-agentic/lib/heroImageGenerate";
import { generateLeonardoImage } from "@/xalura-agentic/lib/leonardoGenerate";

/** `tsx --env-file=` does not always bind vars; Next.js loads `.env.local` for you — mirror that here. */
function applyEnvFile(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) continue;
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (k) process.env[k] = v;
  }
}

applyEnvFile(join(process.cwd(), ".env.local"));

const TEST_PROMPT =
  "Single professional product photo, modern glass of water on marble surface, soft natural window light, shallow depth of field, photorealistic editorial still, no text";

void (async () => {
  const key = readEnvSync("LEONARDO_API_KEY")?.trim();
  if (!key) {
    const path = join(process.cwd(), ".env.local");
    console.error(
      "FAIL: LEONARDO_API_KEY not in env. Add a line in project root %s:\n  LEONARDO_API_KEY=your_key\n(exact name; no spaces around =) Or: export LEONARDO_API_KEY=... for one run.",
      path,
    );
    process.exit(1);
  }
  console.log("LEONARDO_API_KEY: present (len=%d)", key.length);

  const prRaw = readEnvSync("LEONARDO_PHOTO_REAL")?.trim().toLowerCase();
  const prOn = prRaw !== "false" && prRaw !== "0";
  const prVer = readEnvSync("LEONARDO_PHOTO_REAL_VERSION")?.trim() || "v2";
  const preset = readEnvSync("LEONARDO_PRESET_STYLE")?.trim() || "PHOTOGRAPHY";
  const heroProv = readEnvSync("AGENTIC_HERO_IMAGE_PROVIDER")?.trim().toLowerCase();
  const articleUsesLeonardo = heroProv !== "imagen";
  console.log(
    "\nArticle cover image provider: %s",
    articleUsesLeonardo
      ? "Leonardo (PhotoReal below) — set AGENTIC_GRAPHIC_DESIGNER_ON_PUBLISH=1 on publish"
      : "Imagen (AGENTIC_HERO_IMAGE_PROVIDER=imagen) — not Leonardo",
  );
  console.log("  PhotoReal: %s | version: %s | preset: %s", prOn ? "on" : "off", prVer, preset);
  console.log(
    "  Graphic Designer brief (publishing) mandates photorealistic / editorial phrasing — see `publishingHeroImage.ts`.",
  );

  if (articleUsesLeonardo) {
    console.log("\n[1/3] Direct leonardoGenerate (production image path)…");
    const direct = await generateLeonardoImage({ apiKey: key, prompt: TEST_PROMPT });
    if (!direct.ok) {
      console.error("FAIL direct:", direct.error);
      process.exit(1);
    }
    console.log("OK: base64 length=%d mime=%s", direct.base64.length, direct.mimeType);
  } else {
    console.log("\n[1/3] Skipping direct Leonardo test because AGENTIC_HERO_IMAGE_PROVIDER=imagen");
  }

  console.log("\n[2/3] generateHeroImage (should route to Leonardo when key is set)…");
  const hero = await generateHeroImage({ prompt: TEST_PROMPT.slice(0, 200) });
  if (!hero.ok) {
    console.error("FAIL heroImageGenerate:", hero.error);
    process.exit(1);
  }
  console.log("OK: base64 length=%d mime=%s", hero.base64.length, hero.mimeType);

  const prov = readEnvSync("AGENTIC_HERO_IMAGE_PROVIDER")?.trim().toLowerCase();
  if (prov === "imagen") {
    console.warn(
      "\nWARN: AGENTIC_HERO_IMAGE_PROVIDER=imagen — production would use Imagen, not Leonardo.",
    );
  }

  const gemini = readEnvSync("GEMINI_API_KEY")?.trim();
  if (!gemini) {
    console.log(
      "\n[3/3] SKIP: no GEMINI_API_KEY — full article path needs Gemini (art brief) + Leonardo. Set GEMINI to smoke `generatePublishingHeroImage`.",
    );
    console.log("\nOK: [1/3]–[2/3] passed. Leonardo is wired for hero images.");
    process.exit(0);
    return;
  }

  process.env.AGENTIC_GRAPHIC_DESIGNER_ON_PUBLISH = "1";
  const { generatePublishingHeroImage } = await import("@/xalura-agentic/lib/publishingHeroImage");
  console.log(
    "\n[3/3] generatePublishingHeroImage (publishing: Gemini brief → same hero pipeline as on publish)…",
  );
  const slug = `smoke-article-${Date.now()}`;
  const ph = await generatePublishingHeroImage({
    title: "OBD2 readiness monitors: what new drivers should know",
    executiveSummary:
      "Explains readiness monitors, what “not ready” means, and a simple drive cycle before an emissions test. Practical, non-technical focus.",
    slug,
    primaryKeyword: "OBD2 readiness monitor",
  });
  if (!ph.ok) {
    console.error("FAIL publishing hero path:", ph.error);
    if (ph.imagePrompt) {
      console.error("Art-brief prompt (partial):", ph.imagePrompt.slice(0, 200) + (ph.imagePrompt.length > 200 ? "…" : ""));
    }
    process.exit(1);
  }
  const prWords = /photo|real|natural|editorial|document|product|lens|light|scene/i;
  if (!prWords.test(ph.imagePrompt)) {
    console.warn(
      "WARN: art-brief prompt does not obviously mention photoreal cues — check Graphic Designer output; code still mandates photoreal in `publishingHeroImage`.",
    );
  }
  console.log("OK: art-brief length=%d chars, image base64 len=%d mime=%s", ph.imagePrompt.length, ph.base64.length, ph.mimeType);
  console.log("Art-brief (first 220 chars):", ph.imagePrompt.slice(0, 220) + (ph.imagePrompt.length > 220 ? "…" : ""));

  console.log(
    "\nAll checks passed. Leonardo (PhotoReal) + publishing Graphic Designer path matches article covers.",
  );
  process.exit(0);
})();
