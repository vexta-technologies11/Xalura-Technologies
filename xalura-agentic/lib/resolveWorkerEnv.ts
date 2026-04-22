import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Worker virtual module — present in workerd; ignored by webpack in Next.js builds. */
async function bindingFromCloudflareWorkers(
  name: string,
): Promise<string | undefined> {
  try {
    const m = await import(
      /* webpackIgnore: true */
      "cloudflare:workers"
    );
    const env = (m as { env?: Record<string, unknown> }).env;
    if (!env || typeof env !== "object") return undefined;
    const v = env[name];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Read a string env var from `process.env` or Cloudflare Worker `env` (OpenNext ALS).
 * Use bracket lookups at call sites so Next/OpenNext do not strip unknown keys at build.
 */
export async function resolveWorkerEnv(name: string): Promise<string | undefined> {
  const direct = process.env[name]?.trim();
  if (direct) return direct;
  const fromWorkersModule = await bindingFromCloudflareWorkers(name);
  if (fromWorkersModule) return fromWorkersModule;
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
