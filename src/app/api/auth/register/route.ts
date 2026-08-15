import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, generateEmailToken, generateToken } from "@/lib/auth";
import { badRequest, created } from "@/lib/api";
import { sendEmail, verificationEmailHtml } from "@/lib/email";
import { cookies } from "next/headers";
import { getCountryByCode, getCurrencyForCountry, validatePhone, validatePhoneMessage, validateName, ALLOWED_COUNTRY_CODES } from "@/lib/currency";

const registerAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 3;
const RATE_WINDOW = 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = registerAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    registerAttempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of registerAttempts) {
    if (now > entry.resetAt) registerAttempts.delete(ip);
  }
}, 60 * 1000);

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(ip)) {
      return badRequest("Trop de tentatives. Réessayez dans une minute.");
    }

    const { name, email, password, initialBalance, countryCode, phone, tontineEnabled, recoitCommissions, commissionScopeDefault } = await req.json();

    if (!name || !email || !password || !countryCode || !phone) {
      return badRequest("Tous les champs sont requis (nom, email, mot de passe, pays, téléphone)");
    }

    if (!ALLOWED_COUNTRY_CODES.includes(countryCode)) {
      return badRequest("Ce pays n'est pas encore supporté. Pays autorisés : Bénin, Togo, Burkina Faso, Côte d'Ivoire, France, Belgique.");
    }

    const nameErr = validateName(name);
    if (nameErr) return badRequest(nameErr);

    if (!validatePhone(countryCode, phone)) {
      const phoneErr = validatePhoneMessage(countryCode, phone);
      return badRequest(phoneErr || `Format de téléphone invalide pour ${getCountryByCode(countryCode)?.name}.`);
    }

    if (password.length < 8) {
      return badRequest("Le mot de passe doit contenir au moins 8 caractères");
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return badRequest("Cet email est déjà utilisé");
    }

    const baseCurrency = getCurrencyForCountry(countryCode);

    const hashed = await hashPassword(password);
    // Un compte créé à l'inscription est TOUJOURS gratuit : le plan Premium
    // ne peut être accordé que par le système de paiement (activatePremium).
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        plan: "free",
        status: "inactive",
        initialBalance: initialBalance || 0,
        countryCode,
        phone,
        baseCurrency,
        currency: baseCurrency,
        tontineAccess: Boolean(tontineEnabled),
        recoitCommissions: recoitCommissions === undefined ? true : Boolean(recoitCommissions),
        commissionScopeDefault: commissionScopeDefault === "activite" ? "activite" : "personnel",
      },
    });

    const token = generateEmailToken();
    await prisma.verificationToken.create({
      data: {
        token,
        type: "email_verification",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        userId: user.id,
      },
    });

    await sendEmail({
      to: email,
      subject: "Confirmez votre email — Akwetche",
      html: verificationEmailHtml(token),
    });

    const jwt = generateToken(user.id);
    const cookieStore = await cookies();
    cookieStore.set("token", jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    // Crée la session côté serveur : nécessaire pour que getAuthUserId valide le jeton.
    await prisma.session.create({
      data: { token: jwt, userId: user.id, ipAddress: ip, userAgent: "" },
    });

    return created({
      message: "Inscription réussie. Vérifiez votre email pour confirmer votre compte.",
      user: { id: user.id, name: user.name, email: user.email, plan: "free" },
    });
  } catch (error) {
    console.error("Register error:", error);
    return badRequest("Erreur lors de l'inscription");
  }
}
