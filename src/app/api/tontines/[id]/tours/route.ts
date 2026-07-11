import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { unauthorized, badRequest, ok, created } from "@/lib/api";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const tontineId = parseInt(id);
  if (!tontineId) return badRequest("ID invalide");

  const tontine = await prisma.tontine.findFirst({
    where: { id: tontineId, organisateurId: userId },
  });
  if (!tontine) return badRequest("Tontine introuvable");

  const tours = await prisma.tontineTour.findMany({
    where: { tontineId },
    orderBy: { numeroTour: "asc" },
  });

  return ok({ tours });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const tontineId = parseInt(id);
  if (!tontineId) return badRequest("ID invalide");

  const tontine = await prisma.tontine.findFirst({
    where: { id: tontineId, organisateurId: userId },
  });
  if (!tontine) return badRequest("Tontine introuvable");
  if (tontine.type !== "rotative_simple") return badRequest("Seulement pour les tontines rotatives");

  const { numeroTour, datePrevue, beneficiaireId, montantAttendu } = await req.json();
  if (!numeroTour || !datePrevue || !beneficiaireId || !montantAttendu) {
    return badRequest("Champs obligatoires manquants");
  }

  const membre = await prisma.tontineMembre.findFirst({
    where: { id: parseInt(beneficiaireId), tontineId, statut: "actif" },
  });
  if (!membre) return badRequest("Membre bénéficiaire introuvable");

  const tour = await prisma.tontineTour.create({
    data: {
      tontineId,
      numeroTour: parseInt(numeroTour),
      datePrevue: new Date(datePrevue),
      beneficiaireId: parseInt(beneficiaireId),
      montantAttendu: parseFloat(montantAttendu),
    },
  });

  return created({ tour });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const tontineId = parseInt(id);
  if (!tontineId) return badRequest("ID invalide");

  const tontine = await prisma.tontine.findFirst({
    where: { id: tontineId, organisateurId: userId },
  });
  if (!tontine) return badRequest("Tontine introuvable");

  const { tourId, montantCollecte, statut } = await req.json();
  if (!tourId) return badRequest("tourId requis");

  const updateData: Record<string, unknown> = {};
  if (montantCollecte !== undefined) updateData.montantCollecte = parseFloat(montantCollecte);
  if (statut !== undefined) updateData.statut = statut;

  const tour = await prisma.tontineTour.update({
    where: { id: parseInt(tourId) },
    data: updateData,
  });

  return ok({ tour });
}
