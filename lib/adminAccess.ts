import { createHash } from "crypto";
import { cookies } from "next/headers";

/**
 * Admin access via secret URL.
 *
 * Two ways to authenticate as admin:
 * 1. Supabase session (existing) — managed via middleware
 * 2. Secret token URL (/admin-access/<TOKEN>) — sets a signed cookie
 *
 * The secret token is configured via ADMIN_SECRET_ACCESS_KEY env var.
 * If not set, falls back to Supabase-only auth.
 */

const ADMIN_COOKIE_NAME = "xalura_admin_token";
const ADMIN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

/**
 * Get the admin secret from environment.
 */
function getAdminSecret(): string | null {
  const secret = process.env.ADMIN_SECRET_ACCESS_KEY?.trim();
  return secret || null;
}

/**
 * Sign an admin token (HMAC-based).
 */
function signAdminToken(value: string, secret: string): string {
  const payload = `${value}|${secret}`;
  return createHash("sha256").update(payload).digest("hex").slice(0, 24);
}

/**
 * Check if the request has a valid admin cookie.
 * Used by middleware and server-side API routes.
 */
export async function isAdminFromCookies(): Promise<boolean> {
  try {
    const cookieStore = cookies();
    const cookie = cookieStore.get(ADMIN_COOKIE_NAME);
    if (!cookie?.value) return false;

    const secret = getAdminSecret();
    if (!secret) return false;

    const parts = cookie.value.split(".");
    if (parts.length !== 2) return false;

    const [token, sig] = parts;
    const expectedSig = signAdminToken(token, secret);
    return sig === expectedSig && token === secret;
  } catch {
    return false;
  }
}

/**
 * Check admin status from a Request's cookie header (for edge/API routes).
 */
export function isAdminFromRequestCookie(request: Request): boolean {
  const cookieHeader = request.headers.get("cookie") || "";
  const secret = getAdminSecret();
  if (!secret) return false;

  const match = cookieHeader.match(
    new RegExp(`${ADMIN_COOKIE_NAME}=([^;]+)`),
  );
  if (!match) return false;

  const parts = match[1].split(".");
  if (parts.length !== 2) return false;

  const [token, sig] = parts;
  const expectedSig = signAdminToken(token, secret);
  return sig === expectedSig && token === secret;
}

/**
 * Generate the admin cookie value and set-cookie header.
 */
export function generateAdminCookie(): { name: string; value: string; maxAge: number; path: string; httpOnly: boolean; sameSite: "lax" } {
  const secret = getAdminSecret();
  if (!secret) throw new Error("ADMIN_SECRET_ACCESS_KEY not set");

  const sig = signAdminToken(secret, secret);
  const cookieValue = `${secret}.${sig}`;

  return {
    name: ADMIN_COOKIE_NAME,
    value: cookieValue,
    maxAge: ADMIN_COOKIE_MAX_AGE,
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
  };
}

/**
 * Get admin check cookie for client-side detection.
 * This is a non-httpOnly flag cookie so client JS can read it.
 */
export function generateAdminFlagCookie(): { name: string; value: string; maxAge: number; path: string; sameSite: "lax" } {
  return {
    name: "xalura_is_admin",
    value: "1",
    maxAge: ADMIN_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax" as const,
  };
}

/**
 * Clear the admin cookies (sign out).
 */
export function clearAdminCookies(): { name: string; value: string; maxAge: number; path: string }[] {
  return [
    { name: ADMIN_COOKIE_NAME, value: "", maxAge: 0, path: "/" },
    { name: "xalura_is_admin", value: "", maxAge: 0, path: "/" },
  ];
}
