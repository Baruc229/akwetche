import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTontineAccess, forbidden, unauthorized, badRequest, ok } from "@/lib/api";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; membreId: string }> }) {
  let userId: number;
  try { userId = await requireTontineAccess(); } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return forbidden();
    return unauthorized();
  }

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
  let userId: number;
  try { userId = await requireTontineAccess(); } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return forbidden();
    return unauthorized();
  }

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
  if (body.nom !== undefined) {
    if (typeof body.nom !== "string" || !body.nom.trim()) return badRequest("Nom invalide");
    updateData.nom = body.nom.trim();
  }
  if (body.contact !== undefined) updateData.contact = body.contact || null;
  if (body.ordrePassage !== undefined) updateData.ordrePassage = parseInt(body.ordrePassage) || null;
  if (body.statut !== undefined) {
    if (!["actif", "retire", "exclu"].includes(body.statut)) return badRequest("Statut invalide");
    updateData.statut = body.statut;
  }

  const membre = await prisma.tontineMembre.update({
    where: { id: membreIntId },
    data: updateData,
  });

  return ok({ membre });
}
