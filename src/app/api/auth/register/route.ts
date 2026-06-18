import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, generateEmailToken, generateToken } from "@/lib/auth";
import { badRequest, created } from "@/lib/api";
import { sendEmail, verificationEmailHtml } from "@/lib/email";
import { cookies } from "next/headers";
import { getCountryByCode, getCurrencyForCountry, validatePhone, ALLOWED_COUNTRY_CODES } from "@/lib/currency";

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

    const { name, email, password, initialBalance, countryCode, phone, plan } = await req.json();

    if (!name || !email || !password || !plan || !countryCode) {
      return badRequest("Tous les champs sont requis (nom, email, mot de passe, pays, plan)");
    }

    if (!["free", "premium"].includes(plan)) {
      return badRequest("Plan invalide");
    }

    if (!ALLOWED_COUNTRY_CODES.includes(countryCode)) {
      return badRequest("Ce pays n'est pas encore supporté. Pays autorisés : Bénin, Togo, Burkina Faso, Côte d'Ivoire, France, Belgique.");
    }

    if (phone && !validatePhone(countryCode, phone)) {
      const country = getCountryByCode(countryCode);
      return badRequest(`Format de téléphone invalide pour ${country?.name}. Exemple : ${country?.phoneExample}`);
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
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        plan,
        status: "inactive",
        initialBalance: initialBalance || 0,
        countryCode,
        phone: phone || null,
        baseCurrency,
        currency: baseCurrency,
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
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return created({
      message: "Inscription réussie. Vérifiez votre email pour confirmer votre compte.",
      user: { id: user.id, name: user.name, email: user.email, plan },
    });
  } catch (error) {
    console.error("Register error:", error);
    return badRequest("Erreur lors de l'inscription");
  }
}
