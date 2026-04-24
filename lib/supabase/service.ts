import { createClient } from "@supabase/supabase-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * OpenNext on Cloudflare often binds secrets to Worker `env`, not `process.env`.
 * Use this for server-side reads that must work on the deployed Worker.
 */
export function readEnvSync(name: string): string | undefined {
  const fromProcess = process.env[name]?.trim();
  if (fromProcess) return fromProcess;
  try {
    const { env } = getCloudflareContext({ async: false });
    const v = (env as Record<string, unknown>)[name];
    if (typeof v === "string" && v.trim()) return v.trim();
  } catch {
    /* Not a Cloudflare request context (local Node, tests, etc.). */
  }
  return undefined;
}

/** Server-only client for routes that must bypass RLS (e.g. agent ingest). */
export function createServiceClient() {
  const url = readEnvSync("NEXT_PUBLIC_SUPABASE_URL");
  const key = readEnvSync("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    return null;
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
