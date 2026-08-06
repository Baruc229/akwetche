import { prisma } from "./prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  getFrequenceJours,
  genererGrilleMises,
  planifierImputation,
  planifierDesimputation,
} from "./tontine-utils";

export { getFrequenceJours };

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

type ClientLike = Prisma.TransactionClient;

export async function trouverTourPourPeriode(
  tontineId: number,
  periode: Date,
  client: ClientLike = prisma as unknown as ClientLike
): Promise<number | null> {
  const tours = await client.tontineTour.findMany({
    where: { tontineId },
    orderBy: { datePrevue: "asc" },
  });
  if (tours.length === 0) return null;

  const ouverts = tours.filter((t) => t.statut !== "cloture" && t.statut !== "collecte_terminee");
  if (ouverts.length === 0) return null;

  const t = periode.getTime();

  // Période correspondant exactement à la date d'un tour ouvert → ce tour.
  const exact = ouverts.find((x) => x.datePrevue.getTime() === t);
  if (exact) return exact.id;

  // Sinon, premier tour ouvert dont la date couvre la période.
  const suivant = ouverts.find((x) => x.datePrevue.getTime() >= t);
  if (suivant) return suivant.id;

  // Période postérieure à tous les tours ouverts : on ne l'attache à aucun
  // tour (sinon le montantCollecte du dernier tour est gonflé).
  return null;
}

/**
 * Comptabilise (ou met à jour) la commission organisateur d'une cotisation.
 * Une cotisation ne peut porter qu'une seule transaction de commission.
 */
async function bookCommissionInTx(
  tx: ClientLike,
  args: {
    userId: number;
    tontine: { nom: string; scopeCommission: string };
    cotisationId: number;
    amount: number;
    date: Date;
  }
): Promise<void> {
  if (args.amount <= 0) return;
  const commissionCategorie = await tx.category.upsert({
    where: { name_userId: { name: "Commission tontine", userId: args.userId } },
    update: {},
    create: { name: "Commission tontine", icon: "hand-holding-dollar", type: "income", userId: args.userId },
  });
  await tx.transaction.create({
    data: {
      type: "income",
      amount: args.amount,
      description: `Tontine — commission : ${args.tontine.nom}`,
      date: args.date,
      scope: args.tontine.scopeCommission === "personnel" ? "personal" : "activity",
      categoryId: commissionCategorie.id,
      userId: args.userId,
      tontineCotisationId: args.cotisationId,
    },
  });
}

/**
 * Dates de mise FUTURES (strictement après `after`) pour une tontine.
 * Rotative → dates des tours ; Vivres → grille régulière jusqu'à dateDistribution.
 */
async function genererDatesDeMiseFutures(
  tx: ClientLike,
  tontine: { id: number; type: string; dateDebut: Date; dateDistribution: Date | null; frequence: string; nombreTours: number | null },
  after: Date
): Promise<Date[]> {
  const freq = getFrequenceJours(tontine.frequence);

  if (tontine.type === "rotative_simple") {
    const tours = await tx.tontineTour.findMany({
      where: { tontineId: tontine.id },
      orderBy: { datePrevue: "asc" },
      select: { datePrevue: true },
    });
    const grille = genererGrilleMises({
      dateDebut: tontine.dateDebut,
      frequenceJours: freq,
      tourDates: tours.length > 0 ? tours.map((t) => t.datePrevue) : null,
      nombre: tours.length > 0 ? null : tontine.nombreTours,
    });
    return grille.filter((d) => d.getTime() > new Date(after).getTime());
  }

  const grille = genererGrilleMises({
    dateDebut: tontine.dateDebut,
    frequenceJours: freq,
    dateFin: tontine.dateDistribution,
    nombre: tontine.nombreTours,
  });
  return grille.filter((d) => d.getTime() > new Date(after).getTime());
}

/**
 * Impute un surplus (paiement d'avance) sur les jours de mise suivants.
 * - Remplit d'abord les périodes futures déjà existantes.
 * - Matérialise ensuite les périodes manquantes (créées automatiquement).
 * - L'excédent hors grille reste en soldeAvance.
 * Chaque montant imputé facture sa commission organisateur (au prorata).
 */
export async function imputerSurplus(
  tx: ClientLike,
  args: {
    userId: number;
    tontine: {
      id: number;
      nom: string;
      type: string;
      frequence: string;
      dateDebut: Date;
      dateDistribution: Date | null;
      montantCotisation: number;
      fraisOrganisateurParDefaut: number;
      scopeCommission: string;
      nombreTours: number | null;
    };
    membre: { id: number; montantCotisationPersonnel: number | null };
    periodeDate: Date;
    surplus: number;
  }
): Promise<{ futuresImbriquees: number; soldeRestant: number }> {
  if (args.surplus <= 0) return { futuresImbriquees: 0, soldeRestant: 0 };

  const montantMise = args.membre.montantCotisationPersonnel ?? args.tontine.montantCotisation;
  const montantBase = montantMise - args.tontine.fraisOrganisateurParDefaut;
  const fraisOrganisateur = args.tontine.fraisOrganisateurParDefaut;

  const periodesExistantes = await tx.tontineCotisation.findMany({
    where: {
      tontineId: args.tontine.id,
      membreId: args.membre.id,
      periode: { gt: args.periodeDate },
    },
    orderBy: { periode: "asc" },
    include: { commissionTransaction: true },
  });

  const dates = await genererDatesDeMiseFutures(tx, args.tontine, args.periodeDate);

  const plan = planifierImputation({
    surplus: args.surplus,
    montantMise,
    montantBase,
    fraisOrganisateur,
    periodesExistantes: periodesExistantes.map((p) => ({
      id: p.id,
      periode: p.periode,
      montantTotal: p.montantTotal,
      montantPaye: p.montantPaye,
      commissionAmount: p.commissionTransaction?.amount ?? 0,
    })),
    dates,
  });

  const toursAActualiser = new Set<number>();

  for (const u of plan.updates) {
    const existante = periodesExistantes.find((p) => p.id === u.id);
    await tx.tontineCotisation.update({
      where: { id: u.id },
      data: {
        montantPaye: u.nouveauPaye,
        statut: u.nouveauStatut,
        datePaiement: existante?.datePaiement ?? new Date(),
      },
    });

    if (u.commission > 0) {
      if (existante?.commissionTransaction) {
        await tx.transaction.update({
          where: { id: existante.commissionTransaction.id },
          data: { amount: existante.commissionTransaction.amount + u.commission },
        });
      } else {
        await bookCommissionInTx(tx, {
          userId: args.userId,
          tontine: args.tontine,
          cotisationId: u.id,
          amount: u.commission,
          date: new Date(),
        });
      }
    }
    if (existante?.tourId) toursAActualiser.add(existante.tourId);
  }

  for (const c of plan.creates) {
    const tourId = args.tontine.type === "rotative_simple" ? await trouverTourPourPeriode(args.tontine.id, c.periode, tx) : null;

    let row: { id: number };
    try {
      row = await tx.tontineCotisation.create({
        data: {
          tontineId: args.tontine.id,
          membreId: args.membre.id,
          tourId,
          periode: c.periode,
          montantBase: c.montantBase,
          fraisOrganisateur: c.fraisOrganisateur,
          montantTotal: c.montantTotal,
          montantPaye: c.aImputer,
          montantPenalite: 0,
          datePaiement: new Date(),
          statut: c.statut,
          imputee: true,
        },
      });
    } catch (err) {
      // Période déjà matérialisée par une requête concurrente (double POST) :
      // on fusionne le paiement au lieu de créer un doublon.
      if ((err as { code?: string })?.code === "P2002") {
        const existante = await tx.tontineCotisation.findFirst({
          where: { tontineId: args.tontine.id, membreId: args.membre.id, periode: c.periode },
          include: { commissionTransaction: true },
        });
        if (!existante) throw err;
        const nouveauPaye = existante.montantPaye + c.aImputer;
        row = await tx.tontineCotisation.update({
          where: { id: existante.id },
          data: {
            montantPaye: nouveauPaye,
            statut: nouveauPaye >= existante.montantTotal ? "paye" : existante.statut,
            datePaiement: existante.datePaiement ?? new Date(),
          },
        });
        if (c.commission > 0) {
          if (existante.commissionTransaction) {
            await tx.transaction.update({
              where: { id: existante.commissionTransaction.id },
              data: { amount: { increment: c.commission } },
            });
          } else {
            await bookCommissionInTx(tx, {
              userId: args.userId,
              tontine: args.tontine,
              cotisationId: existante.id,
              amount: c.commission,
              date: new Date(),
            });
          }
        }
        if (existante.tourId) toursAActualiser.add(existante.tourId);
      } else {
        throw err;
      }
    }

    if (row.id && (c.commission > 0)) {
      await bookCommissionInTx(tx, {
        userId: args.userId,
        tontine: args.tontine,
        cotisationId: row.id,
        amount: c.commission,
        date: new Date(),
      });
    }
    if (tourId) toursAActualiser.add(tourId);
  }

  if (plan.soldeRestant > 0) {
    await tx.tontineMembre.update({
      where: { id: args.membre.id },
      data: { soldeAvance: { increment: plan.soldeRestant } },
    });
  }

  for (const tourId of toursAActualiser) {
    await recalculerMontantCollecteTour(tourId, tx);
  }

  return {
    futuresImbriquees: plan.updates.length + plan.creates.length,
    soldeRestant: plan.soldeRestant,
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

  const tours: Prisma.TontineTourUncheckedCreateInput[] = [];
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

  // Atomicité : la suppression des tours existants et la recréation se font
  // dans une même transaction (sinon un crash entre les deux perdrait tout).
  await prisma.$transaction(async (tx) => {
    if (toursExistants.length > 0) {
      await tx.tontineTour.deleteMany({ where: { tontineId } });
    }
    await tx.tontineTour.createMany({ data: tours });
  });

  const dateFin = new Date(dateDebut.getTime() + (tontine.nombreTours - 1) * frequenceJours * 24 * 60 * 60 * 1000);

  return { tours: tours.length, dateFin: dateFin.toISOString() };
}

export async function recalculerPenalitesTontine(tontineId: number): Promise<number> {
  const tontine = await prisma.tontine.findUnique({ where: { id: tontineId } });
  if (!tontine) return 0;

  const cotisations = await prisma.tontineCotisation.findMany({
    where: { tontineId },
  });

  let count = 0;
  // Transaction : évite les mises à jour perdues si une cotisation est
  // enregistrée en parallèle pendant le recalcul des pénalités.
  await prisma.$transaction(async (tx) => {
    for (const c of cotisations) {
      // Une période déjà payée (y compris payée d'avance) ne reçoit jamais de pénalité rétroactive.
      if (c.statut === "paye") continue;

      const membre = await tx.tontineMembre.findUnique({ where: { id: c.membreId } });
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
        await tx.tontineCotisation.update({
          where: { id: c.id },
          data: { montantTotal, montantPenalite },
        });
        if (c.tourId) await recalculerMontantCollecteTour(c.tourId, tx);
        count++;
      }
    }
  });
  return count;
}

export async function resetMembreData(membreId: number): Promise<void> {
  await prisma.tontineMembre.update({
    where: { id: membreId },
    data: { soldeAvance: 0, montantCotisationPersonnel: null },
  });
}

export async function recalculerSoldeAvanceMembre(membreId: number): Promise<void> {
  const membre = await prisma.tontineMembre.findUnique({ where: { id: membreId } });
  if (!membre) return;

  const result = await prisma.tontineCotisation.aggregate({
    where: { membreId },
    _sum: { montantPaye: true, montantTotal: true },
  });
  const totalPaye = result._sum.montantPaye || 0;
  const totalDu = result._sum.montantTotal || 0;

  // L'avance est de l'argent réellement reçu mais non affecté à une période :
  // on ne l'efface jamais au passage, on la conserve comme argent flottant.
  const avanceFlottante = Math.max(0, totalPaye + (membre.soldeAvance || 0) - totalDu);
  await prisma.tontineMembre.update({
    where: { id: membreId },
    data: { soldeAvance: Math.max(membre.soldeAvance || 0, avanceFlottante) },
  });
}

/**
 * Dés-impute un surplus : quand une mise déjà enregistrée est réduite (ou
 * supprimée), les jours de mise suivants déjà payés d'avance rendent l'argent,
 * des plus lointains vers les plus proches. Les commissions sont retirées au
 * prorata. L'excédent qui ne peut pas être repris sur la grille existante
 * redevient une avance (soldeAvance).
 */
export async function desimputerSurplus(
  tx: ClientLike,
  args: {
    tontineId: number;
    membreId: number;
    periodeDate: Date; // dés-impute les périodes imputées STRICTEMENT après cette date
    reduction: number; // montant à récupérer
    fraisOrganisateur: number;
  }
): Promise<{ desimputees: number; versAvance: number }> {
  if (args.reduction <= 0) return { desimputees: 0, versAvance: 0 };

  const periodes = await tx.tontineCotisation.findMany({
    where: {
      tontineId: args.tontineId,
      membreId: args.membreId,
      imputee: true,
      periode: { gt: args.periodeDate },
    },
    orderBy: { periode: "desc" },
    include: { commissionTransaction: true },
  });

  if (periodes.length === 0) {
    // Rien à reprendre sur la grille : tout l'excédent redevient une avance.
    await tx.tontineMembre.update({
      where: { id: args.membreId },
      data: { soldeAvance: { increment: args.reduction } },
    });
    return { desimputees: 0, versAvance: args.reduction };
  }

  const plan = planifierDesimputation({
    reduction: args.reduction,
    periodesImputees: periodes.map((p) => ({
      id: p.id,
      periode: p.periode,
      montantTotal: p.montantTotal,
      montantPaye: p.montantPaye,
      commissionAmount: p.commissionTransaction?.amount ?? 0,
    })),
    fraisOrganisateur: args.fraisOrganisateur,
  });

  const toursAActualiser = new Set<number>();

  for (const u of plan.updates) {
    const p = periodes.find((x) => x.id === u.id);
    if (!p) continue;
    await tx.tontineCotisation.update({
      where: { id: u.id },
      data: { montantPaye: u.nouveauPaye, statut: u.nouveauStatut },
    });
    if (p.commissionTransaction) {
      if (u.nouvelleCommission > 0) {
        await tx.transaction.update({
          where: { id: p.commissionTransaction.id },
          data: { amount: u.nouvelleCommission },
        });
      } else {
        await tx.transaction.delete({ where: { id: p.commissionTransaction.id } });
        await tx.tontineCotisation.update({
          where: { id: u.id },
          data: { commissionTransaction: { disconnect: true } },
        });
      }
    }
    if (p.tourId) toursAActualiser.add(p.tourId);
  }

  for (const d of plan.deletes) {
    const p = periodes.find((x) => x.id === d.id);
    if (!p) continue;
    if (p.commissionTransaction) {
      await tx.transaction.delete({ where: { id: p.commissionTransaction.id } });
    }
    await tx.tontineCotisation.delete({ where: { id: d.id } });
    if (p.tourId) toursAActualiser.add(p.tourId);
  }

  if (plan.reste > 0) {
    await tx.tontineMembre.update({
      where: { id: args.membreId },
      data: { soldeAvance: { increment: plan.reste } },
    });
  }

  for (const tourId of toursAActualiser) {
    await recalculerMontantCollecteTour(tourId, tx);
  }

  return { desimputees: plan.updates.length + plan.deletes.length, versAvance: plan.reste };
}

export async function recalculerMontantCollecteTour(tourId: number, client: ClientLike = prisma as unknown as ClientLike): Promise<void> {
  const result = await client.tontineCotisation.aggregate({
    where: { tourId },
    _sum: { montantPaye: true },
  });
  await client.tontineTour.update({
    where: { id: tourId },
    data: { montantCollecte: result._sum.montantPaye || 0 },
  });
}

/**
 * Répare / matérialise le surplus d'un membre existant :
 * l'argent non affecté à une période (Σ payé + soldeAvance − Σ dû) est imputé
 * sur les jours de mise futurs, et soldeAvance est recalibré.
 * Idempotent — utilisé par le backfill des tontines déjà existantes.
 */
export async function reconcilierMembre(tontineId: number, membreId: number): Promise<{ imputees: number; solde: number }> {
  const tontine = await prisma.tontine.findUnique({ where: { id: tontineId } });
  const membre = await prisma.tontineMembre.findUnique({ where: { id: membreId } });
  if (!tontine || !membre) return { imputees: 0, solde: 0 };

  const cotisations = await prisma.tontineCotisation.findMany({
    where: { membreId, tontineId },
    orderBy: { periode: "asc" },
  });

  const totalPaye = cotisations.reduce((s, c) => s + c.montantPaye, 0);
  const totalDus = cotisations.reduce((s, c) => s + c.montantTotal, 0);
  const unallocated = (totalPaye - totalDus) + (membre.soldeAvance || 0);

  if (unallocated <= 0) {
    if (membre.soldeAvance !== 0) {
      await prisma.tontineMembre.update({ where: { id: membreId }, data: { soldeAvance: 0 } });
    }
    return { imputees: 0, solde: 0 };
  }

  const freq = getFrequenceJours(tontine.frequence);
  const anchor = cotisations.length > 0
    ? new Date(cotisations[cotisations.length - 1].periode)
    : new Date(new Date(tontine.dateDebut).getTime() - freq * 24 * 60 * 60 * 1000);

  const result = await prisma.$transaction(async (tx) => {
    await tx.tontineMembre.update({ where: { id: membreId }, data: { soldeAvance: 0 } });
    const membreTx = await tx.tontineMembre.findUnique({ where: { id: membreId } });
    return imputerSurplus(tx, {
      userId: tontine.organisateurId,
      tontine: {
        id: tontine.id,
        nom: tontine.nom,
        type: tontine.type,
        frequence: tontine.frequence,
        dateDebut: tontine.dateDebut,
        dateDistribution: tontine.dateDistribution,
        montantCotisation: tontine.montantCotisation,
        fraisOrganisateurParDefaut: tontine.fraisOrganisateurParDefaut,
        scopeCommission: tontine.scopeCommission,
        nombreTours: tontine.nombreTours,
      },
      membre: membreTx ?? { id: membreId, montantCotisationPersonnel: membre.montantCotisationPersonnel },
      periodeDate: anchor,
      surplus: unallocated,
    });
  });

  return { imputees: result.futuresImbriquees, solde: result.soldeRestant };
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
