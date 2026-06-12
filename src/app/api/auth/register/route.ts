import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, generateEmailToken } from "@/lib/auth";
import { badRequest, created } from "@/lib/api";
import { sendEmail, verificationEmailHtml } from "@/lib/email";

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

    const { name, email, password, initialBalance, currency, plan } = await req.json();

    if (!name || !email || !password || !plan) {
      return badRequest("Tous les champs sont requis");
    }

    if (!["free", "premium"].includes(plan)) {
      return badRequest("Plan invalide");
    }

    if (password.length < 8) {
      return badRequest("Le mot de passe doit contenir au moins 8 caractères");
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return badRequest("Cet email est déjà utilisé");
    }

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        plan,
        status: "inactive",
        initialBalance: initialBalance || 0,
        currency: currency || "auto",
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

    return created({
      message: "Inscription réussie. Vérifiez votre email pour confirmer votre compte.",
      user: { id: user.id, name: user.name, email: user.email, plan },
    });
  } catch (error) {
    console.error("Register error:", error);
    return badRequest("Erreur lors de l'inscription");
  }
}
