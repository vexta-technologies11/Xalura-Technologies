import { readEnvSync } from "@/lib/supabase/service";
import { resolveWorkerEnv } from "@/xalura-agentic/lib/resolveWorkerEnv";

const ORIGIN_ENVS = [
  "AGENTIC_PUBLIC_BASE_URL",
  "NEXT_PUBLIC_SITE_URL",
  /** Same public origin as cron / Worker health; many Cloudflare deploys set this. */
  "AGENTIC_CRON_BASE_URL",
] as const;

/**
 * Returns `https://host` (no path) from a raw env value.
 */
function originFromEnvValue(raw: string): string | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  try {
    const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`;
    const u = new URL(withScheme);
    if (!u.hostname) return undefined;
    return u.origin;
  } catch {
    return undefined;
  }
}

/**
 * Resolves the canonical public site origin for absolute links (Zernio, email, etc.).
 * Checks Worker bindings, `readEnvSync`, `process.env`, then common host-only vars
 * (Vercel, Cloudflare Pages) so local + CI + production behave predictably.
 */
export async function resolvePublicSiteOrigin(): Promise<string | undefined> {
  for (const name of ORIGIN_ENVS) {
    const v = (await resolveWorkerEnv(name))?.trim();
    const o = v ? originFromEnvValue(v) : undefined;
    if (o) return o;
  }
  for (const name of ORIGIN_ENVS) {
    const v = readEnvSync(name)?.trim();
    const o = v ? originFromEnvValue(v) : undefined;
    if (o) return o;
  }
  for (const name of ORIGIN_ENVS) {
    const v = process.env[name]?.trim();
    const o = v ? originFromEnvValue(v) : undefined;
    if (o) return o;
  }

  const vercel = process.env["VERCEL_URL"]?.trim();
  if (vercel) {
    const o = originFromEnvValue(vercel.startsWith("http") ? vercel : `https://${vercel}`);
    if (o) return o;
  }
  const nextVercel = process.env["NEXT_PUBLIC_VERCEL_URL"]?.trim();
  if (nextVercel) {
    const o = originFromEnvValue(
      nextVercel.startsWith("http") ? nextVercel : `https://${nextVercel}`,
    );
    if (o) return o;
  }
  const cf =
    process.env["CF_PAGES_URL"]?.trim() || process.env["CF_CUSTOM_DOMAIN"]?.trim();
  if (cf) {
    const o = originFromEnvValue(cf);
    if (o) return o;
  }
  return undefined;
}

/**
 * Full `https` URL for a site path, or `null` if no public origin is configured.
 */
export async function publicUrlForPath(path: string): Promise<string | null> {
  const base = await resolvePublicSiteOrigin();
  if (!base) return null;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base.replace(/\/$/, "")}${p}`;
}

/**
 * Absolute `https` URL for an article hero or other public media. Zernio fetches the URL server-side; it must be publicly reachable.
 * - Full `http`/`https` URLs: normalized to `https` when the string used `http`.
 * - Path-style (`/...`): joined with the resolved public site origin.
 */
export async function absoluteUrlForMedia(raw: string | null | undefined): Promise<string | null> {
  const t = raw?.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) {
    try {
      const u = new URL(t);
      u.protocol = "https:";
      return u.toString();
    } catch {
      return null;
    }
  }
  if (t.startsWith("/")) {
    return publicUrlForPath(t);
  }
  return null;
}
