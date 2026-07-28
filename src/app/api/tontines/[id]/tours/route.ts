import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTontineAccess, forbidden, unauthorized, badRequest, ok, created } from "@/lib/api";
import { genererTours, validerTransitionTour, avancerTourSuivant } from "@/lib/tontine";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: number;
  try { userId = await requireTontineAccess(); } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return forbidden();
    return unauthorized();
  }

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
  let userId: number;
  try { userId = await requireTontineAccess(); } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return forbidden();
    return unauthorized();
  }

  const { id } = await params;
  const tontineId = parseInt(id);
  if (!tontineId) return badRequest("ID invalide");

  const tontine = await prisma.tontine.findFirst({
    where: { id: tontineId, organisateurId: userId },
  });
  if (!tontine) return badRequest("Tontine introuvable");
  if (tontine.type !== "rotative_simple") return badRequest("Seulement pour les tontines rotatives");

  const body = await req.json().catch(() => ({}));

  if (body.generer === true) {
    try {
      const result = await genererTours(tontineId);
      return created({ message: `${result.tours} tours générés`, dateFin: result.dateFin });
    } catch (e) {
      return badRequest(e instanceof Error ? e.message : "Erreur lors de la génération");
    }
  }

  const { numeroTour, datePrevue, beneficiaireId, montantAttendu } = body;
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
  let userId: number;
  try { userId = await requireTontineAccess(); } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return forbidden();
    return unauthorized();
  }

  const { id } = await params;
  const tontineId = parseInt(id);
  if (!tontineId) return badRequest("ID invalide");

  const tontine = await prisma.tontine.findFirst({
    where: { id: tontineId, organisateurId: userId },
  });
  if (!tontine) return badRequest("Tontine introuvable");

  const { tourId, montantCollecte, statut } = await req.json();
  if (!tourId) return badRequest("tourId requis");

  const tour = await prisma.tontineTour.findFirst({
    where: { id: parseInt(tourId), tontineId },
  });
  if (!tour) return badRequest("Tour introuvable");

  const updateData: Record<string, unknown> = {};
  if (montantCollecte !== undefined) updateData.montantCollecte = parseFloat(montantCollecte);

  if (statut !== undefined) {
    if (!validerTransitionTour(tour.statut, statut)) {
      return badRequest(`Transition invalide: ${tour.statut} → ${statut}`);
    }
    updateData.statut = statut;
  }

  const updatedTour = await prisma.tontineTour.update({
    where: { id: parseInt(tourId) },
    data: updateData,
  });

  if (updateData.statut === "collecte_terminee") {
    await avancerTourSuivant(tontineId, parseInt(tourId));
  }

  return ok({ tour: updatedTour });
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

  const tontine = await prisma.tontine.findFirst({
    where: { id: tontineId, organisateurId: userId },
  });
  if (!tontine) return badRequest("Tontine introuvable");

  const { searchParams } = new URL(req.url);
  const tourId = searchParams.get("tourId");
  if (!tourId) return badRequest("tourId requis");

  const tour = await prisma.tontineTour.findFirst({
    where: { id: parseInt(tourId), tontineId },
  });
  if (!tour) return badRequest("Tour introuvable");
  if (tour.statut === "en_cours") return badRequest("Impossible de supprimer un tour en cours");

  await prisma.tontineTour.delete({ where: { id: parseInt(tourId) } });
  return ok({ success: true });
}
