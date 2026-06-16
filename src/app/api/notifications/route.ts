import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorized, ok } from "@/lib/api";

export async function GET(req: NextRequest) {
  let userId: number;
  try { userId = await requireAuth(); } catch { return unauthorized(); }

  const url = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "20") || 20, 1), 50);
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0") || 0, 0);

  const [notifications, total, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true, type: true, message: true, link: true, read: true, createdAt: true,
        actor: { select: { id: true, name: true } },
      },
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);

  return ok({ notifications, total, unread });
}
