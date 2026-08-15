import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTontineAccess, forbidden, unauthorized, ok, badRequest } from "@/lib/api";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: number;
  try { userId = await requireTontineAccess(); } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return forbidden();
    return unauthorized();
  }

  const { id } = await params;
  const tontineId = parseInt(id);
  if (!tontineId) return badRequest("ID invalide");

  try {
    const count = await prisma.transaction.count({
      where: { userId, tontineCotisation: { tontineId } },
    });
    return ok({ count });
  } catch {
    return badRequest("Erreur lors du comptage des commissions");
  }
}

/**
 * Retire les transactions de commission d'UNE tontine précise et désactive la
 * comptabilisation automatique pour celle-ci.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: number;
  try { userId = await requireTontineAccess(); } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return forbidden();
    return unauthorized();
  }

  const { id } = await params;
  const tontineId = parseInt(id);
  if (!tontineId) return badRequest("ID invalide");

  try {
    const tontine = await prisma.tontine.findFirst({
      where: { id: tontineId, organisateurId: userId },
    });
    if (!tontine) return badRequest("Tontine introuvable");

    const removed = await prisma.transaction.deleteMany({
      where: { userId, tontineCotisation: { tontineId } },
    });

    const tontineUpdate = await prisma.tontine.update({
      where: { id: tontineId },
      data: { commissionsTransactionsEnabled: false },
      select: { commissionsTransactionsEnabled: true },
    });

    return ok({ removed: removed.count, commissionsTransactionsEnabled: tontineUpdate.commissionsTransactionsEnabled });
  } catch {
    return badRequest("Erreur lors du retrait des commissions");
  }
}
