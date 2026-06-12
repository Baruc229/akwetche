import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { badRequest, ok } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) return badRequest("Token et mot de passe requis");
    if (password.length < 8) return badRequest("Le mot de passe doit contenir au moins 8 caractères");

    const record = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!record || record.type !== "password_reset") {
      return badRequest("Token invalide");
    }

    if (record.expiresAt < new Date()) {
      return badRequest("Token expiré. Faites une nouvelle demande.");
    }

    await prisma.user.update({
      where: { id: record.userId },
      data: { password: await hashPassword(password) },
    });

    await prisma.verificationToken.delete({ where: { id: record.id } });

    return ok({ message: "Mot de passe réinitialisé avec succès." });
  } catch (error) {
    console.error("Reset password error:", error);
    return badRequest("Erreur lors de la réinitialisation");
  }
}
