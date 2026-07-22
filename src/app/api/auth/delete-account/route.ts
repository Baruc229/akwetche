import { prisma } from "@/lib/prisma";
import { getAuthUserId, comparePassword } from "@/lib/auth";
import { unauthorized, badRequest, ok } from "@/lib/api";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { password } = await req.json();
  if (!password) return badRequest("Mot de passe requis");

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
  if (!user) return unauthorized();

  const valid = await comparePassword(password, user.password);
  if (!valid) return badRequest("Mot de passe incorrect");

  await prisma.user.delete({ where: { id: userId } });

  const cookieStore = await cookies();
  cookieStore.set("token", "", { httpOnly: true, maxAge: 0, path: "/" });

  return ok({ message: "Votre compte a été supprimé." });
}
