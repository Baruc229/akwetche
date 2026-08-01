import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTontineAccess, forbidden, unauthorized, badRequest, ok } from "@/lib/api";
import { createNotification } from "@/lib/notifications";
import { formatCurrency, resolveCurrency } from "@/lib/currency";
import { startOfDay } from "@/lib/tontine-utils";
import { calculerProrata, calculerMontantTotalAvecPenalite, calculerStatutCotisation, getFrequenceJours, trouverTourPourPeriode, imputerSurplus, desimputerSurplus, recalculerMontantCollecteTour, recalculerSoldeAvanceMembre } from "@/lib/tontine";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; cotisationId: string }> }) {
  try {
    let userId: number;
    try { userId = await requireTontineAccess(); } catch (e) {
      if (e instanceof Error && e.message === "Forbidden") return forbidden();
      return unauthorized();
    }

    const { id, cotisationId } = await params;
    const tontineId = parseInt(id);
    const cotisationIntId = parseInt(cotisationId);
    if (!tontineId || !cotisationIntId) return badRequest("ID invalide");

    const tontine = await prisma.tontine.findFirst({
      where: { id: tontineId, organisateurId: userId },
    });
    if (!tontine) return badRequest("Tontine introuvable");

    const existing = await prisma.tontineCotisation.findFirst({
      where: { id: cotisationIntId, tontineId },
      include: { commissionTransaction: true },
    });
    if (!existing) return badRequest("Cotisation introuvable");

    const { montantPaye, datePaiement, periode } = await req.json();
    if (montantPaye === undefined) return badRequest("montantPaye requis");

    const parsedMontantPaye = parseFloat(montantPaye) || 0;

    // Date de la période modifiable (facultative).
    let nouvellePeriode = existing.periode;
    if (periode !== undefined && periode !== null && periode !== "") {
      const parsed = new Date(periode);
      if (isNaN(parsed.getTime())) return badRequest("Date de période invalide");
      if (startOfDay(parsed).getTime() !== startOfDay(existing.periode).getTime()) {
        const conflit = await prisma.tontineCotisation.findFirst({
          where: { tontineId, membreId: existing.membreId, periode: parsed, id: { not: cotisationIntId } },
        });
        if (conflit) return badRequest("Une cotisation existe déjà pour ce membre à cette date");
        nouvellePeriode = parsed;
      }
    }

    const frequenceJours = getFrequenceJours(tontine.frequence);
    const dateLimite = new Date(nouvellePeriode.getTime() + frequenceJours * 24 * 60 * 60 * 1000);
    const now = new Date();

    const montantMise = existing.montantBase + existing.fraisOrganisateur;
    const { montantTotal, montantPenalite } = calculerMontantTotalAvecPenalite(
      montantMise,
      tontine.penaliteRetardActive,
      tontine.penaliteRetardMontant,
      tontine.penaliteRetardDelaiJours,
      nouvellePeriode,
      now
    );

    const surplus = Math.max(0, parsedMontantPaye - montantTotal);
    const montantEffective = Math.min(parsedMontantPaye, montantTotal);
    const estEnRetard = now > dateLimite && montantEffective < montantTotal;
    const statut = montantEffective >= montantTotal
      ? "paye"
      : calculerStatutCotisation(montantEffective, montantTotal, estEnRetard);

    const { fraisOrganisateurEffectif } = calculerProrata(
      montantEffective,
      montantTotal,
      existing.montantBase,
      existing.fraisOrganisateur
    );

    const membre = await prisma.tontineMembre.findUnique({ where: { id: existing.membreId } });

    let notificationInfo: { amount: number } | null = null;
    let notificationSent = false;

    const result = await prisma.$transaction(async (tx) => {
      let tourId = existing.tourId;
      if (startOfDay(nouvellePeriode).getTime() !== startOfDay(existing.periode).getTime()) {
        tourId = tontine.type === "rotative_simple" ? await trouverTourPourPeriode(tontineId, nouvellePeriode, tx) : null;
      }

      const cotisation = await tx.tontineCotisation.update({
        where: { id: cotisationIntId },
        data: {
          montantPaye: montantEffective,
          montantTotal,
          montantPenalite,
          periode: nouvellePeriode,
          tourId,
          datePaiement: datePaiement ? new Date(datePaiement) : parsedMontantPaye > 0 ? (existing.datePaiement ?? new Date()) : null,
          statut,
        },
      });

      if (existing.commissionTransaction) {
        if (fraisOrganisateurEffectif <= 0) {
          await tx.transaction.delete({
            where: { id: existing.commissionTransaction.id },
          });
          await tx.tontineCotisation.update({
            where: { id: cotisationIntId },
            data: { commissionTransaction: { disconnect: true } },
          });
        } else {
          await tx.transaction.update({
            where: { id: existing.commissionTransaction.id },
            data: { amount: fraisOrganisateurEffectif },
          });
        }
      } else if (fraisOrganisateurEffectif > 0 && statut !== "en_attente") {
        const commissionCategorie = await tx.category.upsert({
          where: { name_userId: { name: "Commission tontine", userId } },
          update: {},
          create: { name: "Commission tontine", icon: "hand-holding-dollar", type: "income", userId },
        });
        const transaction = await tx.transaction.create({
          data: {
            type: "income",
            amount: fraisOrganisateurEffectif,
            description: `Tontine — commission : ${tontine.nom}`,
            date: datePaiement ? new Date(datePaiement) : new Date(),
            scope: tontine.scopeCommission === "personnel" ? "personal" : "activity",
            categoryId: commissionCategorie.id,
            userId,
            tontineCotisationId: cotisation.id,
          },
        });
        notificationInfo = { amount: transaction.amount };
        notificationSent = true;
      }

      // Montant déjà imputé sur les jours de mise suivants (payés d'avance).
      const chaineImputee = await tx.tontineCotisation.aggregate({
        where: {
          tontineId,
          membreId: existing.membreId,
          imputee: true,
          periode: { gt: existing.periode },
        },
        _sum: { montantPaye: true },
      });
      const montantChaineImputee = chaineImputee._sum.montantPaye || 0;

      if (montantChaineImputee > surplus) {
        // La mise est réduite : les jours suivants rendent l'argent,
        // des plus lointains vers les plus proches (commissions retirées),
        // l'excédent restant redevient une avance.
        await desimputerSurplus(tx, {
          tontineId,
          membreId: existing.membreId,
          periodeDate: existing.periode,
          reduction: montantChaineImputee - surplus,
          fraisOrganisateur: tontine.fraisOrganisateurParDefaut,
        });
      } else if (surplus > montantChaineImputee && membre) {
        // La mise est augmentée : le surplus impute les jours de mise suivants.
        await imputerSurplus(tx, {
          userId,
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
          membre: { id: membre.id, montantCotisationPersonnel: membre.montantCotisationPersonnel },
          periodeDate: existing.periode,
          surplus: surplus - montantChaineImputee,
        });
      }

      const toursAActualiser = new Set<number>();
      if (existing.tourId) toursAActualiser.add(existing.tourId);
      if (cotisation.tourId) toursAActualiser.add(cotisation.tourId);
      for (const tourIdToUpdate of toursAActualiser) {
        await recalculerMontantCollecteTour(tourIdToUpdate, tx);
      }

      return cotisation;
    });

    if (notificationSent && notificationInfo) {
      const amount = (notificationInfo as { amount: number }).amount;
      const notifCurrency = resolveCurrency((await prisma.user.findUnique({ where: { id: userId }, select: { currency: true } }))?.currency);
      const scopeLabel = tontine.scopeCommission === "personnel" ? "" : " (Activité)";
      await createNotification(userId, "transaction", `Revenu : ${formatCurrency(amount, notifCurrency)}${scopeLabel} — Commission tontine : ${tontine.nom}`, "/dashboard/transactions");
    }

    await recalculerSoldeAvanceMembre(existing.membreId);

    return ok({ cotisation: result });
  } catch {
    return badRequest("Erreur lors de la mise à jour");
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; cotisationId: string }> }) {
  try {
    let userId: number;
    try { userId = await requireTontineAccess(); } catch (e) {
      if (e instanceof Error && e.message === "Forbidden") return forbidden();
      return unauthorized();
    }

    const { id, cotisationId } = await params;
    const tontineId = parseInt(id);
    const cotisationIntId = parseInt(cotisationId);
    if (!tontineId || !cotisationIntId) return badRequest("ID invalide");

    const tontine = await prisma.tontine.findFirst({
      where: { id: tontineId, organisateurId: userId },
    });
    if (!tontine) return badRequest("Tontine introuvable");

    const existing = await prisma.tontineCotisation.findFirst({
      where: { id: cotisationIntId, tontineId },
      include: { commissionTransaction: true },
    });
    if (!existing) return badRequest("Cotisation introuvable");

    const tourIdToDelete = existing.tourId;

    await prisma.$transaction(async (tx) => {
      // La mise supprimée était payée : les jours suivants payés d'avance
      // rendent l'argent (des plus lointains vers les plus proches), l'excédent
      // restant redevient une avance.
      if (existing.montantPaye > 0) {
        await desimputerSurplus(tx, {
          tontineId,
          membreId: existing.membreId,
          periodeDate: existing.periode,
          reduction: existing.montantPaye,
          fraisOrganisateur: tontine.fraisOrganisateurParDefaut,
        });
      }

      if (existing.commissionTransaction) {
        await tx.transaction.delete({
          where: { id: existing.commissionTransaction.id },
        });
      }
      await tx.tontineCotisation.delete({ where: { id: cotisationIntId } });
    });

    if (tourIdToDelete) {
      await recalculerMontantCollecteTour(tourIdToDelete);
    }

    await recalculerSoldeAvanceMembre(existing.membreId);

    return ok({ success: true });
  } catch {
    return badRequest("Erreur lors de la suppression");
  }
}
