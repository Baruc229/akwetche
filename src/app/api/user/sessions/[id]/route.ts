import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { ok, unauthorized, badRequest } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const sessionId = Number(id);
  if (!sessionId) return badRequest("ID invalide");

  const cookieStore = await cookies();
  const currentToken = cookieStore.get("token")?.value;

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) return badRequest("Session introuvable");

  if (session.token === currentToken) return badRequest("Impossible de déconnecter cet appareil — déconnectez-vous normalement.");

  await prisma.session.delete({ where: { id: sessionId } });

  return ok({ success: true });
}
