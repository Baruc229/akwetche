import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { unauthorized, badRequest, ok } from "@/lib/api";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; membreId: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id, membreId } = await params;
  const tontineId = parseInt(id);
  const membreIntId = parseInt(membreId);
  if (!tontineId || !membreIntId) return badRequest("ID invalide");

  const tontine = await prisma.tontine.findFirst({
    where: { id: tontineId, organisateurId: userId },
  });
  if (!tontine) return badRequest("Tontine introuvable");

  const membre = await prisma.tontineMembre.findFirst({
    where: { id: membreIntId, tontineId },
  });
  if (!membre) return badRequest("Membre introuvable");

  await prisma.tontineMembre.update({
    where: { id: membreIntId },
    data: { statut: "retire" },
  });

  return ok({ success: true });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; membreId: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id, membreId } = await params;
  const tontineId = parseInt(id);
  const membreIntId = parseInt(membreId);
  if (!tontineId || !membreIntId) return badRequest("ID invalide");

  const tontine = await prisma.tontine.findFirst({
    where: { id: tontineId, organisateurId: userId },
  });
  if (!tontine) return badRequest("Tontine introuvable");

  const body = await req.json();
  const updateData: Record<string, unknown> = {};
  if (body.nom !== undefined) updateData.nom = body.nom;
  if (body.contact !== undefined) updateData.contact = body.contact;
  if (body.statut !== undefined) updateData.statut = body.statut;

  const membre = await prisma.tontineMembre.update({
    where: { id: membreIntId },
    data: updateData,
  });

  return ok({ membre });
}
