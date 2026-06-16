import { prisma } from "@/lib/prisma";

type NotificationType = "subscription" | "product" | "sale" | "stock" | "transaction" | "admin" | "role" | "system";

export async function createNotification(
  userId: number,
  type: NotificationType,
  message: string,
  link?: string,
  actorId?: number | null,
) {
  return prisma.notification.create({
    data: { userId, type, message, link: link || "", actorId: actorId ?? undefined },
  });
}
