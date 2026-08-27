import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Uses the Edge-safe config (no Credentials provider, no bcrypt/Prisma)
// rather than importing @/auth directly — see auth.config.ts.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  const isSuperAdminRoute = nextUrl.pathname.startsWith("/super-admin");
  const isAppRoute = nextUrl.pathname.startsWith("/app");

  if (!isLoggedIn && (isSuperAdminRoute || isAppRoute)) {
    const redirectUrl = new URL("/login", nextUrl);
    redirectUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // A Super Admin session has no schoolId and should never see the school
  // portal; a school-portal session should never reach Super Admin routes.
  if (isLoggedIn && isSuperAdminRoute && role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/app/dashboard", nextUrl));
  }

  if (isLoggedIn && isAppRoute && role === "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/super-admin/dashboard", nextUrl));
  }

  // Expose the current pathname to Server Components (app/app/layout.tsx uses
  // it for per-module activity logging) — RSC layouts don't receive it directly.
  // Skip prefetch requests (Link hover/viewport prefetch) so they don't
  // inflate module-usage counts with pages the user never actually opened.
  const isPrefetch = req.headers.get("next-router-prefetch") || req.headers.get("purpose") === "prefetch";
  if (isAppRoute && !isPrefetch) {
    const headers = new Headers(req.headers);
    headers.set("x-pathname", nextUrl.pathname);
    return NextResponse.next({ request: { headers } });
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/app/:path*", "/super-admin/:path*"],
};
