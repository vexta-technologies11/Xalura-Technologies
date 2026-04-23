import {
  type ZernioPlatformTarget,
  zernioCreatePost,
} from "@/xalura-agentic/lib/phase7Clients";
import { resolveWorkerEnv } from "@/xalura-agentic/lib/resolveWorkerEnv";

export type ZernioShareResult =
  | { skipped: true; reason: string }
  | { ok: true; status: number }
  | { ok: false; error: string };

async function publicArticleUrl(articlePath: string): Promise<string | null> {
  const base =
    (await resolveWorkerEnv("AGENTIC_PUBLIC_BASE_URL"))?.trim() ||
    (await resolveWorkerEnv("NEXT_PUBLIC_SITE_URL"))?.trim() ||
    process.env["NEXT_PUBLIC_SITE_URL"]?.trim() ||
    process.env["NEXT_PUBLIC_VERCEL_URL"]?.trim();
  if (!base) return null;
  const root = base.replace(/\/$/, "");
  const path = articlePath.startsWith("/") ? articlePath : `/${articlePath}`;
  if (/^https?:\/\//i.test(root)) {
    return `${root}${path}`;
  }
  return `https://${root}${path}`;
}

/**
 * After a successful Supabase article publish — optionally queue or publish to Zernio.
 *
 * Env:
 * - `AGENTIC_ZERNIO_POST_ON_PUBLISH` = `true` | `1` to enable
 * - `ZERNIO_QUEUED_FROM_PROFILE_ID` = profile `_id` from GET /v1/profiles (uses queue), **or**
 * - `ZERNIO_POST_PLATFORMS_JSON` = e.g. `[{"platform":"twitter","accountId":"<account _id>"}]` with immediate `publishNow`
 */
export async function sharePublishedArticleToZernio(params: {
  title: string;
  articlePath: string;
}): Promise<ZernioShareResult> {
  const flag = (await resolveWorkerEnv("AGENTIC_ZERNIO_POST_ON_PUBLISH"))?.trim().toLowerCase();
  if (flag !== "true" && flag !== "1") {
    return { skipped: true, reason: "AGENTIC_ZERNIO_POST_ON_PUBLISH not enabled" };
  }

  const link = await publicArticleUrl(params.articlePath);
  if (!link) {
    return {
      ok: false,
      error:
        "Set AGENTIC_PUBLIC_BASE_URL (recommended on Workers) or NEXT_PUBLIC_SITE_URL so the post can include the article URL.",
    };
  }

  const content = `${params.title}\n\n${link}`.slice(0, 2800);
  const title = params.title.slice(0, 200);

  const queued = (await resolveWorkerEnv("ZERNIO_QUEUED_FROM_PROFILE_ID"))?.trim();
  const rawPlatforms = (await resolveWorkerEnv("ZERNIO_POST_PLATFORMS_JSON"))?.trim();

  let platforms: ZernioPlatformTarget[] | undefined;
  if (rawPlatforms) {
    try {
      const arr = JSON.parse(rawPlatforms) as unknown;
      if (!Array.isArray(arr)) {
        return { ok: false, error: "ZERNIO_POST_PLATFORMS_JSON must be a JSON array" };
      }
      platforms = arr
        .filter(
          (x): x is ZernioPlatformTarget =>
            !!x &&
            typeof x === "object" &&
            typeof (x as ZernioPlatformTarget).platform === "string" &&
            typeof (x as ZernioPlatformTarget).accountId === "string",
        )
        .map((x) => ({
          platform: (x as ZernioPlatformTarget).platform.trim(),
          accountId: (x as ZernioPlatformTarget).accountId.trim(),
        }));
    } catch {
      return { ok: false, error: "Invalid JSON in ZERNIO_POST_PLATFORMS_JSON" };
    }
  }

  if (!queued && !platforms?.length) {
    return {
      ok: false,
      error:
        "Set ZERNIO_QUEUED_FROM_PROFILE_ID (queue) or ZERNIO_POST_PLATFORMS_JSON (immediate publish).",
    };
  }

  const out = await zernioCreatePost(
    queued
      ? { title, content, queuedFromProfile: queued }
      : { title, content, platforms, publishNow: true },
  );

  if (!out.ok) {
    return { ok: false, error: out.error };
  }
  return { ok: true, status: out.status };
}
