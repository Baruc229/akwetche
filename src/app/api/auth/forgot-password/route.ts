import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateEmailToken } from "@/lib/auth";
import { badRequest, ok } from "@/lib/api";
import { sendEmail, resetPasswordEmailHtml } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
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
