import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorized, ok } from "@/lib/api";

export async function POST() {
  let userId: number;
  try { userId = await requireAuth(); } catch { return unauthorized(); }

  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });

  return ok({ ok: true });
}
