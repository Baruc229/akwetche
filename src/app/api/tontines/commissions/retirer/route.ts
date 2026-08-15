import { prisma } from "@/lib/prisma";
import { requireTontineAccess, forbidden, unauthorized, ok, badRequest } from "@/lib/api";

/**
 * Retire TOUTES les transactions de commission tontine de l'utilisateur et
 * désactive la comptabilisation automatique (les commissions futures ne seront
 * plus créées comme revenus). Action utilisateur — self-serve, aucun admin.
 */
export async function POST() {
  let userId: number;
  try { userId = await requireTontineAccess(); } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return forbidden();
    return unauthorized();
  }

  try {
    const removed = await prisma.transaction.deleteMany({
      where: { userId, tontineCotisation: { isNot: null } },
    });

    const disabled = await prisma.tontine.updateMany({
      where: { organisateurId: userId },
      data: { commissionsTransactionsEnabled: false },
    });

    return ok({ removed: removed.count, disabled: disabled.count });
  } catch {
    return badRequest("Erreur lors du retrait des commissions");
  }
}

/** Compte le nombre de transactions de commission tontine de l'utilisateur. */
export async function GET() {
  let userId: number;
  try { userId = await requireTontineAccess(); } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return forbidden();
    return unauthorized();
  }

  try {
    const count = await prisma.transaction.count({
      where: { userId, tontineCotisation: { isNot: null } },
    });
    return ok({ count });
  } catch {
    return badRequest("Erreur");
  }
}
