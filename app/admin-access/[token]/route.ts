import { NextResponse } from "next/server";
import { generateAdminCookie, generateAdminFlagCookie } from "@/lib/adminAccess";

/**
 * Secret admin login URL.
 *
 * Visit: /admin-access/<ADMIN_SECRET_ACCESS_KEY>
 * This sets a signed admin cookie (valid 7 days) and redirects to /admin.
 *
 * The ADMIN_SECRET_ACCESS_KEY must be set in environment variables.
 * If the token doesn't match, redirects to home with an error flag.
 */

export function GET(
  _request: Request,
  { params }: { params: { token: string } },
) {
  const secret = process.env.ADMIN_SECRET_ACCESS_KEY?.trim();

  // If no secret configured, redirect to home
  if (!secret) {
    return NextResponse.redirect(
      new URL("/?error=admin-not-configured", _request.url),
    );
  }

  const { token } = params;

  if (token !== secret) {
    // Invalid token — redirect to home
    return NextResponse.redirect(
      new URL("/?error=invalid-admin-token", _request.url),
    );
  }

  // Valid token — set admin cookies and redirect to /admin
  const response = NextResponse.redirect(new URL("/admin", _request.url));

  const adminCookie = generateAdminCookie();
  response.cookies.set(adminCookie);

  const flagCookie = generateAdminFlagCookie();
  response.cookies.set(flagCookie);

  return response;
}
