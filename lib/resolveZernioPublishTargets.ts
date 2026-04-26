import {
  type ZernioPlatformTarget,
  zernioListActiveAccountTargets,
} from "@/xalura-agentic/lib/phase7Clients";
import { resolveWorkerEnv } from "@/xalura-agentic/lib/resolveWorkerEnv";

export type ZernioPublishTargetResolution =
  | { kind: "queue"; profileId: string }
  | { kind: "platforms"; platforms: ZernioPlatformTarget[] }
  | { kind: "error"; error: string };

/**
 * Resolves how to send a Zernio post.
 *
 * Order:
 * 1. `ZERNIO_QUEUED_FROM_PROFILE_ID` — queue path (wins if set).
 * 2. `ZERNIO_POST_PLATFORMS_JSON` — explicit `platforms` when non-empty.
 * 3. **Default:** GET /v1/accounts and post to every **active** account (no extra env).
 * 4. If `ZERNIO_POST_ALL_ACTIVE_ACCOUNTS` is `false` | `0` | `no`, the default in (3) is **off**; then
 *    you must set queue or JSON (avoids surprise posts when you wanted to force explicit config only).
 */
export async function resolveZernioPublishTargets(): Promise<ZernioPublishTargetResolution> {
  const allF = (await resolveWorkerEnv("ZERNIO_POST_ALL_ACTIVE_ACCOUNTS"))?.trim().toLowerCase();
  const autoAllDisabled = allF === "false" || allF === "0" || allF === "no";

  const queued = (await resolveWorkerEnv("ZERNIO_QUEUED_FROM_PROFILE_ID"))?.trim();
  if (queued) {
    return { kind: "queue", profileId: queued };
  }

  const raw = (await resolveWorkerEnv("ZERNIO_POST_PLATFORMS_JSON"))?.trim();
  if (raw) {
    try {
      const arr = JSON.parse(raw) as unknown;
      if (!Array.isArray(arr)) {
        return { kind: "error", error: "ZERNIO_POST_PLATFORMS_JSON must be a JSON array" };
      }
      const platforms = arr
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
      if (platforms.length) {
        return { kind: "platforms", platforms };
      }
    } catch {
      return { kind: "error", error: "Invalid JSON in ZERNIO_POST_PLATFORMS_JSON" };
    }
  }

  if (autoAllDisabled) {
    return {
      kind: "error",
      error:
        "ZERNIO_POST_ALL_ACTIVE_ACCOUNTS disables the default (post to all active accounts). " +
        "Set ZERNIO_QUEUED_FROM_PROFILE_ID, or a non-empty ZERNIO_POST_PLATFORMS_JSON, " +
        "or remove / set ZERNIO_POST_ALL_ACTIVE_ACCOUNTS=1 to allow the default.",
    };
  }

  const profileId = (await resolveWorkerEnv("ZERNIO_ACCOUNTS_PROFILE_ID"))?.trim() || undefined;
  const { platforms, error } = await zernioListActiveAccountTargets(
    profileId ? { profileId } : undefined,
  );
  if (error) {
    return { kind: "error", error };
  }
  if (!platforms.length) {
    return {
      kind: "error",
      error:
        "No active Zernio accounts returned from GET /v1/accounts. " +
        "Connect social accounts in the Zernio dashboard, or set ZERNIO_POST_PLATFORMS_JSON, " +
        "or ZERNIO_QUEUED_FROM_PROFILE_ID. Optional: ZERNIO_ACCOUNTS_PROFILE_ID if accounts are under a specific profile.",
    };
  }
  return { kind: "platforms", platforms };
}
