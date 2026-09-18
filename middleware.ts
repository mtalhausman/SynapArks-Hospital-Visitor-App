import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Allow public access to the login page, API endpoints, Next.js internal paths, and static assets
  if (
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check for staff authentication session cookies
  const sessionCookie =
    request.cookies.get("synapark_session")?.value ||
    request.cookies.get("auth_token")?.value ||
    request.cookies.get("session")?.value;

  // Protect all /admin routes if no session cookie exists
  if (!sessionCookie && pathname.startsWith("/admin")) {
    const loginUrl = new URL("/admin/login", request.url);
    const fullCallback = `${pathname}${search || ""}`;
    loginUrl.searchParams.set("callbackUrl", fullCallback);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
