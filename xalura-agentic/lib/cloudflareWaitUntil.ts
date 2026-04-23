import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Keep async work alive after the HTTP response on Cloudflare Workers (`waitUntil`).
 * Falls back to fire-and-forget on local Node / when context is unavailable.
 */
export function waitUntilAfterResponse(promise: Promise<unknown>): void {
  void (async () => {
    try {
      const { ctx } = await getCloudflareContext({ async: true });
      ctx.waitUntil(promise);
    } catch {
      void promise;
    }
  })();
}
