import { prisma } from "@/lib/prisma";
import { requireAuth, badRequest, ok } from "@/lib/api";

export async function GET() {
  try {
    const userId = await requireAuth();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, subscription: { select: { status: true } } },
    });
    if (!user) return badRequest("Utilisateur introuvable");

    const isPremium = user.subscription?.status === "active" || user.role !== "user";

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [incomeCount, expenseCount, categoryCount] = await Promise.all([
      prisma.transaction.count({
        where: { userId, type: "income", date: { gte: startOfMonth } },
      }),
      prisma.transaction.count({
        where: { userId, type: "expense", date: { gte: startOfMonth } },
      }),
      prisma.category.count({ where: { userId, archived: false } }),
    ]);

    return ok({
      isPremium,
      incomeCount,
      expenseCount,
      categoryCount,
      maxFreeIncome: 5,
      maxFreeExpense: 5,
      maxFreeCategories: 3,
    });
  } catch {
    return badRequest("Erreur");
  }
}
