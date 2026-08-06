import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { unauthorized, badRequest, ok } from "@/lib/api";

export async function POST() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: { select: { status: true } } },
  });
  if (!user) return unauthorized();
  const isPremium = user.subscription?.status === "active" || user.role !== "user";
  if (!isPremium) return badRequest("Réservé aux abonnés Premium");

  await prisma.user.update({
    where: { id: userId },
    data: { activityActivated: true },
  });

  return ok({ message: "Mode activité activé." });
}
