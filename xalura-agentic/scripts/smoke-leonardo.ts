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
import { generateHeroImage } from "../lib/heroImageGenerate";
import { generateLeonardoImage } from "../lib/leonardoGenerate";
import { readEnvSync } from "../../lib/supabase/service";

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
