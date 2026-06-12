import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, badRequest, ok } from "@/lib/api";
import {
  getStartOfWeek, getEndOfWeek,
  getStartOfMonth, getEndOfMonth,
  getStartOfYear, getEndOfYear,
} from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "monthly";
    const now = new Date();

    let startDate: Date;
    let endDate: Date;
    let previousStart: Date;
    let previousEnd: Date;

    if (type === "weekly") {
      startDate = getStartOfWeek(now);
      endDate = getEndOfWeek(now);
      const prevWeek = new Date(startDate);
      prevWeek.setDate(prevWeek.getDate() - 7);
      previousStart = getStartOfWeek(prevWeek);
      previousEnd = getEndOfWeek(prevWeek);
    } else if (type === "yearly") {
      startDate = getStartOfYear(now);
      endDate = getEndOfYear(now);
      const prevYear = new Date(startDate);
      prevYear.setFullYear(prevYear.getFullYear() - 1);
      previousStart = getStartOfYear(prevYear);
      previousEnd = getEndOfYear(prevYear);
    } else {
      startDate = getStartOfMonth(now);
      endDate = getEndOfMonth(now);
      const prevMonth = new Date(startDate);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      previousStart = getStartOfMonth(prevMonth);
      previousEnd = getEndOfMonth(prevMonth);
    }

    const [currentTransactions, previousTransactions, user] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId, date: { gte: startDate, lte: endDate } },
        include: { category: true },
      }),
      prisma.transaction.findMany({
        where: { userId, date: { gte: previousStart, lte: previousEnd } },
        include: { category: true },
      }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);

    const calcStats = (txns: typeof currentTransactions) => {
      const income = txns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const expense = txns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      const byCat: Record<string, number> = {};
      txns.filter(t => t.type === "expense").forEach(t => {
        byCat[t.category.name] = (byCat[t.category.name] || 0) + t.amount;
      });
      return { income, expense, savings: income - expense, topCategories: byCat };
    };

    const current = calcStats(currentTransactions);
    const previous = calcStats(previousTransactions);

    const currentPersonal = calcStats(currentTransactions.filter(t => t.scope === "personal"));
    const previousPersonal = calcStats(previousTransactions.filter(t => t.scope === "personal"));
    const currentActivity = calcStats(currentTransactions.filter(t => t.scope === "activity"));
    const previousActivity = calcStats(previousTransactions.filter(t => t.scope === "activity"));

    const salesData = await prisma.sale.findMany({
      where: { userId, date: { gte: getStartOfYear(now), lte: getEndOfYear(now) } },
      include: { product: true },
    });

    const totalRevenue = salesData.reduce((s, sale) => s + sale.totalAmount, 0);
    const totalProfit = salesData.reduce((s, sale) => s + sale.profit, 0);

    const products = await prisma.product.findMany({ where: { userId } });
    const stockValue = products.reduce((s, p) => s + p.purchasePrice * p.stock, 0);

    const productSales: Record<string, { name: string; total: number; quantity: number }> = {};
    salesData.forEach(sale => {
      const key = sale.product.name;
      if (!productSales[key]) productSales[key] = { name: key, total: 0, quantity: 0 };
      productSales[key].total += sale.totalAmount;
      productSales[key].quantity += sale.quantity;
    });

    const mostProfitable = Object.values(productSales).sort((a, b) => b.total - a.total).slice(0, 5);
    const mostSold = Object.values(productSales).sort((a, b) => b.quantity - a.quantity).slice(0, 5);

    const calcEvo = (cur: number, prev: number) => prev ? ((cur - prev) / prev * 100).toFixed(1) : null;

    return ok({
      period: { start: startDate, end: endDate, type },
      current,
      previous,
      evolution: {
        income: calcEvo(current.income, previous.income),
        expense: calcEvo(current.expense, previous.expense),
        savings: calcEvo(current.savings, previous.savings),
      },
      personal: {
        current: currentPersonal,
        previous: previousPersonal,
        evolution: {
          income: calcEvo(currentPersonal.income, previousPersonal.income),
          expense: calcEvo(currentPersonal.expense, previousPersonal.expense),
          savings: calcEvo(currentPersonal.savings, previousPersonal.savings),
        },
      },
      activity: {
        current: currentActivity,
        previous: previousActivity,
        evolution: {
          income: calcEvo(currentActivity.income, previousActivity.income),
          expense: calcEvo(currentActivity.expense, previousActivity.expense),
          savings: calcEvo(currentActivity.savings, previousActivity.savings),
        },
      },
      commercial: {
        revenue: totalRevenue,
        profit: totalProfit,
        stockValue,
        productCount: products.length,
        outOfStock: products.filter(p => p.stock === 0).length,
        mostProfitable,
        mostSold,
      },
      initialBalance: user?.initialBalance || 0,
      initialBalanceActivity: user?.initialBalanceActivity || 0,
    });
  } catch (e) {
    console.error("Report error:", e);
    return badRequest("Erreur lors de la génération du rapport");
  }
}
