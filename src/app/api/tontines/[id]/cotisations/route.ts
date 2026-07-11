import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { unauthorized, badRequest, ok, created } from "@/lib/api";

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

      // Générer automatiquement la transaction pour la commission
      if (fraisOrganisateurEffectif > 0 && (statut === "paye" || statut === "partiel")) {
        const description = `Tontine — commission : ${tontine.nom} (${tontine.type === "rotative_simple" ? "tour" : "cotisation"})`;

        const commissionCategorie = await tx.category.upsert({
          where: { name_userId: { name: "Commission tontine", userId } },
          update: {},
          create: { name: "Commission tontine", icon: "hand-holding-dollar", type: "income", userId },
        });

        const transaction = await tx.transaction.create({
          data: {
            type: "income",
            amount: fraisOrganisateurEffectif,
            description,
            date: datePaiement ? new Date(datePaiement) : new Date(),
            scope: tontine.scopeCommission === "personnel" ? "personal" : "activity",
            categoryId: commissionCategorie.id,
            userId,
            tontineCotisationId: cotisation.id,
          },
        });

        return { ...cotisation, commissionTransaction: transaction };
      }

      return { ...cotisation, commissionTransaction: null };
    });

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
