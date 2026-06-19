import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, generateToken } from "./lib/auth";

const MAIN_DOMAIN = "akwetche.com";
const APP_DOMAIN = "app.akwetche.app";
const SECURE = process.env.NODE_ENV === "production";

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

function slideSession(request: NextRequest, response: NextResponse): NextResponse {
  const token = request.cookies.get("token")?.value;
  const payload = token ? verifyToken(token) : null;
  if (payload) {
    const newToken = generateToken(payload.userId);
    response.cookies.set("token", newToken, {
      httpOnly: true,
      secure: SECURE,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });
  }
  return response;
}

function isPublicPath(pathname: string): boolean {
  return publicPaths.some((p) => pathname.startsWith(p));
}

function isGuestPage(pathname: string): boolean {
  return pathname === "/" || pathname === "/login" || pathname === "/register";
}

function getUserPayload(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

function redirectToDashboard(request: NextRequest): NextResponse {
  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  return slideSession(request, response);
}

function redirectToLogin(request: NextRequest, pathname: string): NextResponse {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

export function proxy(request: NextRequest) {
  const host = getHost(request);
  const { pathname } = request.nextUrl;

  // --- app.akwetche.app : dashboard à la racine ---
  if (host.includes(APP_DOMAIN)) {
    if (pathname === "/") {
      return slideSession(request, NextResponse.rewrite(new URL("/dashboard", request.url)));
    }
    return handleAuth(request, pathname);
  }

  // --- akwetche.com : landing + redirection vers app ---
  if (host.includes(MAIN_DOMAIN)) {
    if (pathname === "/") return NextResponse.next();
    if (!isPublicPath(pathname)) {
      return NextResponse.redirect(new URL(pathname, `https://${APP_DOMAIN}`));
    }
    return NextResponse.next();
  }

  // --- Domaine inconnu (Vercel default, preview, etc.) : comportement normal ---
  return handleAuth(request, pathname);
}

function handleAuth(request: NextRequest, pathname: string) {
  const payload = getUserPayload(request);

  // --- Utilisateur connecté ---
  if (payload) {
    // Rediriger les pages publiques invité vers le dashboard
    if (isGuestPage(pathname)) {
      return redirectToDashboard(request);
    }

    // Route protégée : servir normalement avec glissement de session
    const response = NextResponse.next();
    return slideSession(request, response);
  }

  // --- Utilisateur non connecté ---
  // Pages publiques et racine : accès autorisé
  if (isPublicPath(pathname) || pathname === "/") {
    return NextResponse.next();
  }

  // Routes API protégées
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Pages protégées : rediriger vers login
  return redirectToLogin(request, pathname);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.png$).*)"],
};
