import { NextRequest, NextResponse } from "next/server";
import { decodeSessionToken } from "@/lib/session-token";

const SESSION_COOKIE = "omnishelf_session";

export function proxy(request: NextRequest) {
  const session = decodeSessionToken(
    request.cookies.get(SESSION_COOKIE)?.value ?? "",
    process.env.SESSION_SECRET ?? (process.env.NODE_ENV === "production" ? undefined : "dev-secret-change-me-in-prod"),
    process.env.NODE_ENV === "production"
  );
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");

  if (!session) {
    return NextResponse.redirect(new URL("/login?error=Forbidden", request.url));
  }

  if (isAdminRoute && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/vendor", request.url));
  }

  if (!isAdminRoute && session.role === "ADMIN") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/vendor/:path*"],
};