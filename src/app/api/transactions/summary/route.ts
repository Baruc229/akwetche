import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, badRequest, ok } from "@/lib/api";
import { getStartOfWeek, getEndOfWeek, getStartOfMonth, getEndOfMonth, getStartOfYear, getEndOfYear } from "@/lib/utils";

type Tx = { type: string; amount: number; recurring: boolean; category: { name: string; icon: string } | null };

type ScopeSummary = {
  income: number;
  expense: number;
  savings: number;
  balance: number;
  initialBalance: number;
  recurringExpense: number;
  pendingRecurringExpense: number;
  pendingRecurringIncome: number;
  topCategories: { name: string; icon: string; amount: number; type: string }[];
};

function computeScopeSummary(periodTxs: Tx[], allTxs: Tx[], initialBalance: number, pendingRecurringExpense = 0, pendingRecurringIncome = 0): ScopeSummary {
  const income = periodTxs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = periodTxs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const recurringExpense = periodTxs.filter(t => t.type === "expense" && t.recurring).reduce((s, t) => s + t.amount, 0);
  const savings = income - expense;

  const allIncome = allTxs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const allExpense = allTxs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const byCategory: Record<string, { name: string; icon: string; amount: number; type: string }> = {};
  for (const t of periodTxs) {
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
    balance: initialBalance + allIncome - allExpense,
    initialBalance,
    recurringExpense,
    pendingRecurringExpense,
    pendingRecurringIncome,
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

    const periodWhere: Record<string, unknown> = { userId };
    if (startDate && endDate) {
      periodWhere.date = { gte: startDate, lte: endDate };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, initialBalance: true, initialBalanceActivity: true, subscription: { select: { status: true } } },
    });

    const isPremium = user?.subscription?.status === "active" || user?.role !== "user";
    if (!isPremium) {
      periodWhere.OR = [
        { category: { archived: false } },
        { categoryId: null },
      ];
    }

    const periodTransactions = await prisma.transaction.findMany({
      where: periodWhere,
      include: { category: true },
    });

    const allWhere: Record<string, unknown> = { userId };
    if (!isPremium) {
      allWhere.OR = [
        { category: { archived: false } },
        { categoryId: null },
      ];
    }
    const allTransactions = await prisma.transaction.findMany({
      where: allWhere,
      include: { category: true },
    });

    const personalBalance = user?.initialBalance || 0;
    const activityBalance = user?.initialBalanceActivity || 0;

    const today = new Date().getDate();
    const templates = await prisma.recurringTemplate.findMany({
      where: { userId, active: true, dayOfMonth: { gt: today } },
      select: { scope: true, type: true, amount: true },
    });

    const pendingPersonalExpense = templates
      .filter(t => t.scope === "personal" && t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    const pendingPersonalIncome = templates
      .filter(t => t.scope === "personal" && t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const pendingActivityExpense = templates
      .filter(t => t.scope === "activity" && t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    const pendingActivityIncome = templates
      .filter(t => t.scope === "activity" && t.type === "income")
      .reduce((s, t) => s + t.amount, 0);

    const personal = computeScopeSummary(
      periodTransactions.filter(t => t.scope === "personal"),
      allTransactions.filter(t => t.scope === "personal"),
      personalBalance,
      pendingPersonalExpense,
      pendingPersonalIncome,
    );
    const activity = computeScopeSummary(
      periodTransactions.filter(t => t.scope === "activity"),
      allTransactions.filter(t => t.scope === "activity"),
      activityBalance,
      pendingActivityExpense,
      pendingActivityIncome,
    );

    return ok({ personal, activity });
  } catch {
    return badRequest("Non autorisé");
  }
}
