import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { unauthorized, ok } from "@/lib/api";

function getMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthsRange(n: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(getMonthKey(d));
  }
  return months;
}

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const admin = await prisma.user.findUnique({ where: { id: userId } });
  if (!admin || admin.role === "user") return unauthorized();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [
    totalUsers,
    totalTransactions,
    totalSales,
    totalProducts,
    totalRevenue,
    activeSubscriptions,
    usersToday,
    loginAttemptsToday,
    failedLoginsToday,
    recentLogs,
    usersByCountry,
    usersByCurrency,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.transaction.count(),
    prisma.sale.count(),
    prisma.product.count(),
    prisma.sale.aggregate({ _sum: { totalAmount: true } }),
    prisma.subscription.count({ where: { status: "active" } }),
    prisma.user.count({ where: { createdAt: { gte: today } } }),
    prisma.loginLog.count({ where: { createdAt: { gte: today } } }),
    prisma.loginLog.count({ where: { createdAt: { gte: today }, success: false } }),
    prisma.loginLog.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.user.groupBy({
      by: ["countryCode"],
      _count: true,
      orderBy: { _count: { countryCode: "desc" } },
    }),
    prisma.user.groupBy({
      by: ["baseCurrency"],
      _count: true,
      orderBy: { _count: { baseCurrency: "desc" } },
    }),
  ]);

  const salesWithCurrency = await prisma.sale.findMany({
    select: {
      totalAmount: true,
      user: { select: { baseCurrency: true } },
    },
  });

  // -- Monthly aggregations --
  const [recentUsers, recentSales, recentSubHistories, recentSubs] = await Promise.all([
    prisma.user.findMany({ where: { createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true } }),
    prisma.sale.findMany({ where: { date: { gte: sixMonthsAgo } }, select: { totalAmount: true, date: true } }),
    prisma.subscriptionHistory.findMany({ where: { startDate: { gte: sixMonthsAgo } }, select: { amount: true, startDate: true } }),
    prisma.subscription.findMany({ where: { createdAt: { gte: sixMonthsAgo } }, select: { amount: true, createdAt: true } }),
  ]);

  const months = getMonthsRange(6);

  const userCountByMonth: Record<string, number> = {};
  recentUsers.forEach((u) => {
    const k = getMonthKey(u.createdAt);
    userCountByMonth[k] = (userCountByMonth[k] || 0) + 1;
  });
  const usersMonthly = months.map((m) => ({ month: m, count: userCountByMonth[m] || 0 }));

  const salesByMonth: Record<string, number> = {};
  recentSales.forEach((s) => {
    const k = getMonthKey(s.date);
    salesByMonth[k] = (salesByMonth[k] || 0) + s.totalAmount;
  });

  const subByMonth: Record<string, number> = {};
  recentSubHistories.forEach((s) => {
    const k = getMonthKey(s.startDate);
    subByMonth[k] = (subByMonth[k] || 0) + s.amount;
  });
  recentSubs.forEach((s) => {
    const k = getMonthKey(s.createdAt);
    subByMonth[k] = (subByMonth[k] || 0) + s.amount;
  });
  const revenueMonthly = months.map((m) => ({
    month: m,
    abonnements: Math.round(subByMonth[m] || 0),
    ventes: Math.round(salesByMonth[m] || 0),
  }));

  // --
  const revenueXOF = salesWithCurrency
    .filter((s) => (s.user?.baseCurrency || "XOF") === "XOF")
    .reduce((sum, s) => sum + s.totalAmount, 0);

  const revenueEUR = salesWithCurrency
    .filter((s) => (s.user?.baseCurrency || "XOF") === "EUR")
    .reduce((sum, s) => sum + s.totalAmount, 0);

  const subscriptionRevenue = await prisma.subscription.aggregate({
    _sum: { amount: true },
    where: { status: "active" },
  });

  return ok({
    totalUsers,
    totalTransactions,
    totalSales,
    totalProducts,
    totalRevenue: totalRevenue._sum.totalAmount || 0,
    activeSubscriptions,
    usersToday,
    loginAttemptsToday,
    failedLoginsToday,
    recentLogs,
    usersByCountry,
    usersByCurrency,
    revenueByCurrency: { XOF: revenueXOF, EUR: revenueEUR },
    subscriptionRevenue: subscriptionRevenue._sum.amount || 0,
    usersMonthly,
    revenueMonthly,
  });
}
