import { createClient, type VercelKV } from "@vercel/kv";

/**
 * Resolve Upstash REST credentials for @vercel/kv.
 * Vercel's default integration uses KV_REST_*; Marketplace / custom prefix may use
 * UPSTASH_REDIS_REST_* or STORAGE_KV_REST_* / STORAGE_URL + token.
 */
function resolveAgentKvRestCredentials(): { url: string; token: string } | null {
  const t = (s: string | undefined) => s?.trim() ?? "";
  const pairs: Array<[string, string]> = [
    [t(process.env.KV_REST_API_URL), t(process.env.KV_REST_API_TOKEN)],
    [t(process.env.UPSTASH_REDIS_REST_URL), t(process.env.UPSTASH_REDIS_REST_TOKEN)],
    [t(process.env.STORAGE_KV_REST_API_URL), t(process.env.STORAGE_KV_REST_API_TOKEN)],
    [t(process.env.STORAGE_URL), t(process.env.STORAGE_KV_REST_API_TOKEN)],
    [t(process.env.STORAGE_URL), t(process.env.STORAGE_KV_REST_TOKEN)],
    [t(process.env.STORAGE_URL), t(process.env.STORAGE_TOKEN)],
  ];
  for (const [url, token] of pairs) {
    if (!url || !token) continue;
    if (!url.startsWith("https://")) continue;
    return { url, token };
  }
  return null;
}

export function isAgentKvConfigured(): boolean {
  return resolveAgentKvRestCredentials() !== null;
}

let _client: VercelKV | null = null;

export function getAgentKv(): VercelKV {
  if (_client) return _client;
  const creds = resolveAgentKvRestCredentials();
  if (!creds) {
    throw new Error(
      "Agent KV: missing REST credentials. Set KV_REST_API_URL and KV_REST_API_TOKEN, or Upstash STORAGE_/UPSTASH_ equivalents (https URL + token).",
    );
  }
  _client = createClient({ url: creds.url, token: creds.token });
  return _client;
}

/** Same API as `import { kv } from '@vercel/kv'` but honors multiple env naming conventions. */
export const kv = new Proxy({} as VercelKV, {
  get(_target, prop, receiver) {
    return Reflect.get(getAgentKv(), prop, receiver);
  },
});
