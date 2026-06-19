import { prisma } from "@/lib/prisma";
import { getAuthUserId, generateEmailToken } from "@/lib/auth";
import { unauthorized, badRequest, ok } from "@/lib/api";
import { sendEmail, verificationEmailHtml } from "@/lib/email";

export async function POST() {
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
