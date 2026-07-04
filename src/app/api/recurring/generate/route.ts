import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, badRequest, ok } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();

    const now = new Date();
    const today = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);

    const templates = await prisma.recurringTemplate.findMany({
      where: { userId, active: true, dayOfMonth: { lte: today } },
      include: { category: { select: { id: true, name: true, type: true } } },
    });

    let createdCount = 0;

    for (const template of templates) {
      const existing = await prisma.transaction.findFirst({
        where: {
          userId,
          recurring: true,
          type: template.type,
          amount: template.amount,
          categoryId: template.categoryId,
          scope: template.scope,
          date: { gte: monthStart, lt: monthEnd },
        },
      });

      if (existing) continue;

      const dueDate = new Date(year, month - 1, Math.min(template.dayOfMonth, new Date(year, month, 0).getDate()));

      await prisma.transaction.create({
        data: {
          type: template.type,
          amount: template.amount,
          description: template.name,
          date: dueDate,
          scope: template.scope,
          recurring: true,
          categoryId: template.categoryId,
          userId,
        },
      });

      createdCount++;
    }

    return ok({ created: createdCount, total: templates.length });
  } catch {
    return badRequest("Erreur lors de la génération");
  }
}
