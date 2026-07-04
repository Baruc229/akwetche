import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, badRequest, ok } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { searchParams } = new URL(req.url);
    const days = Math.min(Math.max(parseInt(searchParams.get("days") || "30", 10) || 30, 1), 365);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { initialBalance: true, initialBalanceActivity: true },
    });

    const personalInitial = user?.initialBalance || 0;
    const activityInitial = user?.initialBalanceActivity || 0;
    const totalInitial = personalInitial + activityInitial;

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      select: { date: true, type: true, amount: true },
      orderBy: { date: "asc" },
    });

    const now = new Date();
    const result: { date: string; balance: number }[] = [];
    let runningBalance = totalInitial;
    let txIndex = 0;

    for (let i = days - 1; i >= 0; i--) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const endOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);

      while (txIndex < transactions.length && transactions[txIndex].date <= endOfDay) {
        const tx = transactions[txIndex];
        if (tx.type === "income") {
          runningBalance += tx.amount;
        } else {
          runningBalance -= tx.amount;
        }
        txIndex++;
      }

      result.push({
        date: day.toISOString().slice(0, 10),
        balance: Math.round(runningBalance * 100) / 100,
      });
    }

    return ok(result);
  } catch {
    return badRequest("Non autorisé");
  }
}
