import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth, forbidden, unauthorized, badRequest, ok } from "@/lib/api";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: number;
  try { userId = await requireAdminAuth(); } catch (e) {
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

  const distribution = await prisma.tontineDistribution.findUnique({
    where: { tontineId },
  });

  return ok({ distribution });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: number;
  try { userId = await requireAdminAuth(); } catch (e) {
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
  if (tontine.type !== "vivres_fin_annee") return badRequest("Seulement pour les tontines vivres/fin d'année");

  const existing = await prisma.tontineDistribution.findUnique({
    where: { tontineId },
  });
  if (existing) return badRequest("Une distribution existe déjà pour cette tontine");

  // Calculer le montant total collecté (uniquement montantBase des cotisations payées/partielles)
  const cotisations = await prisma.tontineCotisation.findMany({
    where: {
      tontineId,
      statut: { in: ["paye", "partiel"] },
    },
  });

  const montantTotalCollecte = cotisations.reduce((sum, c) => {
    if (c.statut === "paye") return sum + c.montantBase;
    // Pour partiel: prorata
    if (c.montantTotal > 0) {
      const ratio = c.montantPaye / c.montantTotal;
      return sum + Math.round(c.montantBase * ratio * 100) / 100;
    }
    return sum;
  }, 0);

  const { dateDistribution, montantAlloueVivres, montantAlloueArgent } = await req.json();
  if (!dateDistribution) return badRequest("dateDistribution requis");

  const totalAlloue = parseFloat(montantAlloueVivres || "0") + parseFloat(montantAlloueArgent || "0");
  if (totalAlloue > montantTotalCollecte) {
    return badRequest(`Le total alloué (${totalAlloue}) dépasse le montant collecté (${montantTotalCollecte})`);
  }

  const distribution = await prisma.tontineDistribution.create({
    data: {
      tontineId,
      dateDistribution: new Date(dateDistribution),
      montantTotalCollecte,
      montantAlloueVivres: parseFloat(montantAlloueVivres || "0"),
      montantAlloueArgent: parseFloat(montantAlloueArgent || "0"),
      statut: "planifiee",
    },
  });

  return ok({ distribution });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: number;
  try { userId = await requireAdminAuth(); } catch (e) {
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

  const distribution = await prisma.tontineDistribution.findUnique({
    where: { tontineId },
  });
  if (!distribution) return badRequest("Aucune distribution trouvée");

  const { montantAlloueVivres, montantAlloueArgent, statut } = await req.json();

  const updateData: Record<string, unknown> = {};
  if (montantAlloueVivres !== undefined) updateData.montantAlloueVivres = parseFloat(montantAlloueVivres);
  if (montantAlloueArgent !== undefined) updateData.montantAlloueArgent = parseFloat(montantAlloueArgent);
  if (statut !== undefined) updateData.statut = statut;

  if (statut === "effectuee" && distribution.statut !== "effectuee") {
    updateData.dateDistribution = new Date();
  }

  const updated = await prisma.tontineDistribution.update({
    where: { id: distribution.id },
    data: updateData,
  });

  return ok({ distribution: updated });
}
