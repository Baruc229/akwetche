import { prisma } from "@/lib/prisma";
import { requireAdminAuth, unauthorized, forbidden, ok } from "@/lib/api";
import { reconcilierMembre } from "@/lib/tontine";

export async function POST() {
  try {
    await requireAdminAuth();
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return forbidden();
    return unauthorized();
  }

  const tontines = await prisma.tontine.findMany({
    select: { id: true },
  });

  let membresTraites = 0;
  let periodesImputees = 0;
  let soldeTotal = 0;

  for (const t of tontines) {
    const membres = await prisma.tontineMembre.findMany({
      where: { tontineId: t.id },
      select: { id: true },
    });
    for (const m of membres) {
      const result = await reconcilierMembre(t.id, m.id);
      membresTraites++;
      periodesImputees += result.imputees;
      soldeTotal += result.solde;
    }
  }

  return ok({
    message: "Backfill terminé",
    tontines: tontines.length,
    membresTraites,
    periodesImputees,
    soldeTotal,
  });
}
