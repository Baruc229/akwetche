import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, badRequest, ok, created } from "@/lib/api";

export async function GET() {
  try {
    const userId = await requireAuth();

    const tontines = await prisma.tontine.findMany({
      where: { organisateurId: userId },
      include: {
        _count: { select: { membres: true } },
        cotisations: {
          where: { statut: "en_retard" },
          select: { id: true },
        },
      },
      orderBy: [
        { statut: "asc" },
        { dateDebut: "desc" },
      ],
    });

    const result = tontines.map((t) => ({
      ...t,
      membreCount: t._count.membres,
      retardsCount: t.cotisations.length,
    }));

    return ok({ tontines: result });
  } catch {
    return badRequest("Non autorisé");
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await req.json();

    const {
      nom,
      type,
      montantCotisation,
      frequence,
      dateDebut,
      fraisOrganisateurParDefaut,
      scopeCommission,
      nombreTours,
      dateDistribution,
    } = body;

    if (!nom || !type || !montantCotisation || !frequence || !dateDebut) {
      return badRequest("Champs obligatoires manquants");
    }
    if (!["rotative_simple", "vivres_fin_annee"].includes(type)) {
      return badRequest("Type invalide");
    }

    const tontine = await prisma.tontine.create({
      data: {
        nom,
        type,
        montantCotisation: parseFloat(montantCotisation),
        frequence,
        dateDebut: new Date(dateDebut),
        fraisOrganisateurParDefaut: parseFloat(fraisOrganisateurParDefaut || "0"),
        scopeCommission: scopeCommission || "activite",
        nombreTours: nombreTours ? parseInt(nombreTours) : null,
        dateDistribution: dateDistribution ? new Date(dateDistribution) : null,
        organisateurId: userId,
      },
    });

    return created({ tontine });
  } catch {
    return badRequest("Erreur lors de la création");
  }
}
