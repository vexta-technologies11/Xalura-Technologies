/**
 * One real Leonardo generation (small prompt) — same API path as article hero.
 *
 *   npx tsx --env-file=.env.local xalura-agentic/scripts/smoke-leonardo.ts
 *   # or: LEONARDO_API_KEY=... npx tsx xalura-agentic/scripts/smoke-leonardo.ts
 *
 * Cloudflare: copy `LEONARDO_API_KEY` into `.env.local` for local smoke, or export for one run.
 */
import { generateHeroImage } from "../lib/heroImageGenerate";
import { generateLeonardoImage } from "../lib/leonardoGenerate";
import { readEnvSync } from "../../lib/supabase/service";

const TEST_PROMPT =
  "Single professional product photo, modern glass of water on marble surface, soft natural window light, shallow depth of field, photorealistic editorial still, no text";

void (async () => {
  const key = readEnvSync("LEONARDO_API_KEY")?.trim();
  if (!key) {
    console.error("FAIL: LEONARDO_API_KEY not in env (add to .env.local or export for this command).");
    process.exit(1);
  }
  console.log("LEONARDO_API_KEY: present (len=%d)", key.length);

  console.log("\n[1/2] Direct leonardoGenerate (production image path)…");
  const direct = await generateLeonardoImage({ apiKey: key, prompt: TEST_PROMPT });
  if (!direct.ok) {
    console.error("FAIL direct:", direct.error);
    process.exit(1);
  }
  console.log("OK: base64 length=%d mime=%s", direct.base64.length, direct.mimeType);

  console.log("\n[2/2] generateHeroImage (should route to Leonardo when key is set)…");
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
  } else {
    console.log("\nAll checks passed. Leonardo API is working for this environment.");
  }
  process.exit(0);
})();
