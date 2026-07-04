import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, badRequest, ok, created } from "@/lib/api";

export async function GET() {
  try {
    const userId = await requireAuth();

    const templates = await prisma.recurringTemplate.findMany({
      where: { userId },
      include: { category: { select: { id: true, name: true, icon: true, type: true } } },
      orderBy: [{ dayOfMonth: "asc" }, { type: "asc" }],
    });

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const templatesWithGenerated = await Promise.all(
      templates.map(async (t) => {
        const generatedCount = await prisma.transaction.count({
          where: {
            userId,
            recurring: true,
            categoryId: t.categoryId,
            amount: t.amount,
            type: t.type,
            scope: t.scope,
            date: {
              gte: new Date(year, month - 1, 1),
              lt: new Date(year, month, 1),
            },
          },
        });
        return { ...t, generatedThisMonth: generatedCount };
      })
    );

    return ok({ templates: templatesWithGenerated });
  } catch {
    return badRequest("Erreur");
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { name, amount, type, scope, dayOfMonth, categoryId } = await req.json();

    if (!name || !amount || !type || !dayOfMonth) {
      return badRequest("Nom, montant, type et jour d'échéance requis");
    }

    const template = await prisma.recurringTemplate.create({
      data: {
        name,
        amount: parseFloat(amount),
        type,
        scope: scope || "personal",
        dayOfMonth: parseInt(dayOfMonth),
        categoryId: categoryId ? parseInt(categoryId) : null,
        userId,
      },
      include: { category: { select: { id: true, name: true, icon: true, type: true } } },
    });

    return created({ template });
  } catch {
    return badRequest("Erreur lors de la création");
  }
}
