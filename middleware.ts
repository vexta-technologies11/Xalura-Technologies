import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Skip auth check for static assets, API health, and Next.js internals
const SKIP_AUTH_PATTERNS = [
  /^\/_next\//,
  /^\/api\/health/,
  /^\/favicon/,
  /^\/icon\./,
  /^\/apple-icon/,
  /^\/robots\.txt/,
];

/**
 * Simple HMAC-SHA256 verification using Web Crypto API (edge-compatible).
 */
async function verifyAdminCookie(value: string, secret: string): Promise<boolean> {
  try {
    const parts = value.split(".");
  if (parts.length !== 2) return false;
  const [token, sig] = parts;
  if (token !== secret) return false;

    // Use Web Crypto API (works in Edge Runtime)
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(`${token}|${secret}`);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
        );
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
    const hexSig = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 24);

    return sig === hexSig;
  } catch {
    return false;
  }
}

/**
 * Check if the request has a valid admin access cookie.
 * Reads the raw cookie from the request header.
 */
async function hasAdminCookie(request: NextRequest): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET_ACCESS_KEY?.trim();
  if (!secret) return false;

  const cookie = request.cookies.get("xalura_admin_token");
  if (!cookie?.value) return false;

  return verifyAdminCookie(cookie.value, secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth for static assets to reduce Supabase load
  if (SKIP_AUTH_PATTERNS.some((p) => p.test(pathname))) {
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  // Check admin cookie first (faster than Supabase auth)
  const isAdminByCookie = await hasAdminCookie(request);

  if (isAdminByCookie) {
    // Admin cookie is valid — allow access
  return supabaseResponse;
}

  // Fall back to Supabase auth check
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
        Object.entries(headers).forEach(([k, v]) =>
          supabaseResponse.headers.set(k, v)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname.startsWith("/admin") && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname === "/login" && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/admin/:path*", "/login", "/admin-access/:path*"],
};

