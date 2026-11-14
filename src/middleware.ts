// src/middleware.ts
// Next.js Edge Middleware for Route Protection and Session Verification

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { sessionSecret } from "@/lib/session-config";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/health"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static files and internal Next.js requests bypass middleware
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("campus_session")?.value;

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path))) {
    // If user is already authenticated and visits /login, redirect to /dashboard
    if (token && pathname === "/login") {
      try {
        await jwtVerify(token, sessionSecret(), { algorithms: ["HS256"] });
        return NextResponse.redirect(new URL("/dashboard", request.url));
      } catch {
        // Invalid token, proceed to login
      }
    }
    return NextResponse.next();
  }

  // All other routes require valid session token
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: { message: "Authentication required", code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ["HS256"] });
    const userRole = (payload as any).role;

    // Admin-only path guard
    if ((pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) && userRole !== "ADMIN") {
      if (pathname.startsWith("/api/admin")) {
        return NextResponse.json(
          { error: { message: "Administrator role required", code: "FORBIDDEN" } },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  } catch (error) {
    // Token verification failed / expired
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: { message: "Session expired or invalid", code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("campus_session");
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
