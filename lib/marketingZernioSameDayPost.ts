import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { logMarketingZernioPostOutcome } from "@/lib/marketingZernioChiefContext";
import { absoluteUrlForMedia, publicUrlForPath } from "@/lib/resolvePublicSiteOrigin";
import { isGeminiConfigured, runAgent } from "@/xalura-agentic/lib/gemini";
import { resolveWorkerEnv } from "@/xalura-agentic/lib/resolveWorkerEnv";
import { resolveZernioPublishTargets } from "@/lib/resolveZernioPublishTargets";
import { zernioCreatePost } from "@/xalura-agentic/lib/phase7Clients";

/** Default rolling window for “recent article” pick and minimum hours between Zernio posts (was ~24h same-day). */
export const MARKETING_ZERNIO_DEFAULT_HOURS = 35;

export type MarketingZernioPostOutcome =
  | { ok: true; slug: string; title: string; zernioStatus: number; preview: string }
  | { skipped: true; reason: string }
  | { ok: false; error: string };

type ArticleRow = {
  slug: string;
  title: string;
  body: string | null;
  excerpt: string | null;
  cover_image_url: string | null;
};

function hoursFromEnv(raw: string | undefined, fallback: number): number {
  const n = raw?.trim() ? Number.parseInt(raw.trim(), 10) : NaN;
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(24 * 90, n);
}

async function resolveCooldownHours(): Promise<number> {
  const v = await resolveWorkerEnv("AGENTIC_MARKETING_ZERNIO_COOLDOWN_HOURS");
  return hoursFromEnv(v, MARKETING_ZERNIO_DEFAULT_HOURS);
}

async function resolveArticleLookbackHours(): Promise<number> {
  const v = await resolveWorkerEnv("AGENTIC_MARKETING_ZERNIO_ARTICLE_LOOKBACK_HOURS");
  return hoursFromEnv(v, MARKETING_ZERNIO_DEFAULT_HOURS);
}

function isoHoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

async function getLastMarketingZernioPostAt(
  supabase: SupabaseClient,
): Promise<Date | null> {
  const { data, error } = await supabase
    .from("agentic_marketing_zernio_state")
    .select("last_post_at")
    .eq("id", "default")
    .maybeSingle();
  if (error) {
    const code = (error as { code?: string }).code;
    const msg = error.message || "";
    if (code === "42P01" || /relation.*does not exist/i.test(msg)) {
      throw new Error(
        "Table `agentic_marketing_zernio_state` is missing; apply migration `20260428120000_agentic_marketing_zernio_state.sql`.",
      );
    }
    throw new Error(msg);
  }
  const s = data?.last_post_at;
  if (typeof s !== "string" || !s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function recordMarketingZernioPostNow(supabase: SupabaseClient): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase.from("agentic_marketing_zernio_state").upsert(
    { id: "default", last_post_at: now, updated_at: now },
    { onConflict: "id" },
  );
  if (error) throw new Error(error.message);
}

function pickRandom<T>(items: T[]): T | undefined {
  if (!items.length) return undefined;
  return items[Math.floor(Math.random() * items.length)]!;
}

const CAPTION_SYSTEM = `You write short social posts for a B2B tech brand. Write like a person texting a smart colleague, not like marketing copy or a model.

**Ground rules (strict):**
- Do not use em dashes (the long "—" character) or en dashes for breaks. Use commas, periods, or "and". Short hyphen in words (e.g. e-mail) is fine.
- Avoid AI-typical phrasing. Never use: leverage, delve, landscape, unlock, robust, seamless, cutting-edge, synergy, "in today's fast-paced", "dive deep", "game-changer", "at the end of the day", "it goes without saying", "harness", "ecosystem" (unless literal), "empower" (as filler), "revolutionize", "transform your journey".
- No markdown, no "Hook:" labels, no bullet lists, no title case on every word.

**Content (4 short blocks, line breaks between blocks, under ~1200 characters total if possible):**
1) **Opener (1-2 lines):** Grab attention. Plain words. You can ask a small question or state a sharp observation. Do not recap the whole article.
2) **Reader value (2-4 lines, the important layer):** Be specific from the article. Address at least two of: (a) who this helps (role or situation), (b) what they will be able to do or decide better after reading (skill, habit, or clarity, not a course catalog), (c) what concrete information, steps, or frameworks they get from the piece. Sound helpful, not hype.
3) **You line (1 line):** A single honest sentence. Why you would send someone to the link. No corporate polish.
4) **Soft CTA (1 line):** Invite a look or a thought, not a sale. Examples: "Worth 3 minutes if you are in the weeds on this." / "If this is your world, the link is worth it."

**Tone:** LinkedIn and Facebook Page, conversational, slightly imperfect is OK. No hashtags unless one fits naturally, max one emoji only if it truly fits, usually none.`;

function stripLongDashesForSocial(text: string): string {
  return text
    .replace(/\u2014/g, ", ")
    .replace(/\u2013/g, " - ")
    .replace(/,\s*,/g, ", ");
}

/**
 * When `AGENTIC_MARKETING_ZERNIO_POST` is true: pick a random `articles` row published in the **rolling
 * lookback window** (default **35h**, `AGENTIC_MARKETING_ZERNIO_ARTICLE_LOOKBACK_HOURS`), generate a caption
 * with Gemini, post to Zernio **if** the last Marketing Zernio post was at least **35h** ago (default,
 * `AGENTIC_MARKETING_ZERNIO_COOLDOWN_HOURS`) — tracked in `agentic_marketing_zernio_state`.
 *
 * `forceForDryRunSmoke` — for local smoke tests only: skip the feature flag, but **must** pair with
 * `dryRun: true` (never live-post from a smoke override).
 * `bypassCooldown` — optional (e.g. smoke live test with `SMOKE_MARKETING_ZERNIO_BYPASS_COOLDOWN=1`).
 * `adminForcePost` — server-only: skip `AGENTIC_MARKETING_ZERNIO_POST` and cooldown (e.g. admin “post now” button).
 */
export async function runMarketingZernioSameDayPost(
  _cwd: string,
  options?: {
    dryRun?: boolean;
    forceForDryRunSmoke?: boolean;
    bypassCooldown?: boolean;
    /** Set only from trusted admin API — bypasses feature flag and cooldown. */
    adminForcePost?: boolean;
  },
): Promise<MarketingZernioPostOutcome> {
  if (options?.forceForDryRunSmoke && !options.dryRun) {
    return { ok: false, error: "forceForDryRunSmoke is only valid with dryRun" };
  }
  const flag = (await resolveWorkerEnv("AGENTIC_MARKETING_ZERNIO_POST"))?.trim().toLowerCase();
  if (
    !options?.adminForcePost &&
    !options?.forceForDryRunSmoke &&
    flag !== "true" &&
    flag !== "1"
  ) {
    return { skipped: true, reason: "AGENTIC_MARKETING_ZERNIO_POST not enabled" };
  }

  const shouldLogToChief = !options?.dryRun && !options?.forceForDryRunSmoke;
  const logSource: "admin_force" | "pipeline" = options?.adminForcePost
    ? "admin_force"
    : "pipeline";

  function finish(r: MarketingZernioPostOutcome): MarketingZernioPostOutcome {
    if (shouldLogToChief) {
      logMarketingZernioPostOutcome(r, { source: logSource, skipIfDry: false });
    }
    return r;
  }

  if (!options?.dryRun) {
    const zKey = await resolveWorkerEnv("ZERNIO_API_KEY");
    if (!zKey) {
      return finish({ ok: false, error: "ZERNIO_API_KEY not set" });
    }
  }

  if (!(await isGeminiConfigured())) {
    return finish({ ok: false, error: "GEMINI_API_KEY not set — need live model for caption" });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return finish({
      ok: false,
      error: "Supabase service client unavailable (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)",
    });
  }

  const [cooldownH, lookbackH] = await Promise.all([
    resolveCooldownHours(),
    resolveArticleLookbackHours(),
  ]);
  const isLiveAttempt = !options?.dryRun;
  const bypassC = !!(options?.bypassCooldown || options?.adminForcePost);

  if (isLiveAttempt && !bypassC) {
    try {
      const last = await getLastMarketingZernioPostAt(supabase);
      if (last) {
        const elapsedMs = Date.now() - last.getTime();
        const needMs = cooldownH * 60 * 60 * 1000;
        if (elapsedMs < needMs) {
          const remainH = Math.max(0, (needMs - elapsedMs) / (60 * 60 * 1000));
          return finish({
            skipped: true,
            reason: `cooldown: last marketing Zernio post was ${last.toISOString()}; wait ~${remainH.toFixed(1)}h more (min ${cooldownH}h, AGENTIC_MARKETING_ZERNIO_COOLDOWN_HOURS)`,
          });
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return finish({
        ok: false,
        error: `agentic_marketing_zernio_state: ${msg} (apply migration 20260428120000_agentic_marketing_zernio_state.sql)`,
      });
    }
  }

  const since = isoHoursAgo(lookbackH);
  const { data: rows, error: qerr } = await supabase
    .from("articles")
    .select("slug, title, body, excerpt, cover_image_url")
    .eq("is_published", true)
    .gte("published_at", since);

  if (qerr) {
    return finish({ ok: false, error: `articles query: ${qerr.message}` });
  }
  const list = (rows ?? []) as ArticleRow[];
  if (!list.length) {
    return finish({
      skipped: true,
      reason: `no articles published in the last ${lookbackH}h (AGENTIC_MARKETING_ZERNIO_ARTICLE_LOOKBACK_HOURS)`,
    });
  }

  const article = pickRandom(list);
  if (!article) {
    return finish({ skipped: true, reason: "empty pick" });
  }

  const articlePath = `/articles/${article.slug}`;
  const publicLink = await publicUrlForPath(articlePath);
  if (!publicLink) {
    return finish({
      ok: false,
      error:
        "Cannot build a public https URL for the article. Set at least one of: AGENTIC_PUBLIC_BASE_URL, " +
        "NEXT_PUBLIC_SITE_URL, or AGENTIC_CRON_BASE_URL to your site origin (e.g. https://www.xaluratech.com) " +
        "in this environment (e.g. .env.local for `next dev`, Cloudflare vars for production). " +
        "The post will not use a bare /articles/... path.",
    });
  }

  const textIn = [
    `Title: ${article.title}`,
    "",
    "Excerpt:",
    (article.excerpt || "").slice(0, 600),
    "",
    "Body (truncated):",
    (article.body || "").replace(/\s+/g, " ").trim().slice(0, 12_000),
  ].join("\n");

  const captionRaw = (
    await runAgent({
      role: "Worker",
      department: "Marketing / Zernio social",
      task: [
        CAPTION_SYSTEM,
        "",
        "--- ARTICLE ---",
        textIn,
        "",
        "Output ONLY the final post text. No em dash character anywhere. We append the real URL; you may use {{URL}} on one line and we will strip it.",
        "Use line breaks between the four blocks (opener, reader value, you line, soft CTA).",
      ].join("\n"),
    })
  )
    .replace(/\{\{URL\}\}/g, "")
    .trim();
  const caption = stripLongDashesForSocial(captionRaw);

  if (!caption) {
    return finish({ ok: false, error: "Empty caption from model" });
  }

  const content = `${caption}\n\n${publicLink}`.replace(/\n{3,}/g, "\n\n").slice(0, 2_800);
  const title = article.title.slice(0, 200);

  const imageUrl = await absoluteUrlForMedia(article.cover_image_url);
  const mediaItems = imageUrl ? [{ type: "image" as const, url: imageUrl }] : undefined;

  if (options?.dryRun) {
    return {
      ok: true,
      slug: article.slug,
      title: article.title,
      zernioStatus: 0,
      preview: content + (imageUrl ? `\n\n[+ image: ${imageUrl}]` : ""),
    };
  }

  const targets = await resolveZernioPublishTargets();
  if (targets.kind === "error") {
    return finish({ ok: false, error: targets.error });
  }

  const out = await zernioCreatePost(
    targets.kind === "queue"
      ? {
          title,
          content,
          ...(mediaItems ? { mediaItems } : {}),
          queuedFromProfile: targets.profileId,
          isDraft: false,
        }
      : {
          title,
          content,
          ...(mediaItems ? { mediaItems } : {}),
          platforms: targets.platforms,
          publishNow: true,
        },
  );

  if (!out.ok) {
    return finish({ ok: false, error: out.error });
  }

  try {
    await recordMarketingZernioPostNow(supabase);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return finish({
      ok: false,
      error: `Zernio accepted the post but could not save cooldown timestamp: ${msg}`,
    });
  }

  return finish({
    ok: true,
    slug: article.slug,
    title: article.title,
    zernioStatus: out.status,
    preview: content.slice(0, 400),
  });
}
