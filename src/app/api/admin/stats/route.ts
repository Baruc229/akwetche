import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { unauthorized, ok } from "@/lib/api";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const admin = await prisma.user.findUnique({ where: { id: userId } });
  if (!admin || admin.role === "user") return unauthorized();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
  ]);

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
  });
}
