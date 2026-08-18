import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId, comparePassword, generateEmailToken } from "@/lib/auth";
import { unauthorized, badRequest, ok } from "@/lib/api";
import { sendEmail, verificationEmailHtml } from "@/lib/email";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 3;
const RATE_WINDOW = 15 * 60 * 1000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) return unauthorized();

    if (!checkRateLimit(`change-email:${userId}`)) {
      return badRequest("Trop de tentatives. Réessayez dans 15 minutes.");
    }

    const { currentPassword, newEmail } = await req.json();

    if (!currentPassword || !newEmail) {
      return badRequest("Tous les champs sont requis");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return badRequest("Adresse email invalide");
    }

    const existing = await prisma.user.findUnique({ where: { email: newEmail } });
    if (existing && existing.id !== userId) {
      return badRequest("Cet email est déjà utilisé par un autre compte");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return unauthorized();

    const valid = await comparePassword(currentPassword, user.password);
    if (!valid) {
      return badRequest("Mot de passe actuel incorrect");
    }

    const token = generateEmailToken();
    await prisma.verificationToken.create({
      data: {
        token,
        type: "email_change",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        userId: user.id,
      },
    });

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verificationUrl = `${APP_URL}/api/auth/verify-email?token=${token}&type=email_change&newEmail=${encodeURIComponent(newEmail)}`;

    await sendEmail({
      to: newEmail,
      subject: "Confirmez votre nouvel email — Akwetche",
      html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 20px">
<tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:linear-gradient(135deg,#1B3A6B,#142D54);padding:32px 24px;text-align:center">
<h1 style="color:#fff;font-size:24px;margin:0;font-weight:700">Akwetche</h1>
</td></tr>
<tr><td style="padding:32px 24px">
<h2 style="color:#1c1917;font-size:20px;margin:0 0 16px">Confirmez votre nouvel email</h2>
<p style="color:#57534e;font-size:14px;line-height:1.6;margin:0 0 24px">
  Vous avez demandé à changer votre adresse email. Cliquez sur le bouton ci-dessous pour confirmer :
</p>
<a href="${verificationUrl}" style="display:inline-block;background:#1B3A6B;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
  Confirmer mon nouvel email
</a>
<p style="color:#a8a29e;font-size:12px;margin:24px 0 0">Ce lien expire dans 24 heures.</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`,
    });

    return ok({ message: "Un email de confirmation a été envoyé à votre nouvelle adresse." });
  } catch (error) {
    console.error("Change email error:", error);
    return badRequest("Erreur lors du changement d'email");
  }
}
