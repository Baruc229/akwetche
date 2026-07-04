import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, badRequest, ok, created } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    const budgets = await prisma.budget.findMany({
      where: { userId, month, year },
      include: { category: { select: { id: true, name: true, icon: true, type: true } } },
      orderBy: [{ scope: "asc" }, { category: { name: "asc" } }],
    });

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);

    const budgetsWithSpent = await Promise.all(
      budgets.map(async (b) => {
        const spent = await prisma.transaction.aggregate({
          where: {
            userId,
            type: "expense",
            categoryId: b.categoryId,
            scope: b.scope,
            date: { gte: monthStart, lt: monthEnd },
          },
          _sum: { amount: true },
        });
        return { ...b, spent: spent._sum.amount || 0 };
      })
    );

    const totalExpensesByScope = await prisma.transaction.groupBy({
      by: ["scope"],
      where: {
        userId,
        type: "expense",
        date: { gte: monthStart, lt: monthEnd },
      },
      _sum: { amount: true },
    });

    return ok({
      budgets: budgetsWithSpent,
      totalExpenses: Object.fromEntries(
        totalExpensesByScope.map((g) => [g.scope, g._sum.amount || 0])
      ),
    });
  } catch {
    return badRequest("Erreur");
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { categoryId, scope, amount, month, year } = await req.json();

    if (!categoryId || !amount) {
      return badRequest("Catégorie et montant requis");
    }

    const budget = await prisma.budget.upsert({
      where: {
        userId_categoryId_scope_month_year: {
          userId,
          categoryId: parseInt(categoryId),
          scope: scope || "personal",
          month: month || new Date().getMonth() + 1,
          year: year || new Date().getFullYear(),
        },
      },
      update: { amount: parseFloat(amount) },
      create: {
        categoryId: parseInt(categoryId),
        scope: scope || "personal",
        amount: parseFloat(amount),
        month: month || new Date().getMonth() + 1,
        year: year || new Date().getFullYear(),
        userId,
      },
      include: { category: { select: { id: true, name: true, icon: true, type: true } } },
    });

    return created({ budget });
  } catch {
    return badRequest("Erreur lors de la création");
  }
}
