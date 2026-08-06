import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId, hashPassword, comparePassword } from "@/lib/auth";
import { unauthorized, badRequest, ok } from "@/lib/api";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) {
    return badRequest("Tous les champs sont requis");
  }

  if (newPassword.length < 8) {
    return badRequest("Le nouveau mot de passe doit contenir au moins 8 caractères");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return unauthorized();

  const valid = await comparePassword(currentPassword, user.password);
  if (!valid) {
    return badRequest("Mot de passe actuel incorrect");
  }

  const hashed = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  });

  // Révoque les sessions des autres appareils (le changement de mot de passe
  // déconnecte tout sauf l'appareil courant).
  const cookieStore = await cookies();
  const currentToken = cookieStore.get("token")?.value;
  await prisma.session.deleteMany({
    where: { userId, ...(currentToken ? { token: { not: currentToken } } : {}) },
  });

  return ok({ message: "Mot de passe mis à jour avec succès" });
}
