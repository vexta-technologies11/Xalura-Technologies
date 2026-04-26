/**
 * Smoke: when Zernio is configured (`ZERNIO_API_KEY`), `GET /v1/profiles`.
 *
 * Optional (no post):
 *   SMOKE_MARKETING_DRY_CAPTION=1 — rolling-window article + Gemini caption via `forceForDryRunSmoke` (dry only, **no** `zernioCreatePost`).
 * Optional (no Zernio HTTP at all):
 *   SMOKE_ZERNIO_NO_HTTP=1 — do **not** call `GET /v1/profiles` (or anything Zernio). Use with `SMOKE_MARKETING_DRY_CAPTION=1` to smoke DB + caption + `mediaItems` fields without a Zernio key or request.
 * Optional (live post — use only locally):
 *   SMOKE_MARKETING_ZERNIO_LIVE=1 — real `zernioCreatePost` (needs `AGENTIC_MARKETING_ZERNIO_POST=1` + `GEMINI_API_KEY` + platform env + `agentic_marketing_zernio_state` migration; respects 35h cooldown).
 *   SMOKE_MARKETING_ZERNIO_BYPASS_COOLDOWN=1 — with LIVE, skip cooldown (testing only).
 *
 * Local keys: this script loads `.env.local` (see `bootstrapEnvLocal.ts`). Add `ZERNIO_API_KEY`
 * there to test; Cloudflare-only secrets are not visible to `tsx` / `npm run`.
 *
 * CI / default:
 *   SMOKE_SKIP_ZERNIO=1 npx tsx xalura-agentic/scripts/smoke-marketing-zernio.ts
 *   npx tsx xalura-agentic/scripts/smoke-marketing-zernio.ts
 *
 * Dry, zero Zernio API calls: `npm run agentic:smoke-marketing-zernio-dry` (or same envs manually).
 */
import "./bootstrapEnvLocal";
import { runMarketingZernioSameDayPost } from "@/lib/marketingZernioSameDayPost";
import { isGeminiConfigured } from "../lib/gemini";
import { getPhase7Configured, zernioListProfiles } from "../lib/phase7Clients";

const cwd = process.cwd();

function fail(msg: string): never {
  console.error("FAIL:", msg);
  process.exit(1);
}

void (async () => {
  if (process.env["SMOKE_SKIP_ZERNIO"] === "1") {
    console.log("OK — SMOKE_SKIP_ZERNIO=1 (no Zernio check)");
    process.exit(0);
  }

  const noHttp = process.env["SMOKE_ZERNIO_NO_HTTP"] === "1";
  const wantLive = process.env["SMOKE_MARKETING_ZERNIO_LIVE"] === "1";
  const wantDry = process.env["SMOKE_MARKETING_DRY_CAPTION"] === "1";

  if (noHttp && wantLive) {
    fail("SMOKE_ZERNIO_NO_HTTP=1 cannot be used with SMOKE_MARKETING_ZERNIO_LIVE=1 (live post requires Zernio API).");
  }

  if (noHttp && !wantDry) {
    console.log(
      "OK — SMOKE_ZERNIO_NO_HTTP=1 (add SMOKE_MARKETING_DRY_CAPTION=1 to run a dry caption smoke with zero Zernio requests).",
    );
    process.exit(0);
  }

  if (!noHttp) {
    const p7 = await getPhase7Configured();
    if (!p7.zernio) {
      console.log(
        "SKIP: Zernio not configured (no ZERNIO_API_KEY in process.env). " +
          "Cloudflare dashboard secrets are not available to local `npm run` — set ZERNIO_API_KEY in `.env.local` to smoke locally, or set SMOKE_ZERNIO_NO_HTTP=1 with SMOKE_MARKETING_DRY_CAPTION=1 for dry-only.",
      );
      process.exit(0);
    }

    const listed = await zernioListProfiles();
    if (listed.error) {
      fail(`zernioListProfiles: ${listed.error}`);
    }
    const n = listed.profiles?.length ?? 0;
    console.log("OK — Zernio GET /v1/profiles: count =", n);
  } else {
    console.log("OK — SMOKE_ZERNIO_NO_HTTP=1 (skipping all Zernio HTTP)");
  }

  if (wantLive) {
    console.warn(
      "LIVE: SMOKE_MARKETING_ZERNIO_LIVE=1 — posting to Zernio (ensure AGENTIC_MARKETING_ZERNIO_POST and Zernio platform env are set).",
    );
    if (!(await isGeminiConfigured())) {
      fail("SMOKE_MARKETING_ZERNIO_LIVE=1 but GEMINI_API_KEY not set");
    }
    const r = await runMarketingZernioSameDayPost(cwd, {
      bypassCooldown: process.env["SMOKE_MARKETING_ZERNIO_BYPASS_COOLDOWN"] === "1",
    });
    if ("skipped" in r) {
      console.log("Live post skipped:", r.reason);
    } else if (r.ok) {
      console.log("OK — posted (slug):", r.slug, "status", r.zernioStatus, "|", r.preview);
    } else {
      fail(r.error);
    }
  } else if (wantDry) {
    if (!(await isGeminiConfigured())) {
      fail("SMOKE_MARKETING_DRY_CAPTION=1 but GEMINI_API_KEY not set");
    }
    const r = await runMarketingZernioSameDayPost(cwd, {
      dryRun: true,
      forceForDryRunSmoke: true,
    });
    if ("skipped" in r) {
      console.log("Dry caption skipped:", r.reason);
    } else if (r.ok) {
      console.log("OK — dry caption (slug):", r.slug, "| preview:\n", r.preview.slice(0, 800));
    } else {
      fail(r.error);
    }
  } else {
    console.log(
      "Hint: SMOKE_MARKETING_DRY_CAPTION=1 (caption only) or SMOKE_MARKETING_ZERNIO_LIVE=1 (real post; local only).",
    );
  }

  process.exit(0);
})();
