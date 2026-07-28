import { prisma } from "./prisma";

export function getFrequenceJours(frequence: string): number {
  const parsed = parseInt(frequence);
  if (!isNaN(parsed) && parsed > 0) return parsed;
  return 1;
}

export function calculerProrata(
  montantPaye: number,
  montantTotal: number,
  montantBase: number,
  fraisOrganisateur: number
): { montantBaseEffectif: number; fraisOrganisateurEffectif: number } {
  if (montantTotal <= 0) return { montantBaseEffectif: 0, fraisOrganisateurEffectif: 0 };
  const ratio = montantPaye / montantTotal;
  return {
    montantBaseEffectif: Math.round(montantBase * ratio * 100) / 100,
    fraisOrganisateurEffectif: Math.round(fraisOrganisateur * ratio * 100) / 100,
  };
}

export function calculerMontantTotalAvecPenalite(
  montantCotisation: number,
  penaliteRetardActive: boolean,
  penaliteRetardMontant: number,
  penaliteRetardDelaiJours: number,
  periode: Date,
  now: Date
): { montantTotal: number; montantPenalite: number; penaliteAppliquee: boolean } {
  const base = montantCotisation;

  if (!penaliteRetardActive || penaliteRetardMontant <= 0) {
    return { montantTotal: base, montantPenalite: 0, penaliteAppliquee: false };
  }

  const dateLimitePenalite = new Date(periode.getTime() + penaliteRetardDelaiJours * 24 * 60 * 60 * 1000);

  if (now > dateLimitePenalite) {
    return {
      montantTotal: base + penaliteRetardMontant,
      montantPenalite: penaliteRetardMontant,
      penaliteAppliquee: true,
    };
  }

  return { montantTotal: base, montantPenalite: 0, penaliteAppliquee: false };
}

export function calculerStatutCotisation(
  montantPaye: number,
  montantTotal: number,
  estEnRetard: boolean
): string {
  if (montantPaye <= 0) return estEnRetard ? "en_retard" : "en_attente";
  if (montantPaye >= montantTotal) return "paye";
  return estEnRetard ? "en_retard" : "partiel";
}

export async function detecterRetards(tontineId: number): Promise<number> {
  const tontine = await prisma.tontine.findUnique({ where: { id: tontineId } });
  if (!tontine) return 0;

  const frequenceJours = getFrequenceJours(tontine.frequence);
  const now = new Date();

  const cotisations = await prisma.tontineCotisation.findMany({
    where: {
      tontineId,
      statut: { in: ["en_attente", "partiel"] },
    },
  });

  let count = 0;
  for (const c of cotisations) {
    const dateLimite = new Date(c.periode.getTime() + frequenceJours * 24 * 60 * 60 * 1000);
    if (now > dateLimite) {
      const { montantTotal, montantPenalite } = calculerMontantTotalAvecPenalite(
        tontine.montantCotisation,
        tontine.penaliteRetardActive,
        tontine.penaliteRetardMontant,
        tontine.penaliteRetardDelaiJours,
        c.periode,
        now
      );

      await prisma.tontineCotisation.update({
        where: { id: c.id },
        data: {
          statut: "en_retard",
          montantTotal,
          montantPenalite,
        },
      });
      count++;
    }
  }

  return count;
}

export async function imputerAvance(
  tontineId: number,
  membreId: number,
  periodeDate: Date,
  montantPaye: number,
  montantTotalPeriode: number,
  montantBase: number,
  fraisOrganisateur: number
): Promise<{ cotisationCourante: { montantPaye: number; statut: string }; futuresImbriquees: number; soldeRestant: number }> {
  if (montantPaye <= montantTotalPeriode) {
    return { cotisationCourante: { montantPaye, statut: "" }, futuresImbriquees: 0, soldeRestant: 0 };
  }

  const surplus = montantPaye - montantTotalPeriode;

  const periodesFutures = await prisma.tontineCotisation.findMany({
    where: {
      tontineId,
      membreId,
      statut: { in: ["en_attente", "partiel"] },
      periode: { gt: periodeDate },
    },
    orderBy: { periode: "asc" },
  });

  let reste = surplus;
  let count = 0;

  for (const p of periodesFutures) {
    if (reste <= 0) break;

    const aImputer = Math.min(reste, p.montantTotal);
    const nouveauMontantPaye = p.montantPaye + aImputer;
    const nouveauStatut = calculerStatutCotisation(nouveauMontantPaye, p.montantTotal, false);

    await prisma.tontineCotisation.update({
      where: { id: p.id },
      data: {
        montantPaye: nouveauMontantPaye,
        statut: nouveauStatut,
        datePaiement: nouveauMontantPaye > 0 ? new Date() : null,
      },
    });

    reste -= aImputer;
    count++;
  }

  if (reste > 0) {
    await prisma.tontineMembre.update({
      where: { id: membreId },
      data: { soldeAvance: { increment: reste } },
    });
  }

  return {
    cotisationCourante: { montantPaye: montantTotalPeriode, statut: "paye" },
    futuresImbriquees: count,
    soldeRestant: reste,
  };
}

export async function genererTours(tontineId: number): Promise<{ tours: number; dateFin: string }> {
  const tontine = await prisma.tontine.findUnique({
    where: { id: tontineId },
    include: {
      membres: {
        where: { statut: "actif" },
        orderBy: { ordrePassage: "asc" },
      },
    },
  });

  if (!tontine) throw new Error("Tontine introuvable");
  if (tontine.type !== "rotative_simple") throw new Error("Seulement pour les tontines rotatives");
  if (!tontine.nombreTours) throw new Error("Nombre de tours non défini");
  if (tontine.membres.length === 0) throw new Error("Aucun membre actif");

  const frequenceJours = getFrequenceJours(tontine.frequence);
  const dateDebut = new Date(tontine.dateDebut);
  const montantAttendu = tontine.montantCotisation * tontine.membres.length;

  const toursExistants = await prisma.tontineTour.findMany({
    where: { tontineId },
    select: { id: true },
  });

  if (toursExistants.length > 0) {
    await prisma.tontineTour.deleteMany({ where: { tontineId } });
  }

  const tours = [];
  for (let i = 0; i < tontine.nombreTours; i++) {
    const datePrevue = new Date(dateDebut.getTime() + i * frequenceJours * 24 * 60 * 60 * 1000);
    const beneficiaire = tontine.membres[i % tontine.membres.length];

    tours.push({
      tontineId,
      numeroTour: i + 1,
      datePrevue,
      beneficiaireId: beneficiaire.id,
      montantAttendu,
      statut: i === 0 ? "en_cours" : "planifie",
    });
  }

  await prisma.tontineTour.createMany({ data: tours });

  const dateFin = new Date(dateDebut.getTime() + (tontine.nombreTours - 1) * frequenceJours * 24 * 60 * 60 * 1000);

  return { tours: tours.length, dateFin: dateFin.toISOString() };
}

export async function trouverTourPourPeriode(tontineId: number, periode: Date): Promise<number | null> {
  const tours = await prisma.tontineTour.findMany({
    where: { tontineId },
    orderBy: { datePrevue: "asc" },
  });
  if (tours.length === 0) return null;

  let bestTourId: number | null = null;
  let bestDiff = Infinity;
  for (const tour of tours) {
    if (tour.statut === "cloture" || tour.statut === "collecte_terminee") continue;
    const diff = Math.abs(periode.getTime() - tour.datePrevue.getTime());
    if (diff < bestDiff) {
      bestDiff = diff;
      bestTourId = tour.id;
    }
  }
  return bestTourId;
}

export async function recalculerPenalitesTontine(tontineId: number): Promise<number> {
  const tontine = await prisma.tontine.findUnique({ where: { id: tontineId } });
  if (!tontine) return 0;

  const cotisations = await prisma.tontineCotisation.findMany({
    where: { tontineId },
  });

  let count = 0;
  for (const c of cotisations) {
    const membre = await prisma.tontineMembre.findUnique({ where: { id: c.membreId } });
    const montantCotisationEffectif = membre?.montantCotisationPersonnel ?? tontine.montantCotisation;

    const { montantTotal, montantPenalite } = calculerMontantTotalAvecPenalite(
      montantCotisationEffectif,
      tontine.penaliteRetardActive,
      tontine.penaliteRetardMontant,
      tontine.penaliteRetardDelaiJours,
      c.periode,
      new Date()
    );

    if (montantTotal !== c.montantTotal || montantPenalite !== c.montantPenalite) {
      await prisma.tontineCotisation.update({
        where: { id: c.id },
        data: { montantTotal, montantPenalite },
      });
      if (c.tourId) await recalculerMontantCollecteTour(c.tourId);
      count++;
    }
  }
  return count;
}

export async function resetMembreData(membreId: number): Promise<void> {
  await prisma.tontineMembre.update({
    where: { id: membreId },
    data: { soldeAvance: 0, montantCotisationPersonnel: null },
  });
}

export async function recalculerSoldeAvanceMembre(membreId: number): Promise<void> {
  const result = await prisma.tontineCotisation.aggregate({
    where: { membreId },
    _sum: { montantPaye: true, montantTotal: true },
  });
  const totalPaye = result._sum.montantPaye || 0;
  const totalDu = result._sum.montantTotal || 0;
  const solde = Math.max(0, totalPaye - totalDu);
  await prisma.tontineMembre.update({
    where: { id: membreId },
    data: { soldeAvance: solde },
  });
}

export async function recalculerMontantCollecteTour(tourId: number): Promise<void> {
  const result = await prisma.tontineCotisation.aggregate({
    where: { tourId },
    _sum: { montantPaye: true },
  });
  await prisma.tontineTour.update({
    where: { id: tourId },
    data: { montantCollecte: result._sum.montantPaye || 0 },
  });
}

// ─── Tour state machine ──────────────────────────────────────────

type TourStatut = "planifie" | "en_cours" | "collecte_terminee" | "cloture";

const TRANSITIONS_VALIDES: Record<TourStatut, TourStatut[]> = {
  planifie: ["en_cours"],
  en_cours: ["collecte_terminee"],
  collecte_terminee: ["cloture"],
  cloture: [],
};

export function validerTransitionTour(statutActuel: string, nouveauStatut: string): boolean {
  const valides = TRANSITIONS_VALIDES[statutActuel as TourStatut];
  if (!valides) return false;
  return valides.includes(nouveauStatut as TourStatut);
}

export async function avancerTourSuivant(tontineId: number, tourTermineId: number): Promise<void> {
  const tourTermine = await prisma.tontineTour.findUnique({ where: { id: tourTermineId } });
  if (!tourTermine || tourTermine.statut !== "collecte_terminee") return;

  const prochainTour = await prisma.tontineTour.findFirst({
    where: { tontineId, statut: "planifie" },
    orderBy: { numeroTour: "asc" },
  });

  if (prochainTour) {
    await prisma.tontineTour.update({
      where: { id: prochainTour.id },
      data: { statut: "en_cours" },
    });
  }
}
