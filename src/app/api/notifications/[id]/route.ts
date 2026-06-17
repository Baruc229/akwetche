import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorized, ok, badRequest } from "@/lib/api";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: number;
  try { userId = await requireAuth(); } catch { return unauthorized(); }

  const { id } = await params;
  const notifId = parseInt(id);
  if (isNaN(notifId)) return badRequest("ID invalide");

  const notif = await prisma.notification.findUnique({ where: { id: notifId } });
  if (!notif || notif.userId !== userId) return badRequest("Notification introuvable");

  await prisma.notification.delete({ where: { id: notifId } });
  return ok({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: number;
  try { userId = await requireAuth(); } catch { return unauthorized(); }

  const { id } = await params;
  const notifId = parseInt(id);
  if (isNaN(notifId)) return badRequest("ID invalide");

  const notif = await prisma.notification.findUnique({ where: { id: notifId } });
  if (!notif || notif.userId !== userId) return badRequest("Notification introuvable");

  const body = await req.json().catch(() => ({}));
  const updated = await prisma.notification.update({
    where: { id: notifId },
    data: { read: body.read !== false },
  });

  return ok(updated);
}
