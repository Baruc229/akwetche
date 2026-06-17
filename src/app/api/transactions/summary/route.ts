import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, badRequest, ok } from "@/lib/api";
import { getStartOfWeek, getEndOfWeek, getStartOfMonth, getEndOfMonth, getStartOfYear, getEndOfYear } from "@/lib/utils";

type ScopeSummary = {
  income: number;
  expense: number;
  savings: number;
  balance: number;
  initialBalance: number;
  topCategories: { name: string; icon: string; amount: number; type: string }[];
};

function computeScopeSummary(transactions: { type: string; amount: number; category: { name: string; icon: string } | null }[], initialBalance: number): ScopeSummary {
  const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const savings = income - expense;

  const byCategory: Record<string, { name: string; icon: string; amount: number; type: string }> = {};
  for (const t of transactions) {
    const key = t.category?.name || "Non catégorisé";
    if (!byCategory[key]) {
      byCategory[key] = { name: key, icon: t.category?.icon || "", amount: 0, type: t.type };
    }
    if (t.type === "income") {
      byCategory[key].amount += t.amount;
    } else {
      byCategory[key].amount -= t.amount;
    }
  }

  return {
    income,
    expense,
    savings,
    balance: initialBalance + savings,
    initialBalance,
    topCategories: Object.values(byCategory).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)),
  };
}

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "all";

    let startDate: Date | null = null;
    let endDate: Date | null = null;
    const now = new Date();

    if (period === "week") {
      startDate = getStartOfWeek(now);
      endDate = getEndOfWeek(now);
    } else if (period === "month") {
      startDate = getStartOfMonth(now);
      endDate = getEndOfMonth(now);
    } else if (period === "year") {
      startDate = getStartOfYear(now);
      endDate = getEndOfYear(now);
    }

    const where: Record<string, unknown> = { userId };
    if (startDate && endDate) {
      where.date = { gte: startDate, lte: endDate };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, initialBalance: true, initialBalanceActivity: true, subscription: { select: { status: true } } },
    });

    const isPremium = user?.subscription?.status === "active" || user?.role !== "user";
    if (!isPremium) {
      where.OR = [
        { category: { archived: false } },
        { categoryId: null },
      ];
    }

    const allTransactions = await prisma.transaction.findMany({
      where,
      include: { category: true },
    });
    const personalBalance = user?.initialBalance || 0;
    const activityBalance = user?.initialBalanceActivity || 0;

    const personal = computeScopeSummary(allTransactions.filter(t => t.scope === "personal"), personalBalance);
    const activity = computeScopeSummary(allTransactions.filter(t => t.scope === "activity"), activityBalance);

    return ok({ personal, activity });
  } catch {
    return badRequest("Non autorisé");
  }
}
