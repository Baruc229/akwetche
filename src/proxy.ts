import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/auth";

const MAIN_DOMAIN = "akwetche.com";
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

function getHost(request: NextRequest): string {
  return request.headers.get("host") ?? "";
}

export function proxy(request: NextRequest) {
  const host = getHost(request);
  const { pathname } = request.nextUrl;

  // --- app.akwetche.app : dashboard à la racine ---
  if (host.includes(APP_DOMAIN)) {
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/dashboard", request.url));
    }
    // Comportement normal pour les autres routes (login, etc.)
    return handleAuth(request, pathname);
  }

  // --- akwetche.com : landing + redirection vers app ---
  if (host.includes(MAIN_DOMAIN)) {
    if (pathname === "/") return NextResponse.next();
    if (!publicPaths.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL(pathname, `https://${APP_DOMAIN}`));
    }
    return NextResponse.next();
  }

  // --- Domaine inconnu (Vercel default, preview, etc.) : comportement normal ---
  return handleAuth(request, pathname);
}

function handleAuth(request: NextRequest, pathname: string) {
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

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
