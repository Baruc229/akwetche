import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTontineAccess, forbidden, unauthorized, badRequest, ok } from "@/lib/api";
import { recalculerPenalitesTontine } from "@/lib/tontine";

async function getTontine(id: number, userId: number, include?: Record<string, unknown>) {
  return prisma.tontine.findFirst({
    where: { id, organisateurId: userId },
    include: include || {
      membres: {
        where: { statut: "actif" },
        orderBy: { ordrePassage: "asc" as const },
      },
      cotisations: {
        orderBy: { periode: "desc" as const },
        include: { membre: true, commissionTransaction: true },
      },
      tours: { orderBy: { numeroTour: "asc" as const } },
      distribution: true,
    },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: number;
  try { userId = await requireTontineAccess(); } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return forbidden();
    return unauthorized();
  }

  const { id } = await params;
  const tontineId = parseInt(id);
  if (!tontineId) return badRequest("ID invalide");

  const tontine = await getTontine(tontineId, userId);
  if (!tontine) return badRequest("Tontine introuvable");

  return ok({ tontine });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: number;
  try { userId = await requireTontineAccess(); } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return forbidden();
    return unauthorized();
  }

  const { id } = await params;
  const tontineId = parseInt(id);
  if (!tontineId) return badRequest("ID invalide");

  const existing = await prisma.tontine.findFirst({
    where: { id: tontineId, organisateurId: userId },
  });
  if (!existing) return badRequest("Tontine introuvable");

  const body = await req.json();
  const updateData: Record<string, unknown> = {};
  let penaltyChanged = false;

  if (body.nom !== undefined) updateData.nom = body.nom;
  if (body.montantCotisation !== undefined) updateData.montantCotisation = parseFloat(body.montantCotisation);
  if (body.frequence !== undefined) updateData.frequence = body.frequence;
  if (body.fraisOrganisateurParDefaut !== undefined) updateData.fraisOrganisateurParDefaut = parseFloat(body.fraisOrganisateurParDefaut);
  if (body.scopeCommission !== undefined) updateData.scopeCommission = body.scopeCommission;
  if (body.dateDistribution !== undefined) updateData.dateDistribution = body.dateDistribution ? new Date(body.dateDistribution) : null;
  if (body.statut !== undefined) updateData.statut = body.statut;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.objectifMontant !== undefined) updateData.objectifMontant = body.objectifMontant ? parseFloat(body.objectifMontant) : null;
  if (body.commissionsTransactionsEnabled !== undefined) updateData.commissionsTransactionsEnabled = Boolean(body.commissionsTransactionsEnabled);
  if (body.penaliteRetardActive !== undefined) { updateData.penaliteRetardActive = Boolean(body.penaliteRetardActive); penaltyChanged = true; }
  if (body.penaliteRetardMontant !== undefined) { updateData.penaliteRetardMontant = parseFloat(body.penaliteRetardMontant); penaltyChanged = true; }
  if (body.penaliteRetardDelaiJours !== undefined) { updateData.penaliteRetardDelaiJours = parseInt(body.penaliteRetardDelaiJours); penaltyChanged = true; }

  const tontine = await prisma.tontine.update({
    where: { id: tontineId },
    data: updateData,
  });

  let recalculated = 0;
  if (penaltyChanged) {
    recalculated = await recalculerPenalitesTontine(tontineId);
  }

  return ok({ tontine, recalculated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: number;
  try { userId = await requireTontineAccess(); } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return forbidden();
    return unauthorized();
  }

  const { id } = await params;
  const tontineId = parseInt(id);
  if (!tontineId) return badRequest("ID invalide");

  const existing = await prisma.tontine.findFirst({
    where: { id: tontineId, organisateurId: userId },
  });
  if (!existing) return badRequest("Tontine introuvable");

  await prisma.tontine.delete({ where: { id: tontineId } });
  return ok({ success: true });
}
