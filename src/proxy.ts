import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/auth";

const APP_DOMAIN = "app.akwetche.app";
const publicPaths = [
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/verify-email",
  "/api/auth/resend-verification",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/reset-password",
  "/login/forgot-password",
  "/api/payments/webhook",
  "/api/seed",
  "/_next",
  "/favicon.ico",
];

function isAppDomain(request: NextRequest): boolean {
  return request.headers.get("host")?.includes(APP_DOMAIN) ?? false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rediriger les dashboard routes du domaine principal vers app.*
  if (!isAppDomain(request) && !publicPaths.some((p) => pathname.startsWith(p)) && pathname !== "/") {
    const appUrl = new URL(pathname, `https://${APP_DOMAIN}`);
    return NextResponse.redirect(appUrl);
  }

  // Sur app.akwetche.app : afficher le dashboard à la racine
  if (isAppDomain(request) && pathname === "/") {
    return NextResponse.rewrite(new URL("/dashboard", request.url));
  }

  const isPublic = publicPaths.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  // Landing page sur le domaine principal
  if (pathname === "/") return NextResponse.next();

  const token = request.cookies.get("token")?.value;
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.png$).*)"],
};
