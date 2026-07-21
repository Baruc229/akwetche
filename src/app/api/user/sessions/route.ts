import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { ok, unauthorized, badRequest } from "@/lib/api";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const cookieStore = await cookies();
  const currentToken = cookieStore.get("token")?.value;

  const sessions = await prisma.session.findMany({
    where: { userId },
    orderBy: { lastActive: "desc" },
    select: { id: true, ipAddress: true, userAgent: true, lastActive: true, createdAt: true, token: true },
  });

  return ok({
    sessions: sessions.map(s => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      lastActive: s.lastActive.toISOString(),
      createdAt: s.createdAt.toISOString(),
      isCurrent: s.token === currentToken,
    })),
  });
}

export async function DELETE() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const cookieStore = await cookies();
  const currentToken = cookieStore.get("token")?.value;

  if (!currentToken) return badRequest("Aucune session courante");

  await prisma.session.deleteMany({
    where: { userId, token: { not: currentToken } },
  });

  return ok({ success: true });
}
