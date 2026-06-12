import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { unauthorized, badRequest, ok } from "@/lib/api";

export async function POST() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return unauthorized();
  if (user.plan !== "premium" && user.role === "user") return badRequest("Réservé aux abonnés Premium");

  await prisma.user.update({
    where: { id: userId },
    data: { activityActivated: true },
  });

  return ok({ message: "Mode activité activé." });
}
