import { absoluteUrlForMedia, publicUrlForPath } from "@/lib/resolvePublicSiteOrigin";
import { resolveZernioPublishTargets } from "@/lib/resolveZernioPublishTargets";
import { zernioCreatePost } from "@/xalura-agentic/lib/phase7Clients";
import { resolveWorkerEnv } from "@/xalura-agentic/lib/resolveWorkerEnv";

export type ZernioShareResult =
  | { skipped: true; reason: string }
  | { ok: true; status: number }
  | { ok: false; error: string };

/**
 * After a successful Supabase article publish — optionally queue or publish to Zernio.
 *
 * Env:
 * - `AGENTIC_ZERNIO_POST_ON_PUBLISH` = `true` | `1` to enable
 * Target resolution: `ZERNIO_QUEUED_FROM_PROFILE_ID` (if set) **or** non-empty `ZERNIO_POST_PLATFORMS_JSON` **or** (default) GET /v1/accounts, all active. Set `ZERNIO_POST_ALL_ACTIVE_ACCOUNTS=false` to **disallow** that default and require queue or JSON. Optional `ZERNIO_ACCOUNTS_PROFILE_ID` filters the default “all accounts” list.
 */
export async function sharePublishedArticleToZernio(params: {
  title: string;
  articlePath: string;
  /** Hero image as in `articles.cover_image_url` (Supabase public URL or site path) — optional. */
  coverImageUrl?: string | null;
}): Promise<ZernioShareResult> {
  const flag = (await resolveWorkerEnv("AGENTIC_ZERNIO_POST_ON_PUBLISH"))?.trim().toLowerCase();
  if (flag !== "true" && flag !== "1") {
    return { skipped: true, reason: "AGENTIC_ZERNIO_POST_ON_PUBLISH not enabled" };
  }

  const link = await publicUrlForPath(params.articlePath);
  if (!link) {
    return {
      ok: false,
      error:
        "Set AGENTIC_PUBLIC_BASE_URL, NEXT_PUBLIC_SITE_URL, or AGENTIC_CRON_BASE_URL to your public https origin (e.g. https://www.xaluratech.com) so the Zernio post can include a full article URL.",
    };
  }

  const content = `${params.title}\n\n${link}`.slice(0, 2800);
  const title = params.title.slice(0, 200);

  const imageUrl = await absoluteUrlForMedia(params.coverImageUrl);
  const mediaItems = imageUrl ? [{ type: "image" as const, url: imageUrl }] : undefined;

  const targets = await resolveZernioPublishTargets();
  if (targets.kind === "error") {
    return { ok: false, error: targets.error };
  }

  const out = await zernioCreatePost(
    targets.kind === "queue"
      ? { title, content, ...(mediaItems ? { mediaItems } : {}), queuedFromProfile: targets.profileId }
      : { title, content, ...(mediaItems ? { mediaItems } : {}), platforms: targets.platforms, publishNow: true },
  );

  if (!out.ok) {
    return { ok: false, error: out.error };
  }
  return { ok: true, status: out.status };
}
