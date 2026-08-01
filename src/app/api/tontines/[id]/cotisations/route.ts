import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTontineAccess, forbidden, unauthorized, badRequest, ok, created } from "@/lib/api";
import { createNotification } from "@/lib/notifications";
import { formatCurrency, resolveCurrency } from "@/lib/currency";
import { calculerProrata, calculerMontantTotalAvecPenalite, calculerStatutCotisation, getFrequenceJours, trouverTourPourPeriode, imputerSurplus, recalculerMontantCollecteTour } from "@/lib/tontine";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
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

    const { membreId, periode, montantPaye, datePaiement } = await req.json();
    if (!membreId || !periode) return badRequest("membreId et periode requis");

    const membre = await prisma.tontineMembre.findFirst({
      where: { id: parseInt(membreId), tontineId },
    });
    if (!membre) return badRequest("Membre introuvable");

    const montantMise = membre.montantCotisationPersonnel ?? tontine.montantCotisation;
    const montantBase = montantMise - tontine.fraisOrganisateurParDefaut;
    const fraisOrg = tontine.fraisOrganisateurParDefaut;
    const parsedMontantPaye = parseFloat(montantPaye || "0");
    const periodeDate = new Date(periode);
    const frequenceJours = getFrequenceJours(tontine.frequence);

    const dateLimite = new Date(periodeDate.getTime() + frequenceJours * 24 * 60 * 60 * 1000);
    const now = new Date();

    const { montantTotal, montantPenalite } = calculerMontantTotalAvecPenalite(
      montantMise,
      tontine.penaliteRetardActive,
      tontine.penaliteRetardMontant,
      tontine.penaliteRetardDelaiJours,
      periodeDate,
      now
    );

    const existing = await prisma.tontineCotisation.findFirst({
      where: { tontineId, membreId: membre.id, periode: periodeDate },
      include: { commissionTransaction: true },
    });

    // L'avance disponible couvre d'abord la période courante, puis devient surplus.
    const montantEffectifDus = Math.max(0, montantTotal - (existing ? existing.montantPaye : 0));
    const soldeApplique = Math.min(membre.soldeAvance || 0, montantEffectifDus);
    const montantEffectifDusApresAvance = montantEffectifDus - soldeApplique;
    const totalCouvert = parsedMontantPaye + soldeApplique;
    const estEnRetard = now > dateLimite && totalCouvert < montantEffectifDusApresAvance;

    const montantCotisationCours = Math.min(totalCouvert, montantEffectifDusApresAvance);
    const surplus = Math.max(0, totalCouvert - montantCotisationCours);
    const nouveauPaye = (existing ? existing.montantPaye : 0) + montantCotisationCours;
    const statut = nouveauPaye >= montantTotal
      ? "paye"
      : calculerStatutCotisation(nouveauPaye, montantTotal, estEnRetard);

    // Commission organisateur : au prorata du total payé sur la période, moins celle déjà comptabilisée.
    const fraisOrgTotal = calculerProrata(nouveauPaye, montantTotal, montantBase, fraisOrg).fraisOrganisateurEffectif;
    const fraisOrgExistant = existing?.commissionTransaction?.amount ?? 0;
    const fraisOrganisateurEffectif = Math.max(0, Math.round((fraisOrgTotal - fraisOrgExistant) * 100) / 100);

    const datePaiementEffective = datePaiement
      ? new Date(datePaiement)
      : parsedMontantPaye > 0
        ? now
        : existing?.datePaiement ?? null;

    let commissionTx: { amount: number } | null = null;

    const result = await prisma.$transaction(async (tx) => {
      let cotisation;
      if (existing) {
        cotisation = await tx.tontineCotisation.update({
          where: { id: existing.id },
          data: {
            montantPaye: nouveauPaye,
            montantPenalite,
            statut,
            datePaiement: datePaiementEffective,
          },
        });
      } else {
        const tourId = tontine.type === "rotative_simple" ? await trouverTourPourPeriode(tontineId, periodeDate, tx) : null;
        cotisation = await tx.tontineCotisation.create({
          data: {
            tontineId,
            membreId: membre.id,
            tourId,
            periode: periodeDate,
            montantBase,
            fraisOrganisateur: fraisOrg,
            montantTotal,
            montantPaye: nouveauPaye,
            montantPenalite,
            datePaiement: datePaiementEffective,
            statut,
          },
        });
      }

      if (fraisOrganisateurEffectif > 0 && nouveauPaye > 0) {
        if (existing?.commissionTransaction) {
          await tx.transaction.update({
            where: { id: existing.commissionTransaction.id },
            data: { amount: { increment: fraisOrganisateurEffectif } },
          });
          commissionTx = { amount: fraisOrgTotal };
        } else {
          const commissionCategorie = await tx.category.upsert({
            where: { name_userId: { name: "Commission tontine", userId } },
            update: {},
            create: { name: "Commission tontine", icon: "hand-holding-dollar", type: "income", userId },
          });
          const newTx = await tx.transaction.create({
            data: {
              type: "income",
              amount: fraisOrganisateurEffectif,
              description: `Tontine — commission : ${tontine.nom}`,
              date: datePaiementEffective ?? new Date(),
              scope: tontine.scopeCommission === "personnel" ? "personal" : "activity",
              categoryId: commissionCategorie.id,
              userId,
              tontineCotisationId: cotisation.id,
            },
          });
          commissionTx = { amount: newTx.amount };
        }
      }

      if (soldeApplique > 0) {
        await tx.tontineMembre.update({
          where: { id: membre.id },
          data: { soldeAvance: { decrement: soldeApplique } },
        });
      }

      let surplusResult = { futuresImbriquees: 0, soldeRestant: 0 };
      if (surplus > 0) {
        surplusResult = await imputerSurplus(tx, {
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
          periodeDate,
          surplus,
        });
      }

      if (cotisation.tourId) {
        await recalculerMontantCollecteTour(cotisation.tourId, tx);
      }

      return { cotisation, surplusResult };
    });

    if (commissionTx) {
      const amount = (commissionTx as { amount: number }).amount;
      const userCurrency = await prisma.user.findUnique({
        where: { id: userId },
        select: { currency: true },
      });
      const notifCurrency = resolveCurrency(userCurrency?.currency);
      const scopeLabel = tontine.scopeCommission === "personnel" ? "" : " (Activité)";
      await createNotification(
        userId,
        "transaction",
        `Revenu : ${formatCurrency(amount, notifCurrency)}${scopeLabel} — Tontine — commission : ${tontine.nom}`,
        "/dashboard/transactions"
      );
    }

    return created({
      cotisation: result.cotisation,
      soldeApplique,
      avance: surplus > 0 ? { surplus, ...result.surplusResult } : null,
    });
  } catch {
    return badRequest("Erreur lors de l'enregistrement de la cotisation");
  }
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

  const { searchParams } = new URL(req.url);
  const membreId = searchParams.get("membreId");
  const periodeStart = searchParams.get("periodeStart");
  const periodeEnd = searchParams.get("periodeEnd");

  const where: Record<string, unknown> = { tontineId };
  if (membreId) where.membreId = parseInt(membreId);
  if (periodeStart && periodeEnd) {
    where.periode = { gte: new Date(periodeStart), lte: new Date(periodeEnd) };
  }

  const cotisations = await prisma.tontineCotisation.findMany({
    where,
    include: { membre: true, commissionTransaction: true },
    orderBy: [{ periode: "desc" }, { id: "desc" }],
  });

  return ok({ cotisations });
}
