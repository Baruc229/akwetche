import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTontineAccess, forbidden, unauthorized, badRequest, ok } from "@/lib/api";
import { validerTransitionTour, recalculerMontantCollecteTour } from "@/lib/tontine";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tourId: string }> }
) {
  let userId: number;
  try {
    userId = await requireTontineAccess();
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return forbidden();
    return unauthorized();
  }

  const { id, tourId } = await params;
  const tontineId = parseInt(id);
  if (!tontineId) return badRequest("ID invalide");

  const tontine = await prisma.tontine.findFirst({
    where: { id: tontineId, organisateurId: userId },
  });
  if (!tontine) return badRequest("Tontine introuvable");
  if (tontine.type !== "rotative_simple") return badRequest("Distribution de tour réservée aux tontines rotatives");

  const tour = await prisma.tontineTour.findFirst({
    where: { id: parseInt(tourId), tontineId },
  });
  if (!tour) return badRequest("Tour introuvable");
  if (tour.statut !== "collecte_terminee") {
    return badRequest("La collecte doit être terminée avant de distribuer");
  }
  if (!validerTransitionTour(tour.statut, "cloture")) {
    return badRequest("Transition invalide");
  }

  await recalculerMontantCollecteTour(tour.id);

  const updatedTour = await prisma.tontineTour.update({
    where: { id: tour.id },
    data: { statut: "cloture" },
  });

  return ok({
    tour: updatedTour,
    message: `Pot de ${updatedTour.montantCollecte} distribué au bénéficiaire`,
  });
}
