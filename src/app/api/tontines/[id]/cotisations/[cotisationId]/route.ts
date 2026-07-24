import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTontineAccess, forbidden, unauthorized, badRequest, ok } from "@/lib/api";
import { createNotification } from "@/lib/notifications";
import { formatCurrency, resolveCurrency } from "@/lib/currency";
import { calculerProrata, calculerMontantTotalAvecPenalite, calculerStatutCotisation, getFrequenceJours } from "@/lib/tontine";

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

    const { montantPaye, datePaiement } = await req.json();
    if (montantPaye === undefined) return badRequest("montantPaye requis");

    const parsedMontantPaye = parseFloat(montantPaye);

    const frequenceJours = getFrequenceJours(tontine.frequence);
    const dateLimite = new Date(existing.periode.getTime() + frequenceJours * 24 * 60 * 60 * 1000);
    const now = new Date();
    const estEnRetard = now > dateLimite && parsedMontantPaye < existing.montantTotal;

    const { montantTotal, montantPenalite } = calculerMontantTotalAvecPenalite(
      tontine.montantCotisation,
      tontine.penaliteRetardActive,
      tontine.penaliteRetardMontant,
      tontine.penaliteRetardDelaiJours,
      existing.periode,
      now
    );

    const statut = calculerStatutCotisation(parsedMontantPaye, montantTotal, estEnRetard);

    const { fraisOrganisateurEffectif } = calculerProrata(
      parsedMontantPaye,
      montantTotal,
      existing.montantBase,
      existing.fraisOrganisateur
    );

    let notificationInfo: Record<string, number> | null = null;
    let notificationSent = false;

    const result = await prisma.$transaction(async (tx) => {
      const cotisation = await tx.tontineCotisation.update({
        where: { id: cotisationIntId },
        data: {
          montantPaye: parsedMontantPaye,
          montantTotal,
          montantPenalite,
          datePaiement: datePaiement ? new Date(datePaiement) : parsedMontantPaye > 0 ? new Date() : null,
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
        notificationInfo = { amount: transaction.amount } as Record<string, number>;
        notificationSent = true;
      }

      return cotisation;
    });

    if (notificationSent && notificationInfo) {
      const amount = (notificationInfo as { amount: number }).amount;
      const notifCurrency = resolveCurrency((await prisma.user.findUnique({ where: { id: userId }, select: { currency: true } }))?.currency);
      const scopeLabel = tontine.scopeCommission === "personnel" ? "" : " (Activité)";
      await createNotification(userId, "transaction", `Revenu : ${formatCurrency(amount, notifCurrency)}${scopeLabel} — Commission tontine : ${tontine.nom}`, "/dashboard/transactions");
    }

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

    await prisma.$transaction(async (tx) => {
      // Supprimer la transaction liée d'abord
      if (existing.commissionTransaction) {
        await tx.transaction.delete({
          where: { id: existing.commissionTransaction.id },
        });
      }
      await tx.tontineCotisation.delete({ where: { id: cotisationIntId } });
    });

    return ok({ success: true });
  } catch {
    return badRequest("Erreur lors de la suppression");
  }
}
