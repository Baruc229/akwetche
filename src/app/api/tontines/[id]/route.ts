import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { unauthorized, badRequest, ok } from "@/lib/api";

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
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const tontineId = parseInt(id);
  if (!tontineId) return badRequest("ID invalide");

  const tontine = await getTontine(tontineId, userId);
  if (!tontine) return badRequest("Tontine introuvable");

  return ok({ tontine });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const tontineId = parseInt(id);
  if (!tontineId) return badRequest("ID invalide");

  const existing = await prisma.tontine.findFirst({
    where: { id: tontineId, organisateurId: userId },
  });
  if (!existing) return badRequest("Tontine introuvable");

  const body = await req.json();
  const updateData: Record<string, unknown> = {};

  if (body.nom !== undefined) updateData.nom = body.nom;
  if (body.montantCotisation !== undefined) updateData.montantCotisation = parseFloat(body.montantCotisation);
  if (body.frequence !== undefined) updateData.frequence = body.frequence;
  if (body.fraisOrganisateurParDefaut !== undefined) updateData.fraisOrganisateurParDefaut = parseFloat(body.fraisOrganisateurParDefaut);
  if (body.scopeCommission !== undefined) updateData.scopeCommission = body.scopeCommission;
  if (body.dateDistribution !== undefined) updateData.dateDistribution = body.dateDistribution ? new Date(body.dateDistribution) : null;
  if (body.statut !== undefined) updateData.statut = body.statut;

  const tontine = await prisma.tontine.update({
    where: { id: tontineId },
    data: updateData,
  });

  return ok({ tontine });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

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
