import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, badRequest, ok } from "@/lib/api";

export async function POST(_req: NextRequest) {
  try {
    const userId = await requireAuth();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return badRequest("Utilisateur introuvable");

    await prisma.$transaction([
      prisma.stockMovement.deleteMany({ where: { userId } }),
      prisma.sale.deleteMany({ where: { userId } }),
      prisma.transaction.deleteMany({ where: { userId } }),
      prisma.product.deleteMany({ where: { userId } }),
      prisma.category.deleteMany({ where: { userId } }),
      prisma.report.deleteMany({ where: { userId } }),
      prisma.notification.deleteMany({ where: { userId } }),
      prisma.user.update({
        where: { id: userId },
        data: { initialBalance: 0, initialBalanceActivity: 0 },
      }),
    ]);

    return ok({ message: "Toutes les données ont été réinitialisées." });
  } catch (e) {
    console.error("Reset error:", e);
    return badRequest("Erreur lors de la réinitialisation");
  }
}
