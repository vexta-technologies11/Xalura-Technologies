import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Read a string env var from `process.env` or Cloudflare Worker `env` (OpenNext ALS).
 * Use bracket lookups at call sites so Next/OpenNext do not strip unknown keys at build.
 */
export async function resolveWorkerEnv(name: string): Promise<string | undefined> {
  const direct = process.env[name]?.trim();
  if (direct) return direct;
  try {
    const { env } = await getCloudflareContext({ async: true });
    const v = (env as Record<string, unknown>)[name];
    if (typeof v === "string" && v.trim()) return v.trim();
  } catch {
    /* try sync */
  }
  try {
    const { env } = getCloudflareContext({ async: false });
    const v = (env as Record<string, unknown>)[name];
    if (typeof v === "string" && v.trim()) return v.trim();
  } catch {
    /* unset */
  }
  return undefined;
}
