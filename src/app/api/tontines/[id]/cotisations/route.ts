import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { unauthorized, badRequest, ok, created } from "@/lib/api";
import { createNotification } from "@/lib/notifications";
import { formatCurrency, resolveCurrency } from "@/lib/currency";

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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getAuthUserId();
    if (!userId) return unauthorized();

    const { id } = await params;
    const tontineId = parseInt(id);
    if (!tontineId) return badRequest("ID invalide");

    const tontine = await prisma.tontine.findFirst({
      where: { id: tontineId, organisateurId: userId },
    });
    if (!tontine) return badRequest("Tontine introuvable");

    const { membreId, periode, montantPaye, datePaiement } = await req.json();
    if (!membreId || !periode) return badRequest("membreId et periode requis");

    const parsedMontantPaye = parseFloat(montantPaye || "0");

    const montantBase = tontine.montantCotisation - tontine.fraisOrganisateurParDefaut;
    const fraisOrg = tontine.fraisOrganisateurParDefaut;
    const montantTotal = tontine.montantCotisation;

    const { montantBaseEffectif, fraisOrganisateurEffectif } = calculerProrata(
      parsedMontantPaye,
      montantTotal,
      montantBase,
      fraisOrg
    );

    const statut =
      parsedMontantPaye <= 0
        ? "en_attente"
        : parsedMontantPaye >= montantTotal
          ? "paye"
          : "partiel";

    let commissionTx: Record<string, number> | null = null;
    const description = tontine.type === "rotative_simple"
      ? `Commission tontine : ${tontine.nom} (tour)`
      : `Commission tontine : ${tontine.nom} (cotisation)`;

    const cotisation = await prisma.$transaction(async (tx) => {
      const cotisation = await tx.tontineCotisation.create({
        data: {
          tontineId,
          membreId: parseInt(membreId),
          periode: new Date(periode),
          montantBase,
          fraisOrganisateur: fraisOrg,
          montantTotal,
          montantPaye: parsedMontantPaye,
          datePaiement: datePaiement ? new Date(datePaiement) : parsedMontantPaye > 0 ? new Date() : null,
          statut,
        },
      });

      if (fraisOrganisateurEffectif > 0 && (statut === "paye" || statut === "partiel")) {
        const txDescription = `Tontine \u2014 commission : ${tontine.nom} (${tontine.type === "rotative_simple" ? "tour" : "cotisation"})`;

        const commissionCategorie = await tx.category.upsert({
          where: { name_userId: { name: "Commission tontine", userId } },
          update: {},
          create: { name: "Commission tontine", icon: "hand-holding-dollar", type: "income", userId },
        });

        const newTx = await tx.transaction.create({
          data: {
            type: "income",
            amount: fraisOrganisateurEffectif,
            description: txDescription,
            date: datePaiement ? new Date(datePaiement) : new Date(),
            scope: tontine.scopeCommission === "personnel" ? "personal" : "activity",
            categoryId: commissionCategorie.id,
            userId,
            tontineCotisationId: cotisation.id,
          },
        });
        commissionTx = { amount: newTx.amount } as Record<string, number>;

        return { ...cotisation, commissionTransaction: newTx };
      }

      return { ...cotisation, commissionTransaction: null };
    });

    if (commissionTx) {
      const amount = (commissionTx as { amount: number }).amount;
      const userCurrency = await prisma.user.findUnique({
        where: { id: userId },
        select: { currency: true },
      });
      const notifCurrency = resolveCurrency(userCurrency?.currency);
      const scopeLabel = tontine.scopeCommission === "personnel" ? "" : " (Activit\u00E9)";
      await createNotification(
        userId,
        "transaction",
        `Revenu : ${formatCurrency(amount, notifCurrency)}${scopeLabel} \u2014 ${description}`,
        "/dashboard/transactions"
      );
    }

    return created({ cotisation });
  } catch {
    return badRequest("Erreur lors de l'enregistrement de la cotisation");
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

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
