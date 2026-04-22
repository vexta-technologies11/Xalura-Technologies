/**
 * Manual smoke (loads `.env.local` via Node’s `--env-file`):
 *   `npx tsx --env-file=.env.local xalura-agentic/scripts/gemini-ping-smoke.ts`
 * Prints `pingGeminiForHealth()` JSON (no secrets).
 */
import { pingGeminiForHealth } from "../lib/gemini";

void (async () => {
  const r = await pingGeminiForHealth();
  console.log(JSON.stringify(r, null, 2));
})();
