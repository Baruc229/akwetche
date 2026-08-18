import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId, generateEmailToken } from "@/lib/auth";
import { unauthorized, badRequest, ok } from "@/lib/api";
import { sendEmail, verificationEmailHtml } from "@/lib/email";

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
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  if (!checkRateLimit(ip)) {
    return badRequest("Trop de demandes. Réessayez dans 15 minutes.");
  }

  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return unauthorized();

  if (user.emailVerified) {
    return ok({ message: "Email déjà vérifié" });
  }

  await prisma.verificationToken.deleteMany({
    where: { userId, type: "email_verification" },
  });

  const token = generateEmailToken();
  await prisma.verificationToken.create({
    data: {
      token,
      type: "email_verification",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      userId,
    },
  });

  await sendEmail({
    to: user.email,
    subject: "Confirmez votre email — Akwetche",
    html: verificationEmailHtml(token),
  });

  return ok({ message: "Email de vérification renvoyé" });
}
