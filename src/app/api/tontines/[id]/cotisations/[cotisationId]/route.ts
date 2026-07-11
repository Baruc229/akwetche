import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { unauthorized, badRequest, ok } from "@/lib/api";

function calculerProrata(
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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; cotisationId: string }> }) {
  try {
    const userId = await getAuthUserId();
    if (!userId) return unauthorized();

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

    const statut =
      parsedMontantPaye <= 0
        ? "en_attente"
        : parsedMontantPaye >= existing.montantTotal
          ? "paye"
          : "partiel";

    const { fraisOrganisateurEffectif } = calculerProrata(
      parsedMontantPaye,
      existing.montantTotal,
      existing.montantBase,
      existing.fraisOrganisateur
    );

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mettre à jour la cotisation
      const cotisation = await tx.tontineCotisation.update({
        where: { id: cotisationIntId },
        data: {
          montantPaye: parsedMontantPaye,
          datePaiement: datePaiement ? new Date(datePaiement) : parsedMontantPaye > 0 ? new Date() : null,
          statut,
        },
      });

      // 2. Gérer la transaction liée (réversibilité)
      if (existing.commissionTransaction) {
        if (fraisOrganisateurEffectif <= 0) {
          // Supprimer la transaction si la commission devient nulle
          await tx.transaction.delete({
            where: { id: existing.commissionTransaction.id },
          });
          await tx.tontineCotisation.update({
            where: { id: cotisationIntId },
            data: { commissionTransaction: { disconnect: true } },
          });
        } else {
          // Ajuster le montant de la transaction existante
          await tx.transaction.update({
            where: { id: existing.commissionTransaction.id },
            data: { amount: fraisOrganisateurEffectif },
          });
        }
      } else if (fraisOrganisateurEffectif > 0 && statut !== "en_attente") {
        // Créer une nouvelle transaction
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
            scope: tontine.scopeCommission,
            categoryId: commissionCategorie.id,
            userId,
            tontineCotisationId: cotisation.id,
          },
        });
      }

      return cotisation;
    });

    return ok({ cotisation: result });
  } catch {
    return badRequest("Erreur lors de la mise à jour");
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; cotisationId: string }> }) {
  try {
    const userId = await getAuthUserId();
    if (!userId) return unauthorized();

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
