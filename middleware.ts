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
  matcher: ["/admin/:path*", "/login"],
};
