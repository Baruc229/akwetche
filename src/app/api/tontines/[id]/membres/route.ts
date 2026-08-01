import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTontineAccess, forbidden, unauthorized, badRequest, ok, created } from "@/lib/api";
import { genererGrilleMises, calculerMisesMembre, getFrequenceJours, startOfDay } from "@/lib/tontine-utils";

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

  const { nom, contact, montantCotisationPersonnel } = await req.json();
  if (!nom) return badRequest("Le nom est obligatoire");

  let ordrePassage: number | null = null;
  if (tontine.type === "rotative_simple") {
    const maxOrdre = await prisma.tontineMembre.aggregate({
      where: { tontineId },
      _max: { ordrePassage: true },
    });
    ordrePassage = (maxOrdre._max.ordrePassage || 0) + 1;
  }

  const membre = await prisma.tontineMembre.create({
    data: {
      tontineId,
      nom,
      contact: contact || null,
      ordrePassage,
      montantCotisationPersonnel: montantCotisationPersonnel != null && montantCotisationPersonnel !== "" ? parseFloat(montantCotisationPersonnel) : null,
    },
  });

  return created({ membre });
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

  const tontine = await prisma.tontine.findFirst({
    where: { id: tontineId, organisateurId: userId },
  });
  if (!tontine) return badRequest("Tontine introuvable");

  const membres = await prisma.tontineMembre.findMany({
    where: { tontineId },
    include: {
      _count: { select: { cotisations: true } },
      cotisations: {
        select: { periode: true, montantPaye: true, montantTotal: true, montantPenalite: true, statut: true },
      },
    },
    orderBy: [{ statut: "asc" }, { ordrePassage: "asc" as const }, { nom: "asc" }],
  });

  const frequenceJours = getFrequenceJours(tontine.frequence);
  const tours = tontine.type === "rotative_simple"
    ? await prisma.tontineTour.findMany({
        where: { tontineId },
        orderBy: { datePrevue: "asc" },
        select: { datePrevue: true },
      })
    : [];
  const grille = tours.length > 0
    ? genererGrilleMises({ dateDebut: tontine.dateDebut, frequenceJours, tourDates: tours.map(t => t.datePrevue) })
    : genererGrilleMises({ dateDebut: tontine.dateDebut, frequenceJours, dateFin: tontine.dateDistribution, nombre: tontine.nombreTours });

  const enriched = membres.map(m => {
    const nbPayees = m.cotisations.filter(c => c.statut === "paye" || c.statut === "partiel").length;
    const montantTotalPaye = m.cotisations.reduce((s, c) => s + c.montantPaye, 0);
    const totalPenalites = m.cotisations.reduce((s, c) => s + c.montantPenalite, 0);
    const nbRetards = m.cotisations.filter(c => c.statut === "en_retard").length;

    const montantMise = m.montantCotisationPersonnel ?? tontine.montantCotisation;
    const mises = calculerMisesMembre({
      montantMise,
      totalPaye: montantTotalPaye,
      totalPenalites,
      soldeAvance: m.soldeAvance || 0,
    });

    const parPeriode = new Map<number, { periode: Date; montantTotal: number; statut: string }>();
    for (const c of m.cotisations) {
      const key = startOfDay(c.periode).getTime();
      if (!parPeriode.has(key)) parPeriode.set(key, { periode: c.periode, montantTotal: c.montantTotal, statut: c.statut });
    }
    const prochaine = grille.find(d => {
      const c = parPeriode.get(startOfDay(d).getTime());
      return !c || c.statut !== "paye";
    });

    return {
      ...m,
      nbPayees,
      montantTotalPaye,
      nbRetards,
      mises,
      prochainePeriode: prochaine ? prochaine.toISOString() : null,
      prochainePeriodeMontant: prochaine
        ? (parPeriode.get(startOfDay(prochaine).getTime())?.montantTotal ?? montantMise)
        : null,
    };
  });

  return ok({ membres: enriched });
}
