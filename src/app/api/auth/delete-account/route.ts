import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { unauthorized, ok } from "@/lib/api";
import { cookies } from "next/headers";

export async function POST() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  await prisma.user.delete({ where: { id: userId } });

  const cookieStore = await cookies();
  cookieStore.set("token", "", { httpOnly: true, maxAge: 0, path: "/" });

  return ok({ message: "Votre compte a été supprimé." });
}
