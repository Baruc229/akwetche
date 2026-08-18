import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateEmailToken } from "@/lib/auth";
import { badRequest, ok } from "@/lib/api";
import { sendEmail, resetPasswordEmailHtml } from "@/lib/email";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 3;
const RATE_WINDOW = 15 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(ip)) {
      return badRequest("Trop de demandes. Réessayez dans 15 minutes.");
    }

    const { email } = await req.json();
    if (!email) return badRequest("Email requis");

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return ok({ message: "Si cet email existe, un lien de réinitialisation a été envoyé." });

    const token = generateEmailToken();
    await prisma.verificationToken.create({
      data: {
        token,
        type: "password_reset",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        userId: user.id,
      },
    });

    await sendEmail({
      to: email,
      subject: "Réinitialisation de mot de passe — Akwetche",
      html: resetPasswordEmailHtml(token),
    });

    return ok({ message: "Si cet email existe, un lien de réinitialisation a été envoyé." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return badRequest("Erreur lors de l'envoi de l'email");
  }
}
