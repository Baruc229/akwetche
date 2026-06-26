import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, badRequest, ok, created } from "@/lib/api";
import { createNotification } from "@/lib/notifications";
import { formatCurrency, resolveCurrency } from "@/lib/currency";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const type = searchParams.get("type");
    const scope = searchParams.get("scope");
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    const where: Record<string, unknown> = { userId };
    if (type) where.type = type;
    if (scope) where.scope = scope;
    if (start && end) {
      where.date = { gte: new Date(start), lte: new Date(end) };
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy: [{ date: "desc" }, { id: "desc" }],
        take: limit,
        skip: offset,
      }),
      prisma.transaction.count({ where }),
    ]);

    return ok({ transactions, total });
  } catch {
    return badRequest("Non autorisé");
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { type, amount, description, categoryId, date, scope } = await req.json();

    if (!type || !amount || !description || !categoryId) {
      return badRequest("Tous les champs sont requis");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        currency: true,
        baseCurrency: true,
        subscription: { select: { status: true } },
      },
    });
    const isPremium = user?.subscription?.status === "active" || user?.role !== "user";

    if (!isPremium) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthCount = await prisma.transaction.count({
        where: { userId, type, date: { gte: startOfMonth } },
      });
      if (monthCount >= 5) {
        return badRequest("Limite gratuite atteinte (5 " + (type === "income" ? "revenus" : "dépenses") + " par mois). Passez à Premium pour continuer.");
      }
    }

    const parsedAmount = parseFloat(amount);

    const transaction = await prisma.transaction.create({
      data: {
        type,
        amount: parsedAmount,
        description,
        scope: scope || "personal",
        categoryId: parseInt(categoryId),
        userId,
        date: date ? new Date(date) : new Date(),
      },
      include: { category: true },
    });

    const direction = type === "income" ? "Revenu" : "Dépense";
    const scopeLabel = transaction.scope === "activity" ? " (Activité)" : "";
    const notifCurrency = resolveCurrency(user?.currency);
    await createNotification(userId, "transaction", `${direction} : ${formatCurrency(parsedAmount, notifCurrency)}${scopeLabel} — ${description}`, "/dashboard/transactions");

    return created({ transaction });
  } catch {
    return badRequest("Erreur lors de la création");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { id } = await req.json();

    await prisma.transaction.deleteMany({
      where: { id: parseInt(id), userId },
    });

    return ok({ success: true });
  } catch {
    return badRequest("Erreur lors de la suppression");
  }
}
