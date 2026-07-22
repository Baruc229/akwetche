import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, badRequest, created } from "@/lib/api";
import { FREE_CATEGORY_LIMIT_PER_TYPE } from "@/lib/limits";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { categories } = await req.json();

    if (!Array.isArray(categories) || categories.length === 0) {
      return badRequest("Tableau de catégories requis");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        subscription: { select: { status: true } },
      },
    });
    const isPremium = user?.subscription?.status === "active" || user?.role !== "user";

    const existing = await prisma.category.findMany({
      where: { userId },
      select: { name: true, type: true, archived: true },
    });
    const existingKeys = new Set(existing.map((c) => `${c.type}:${c.name}`));

    let toCreate = categories.filter(
      (c: { name: string; type: string }) => !existingKeys.has(`${c.type}:${c.name}`)
    );

    let skipped = 0;
    if (!isPremium) {
      const incomeExisting = existing.filter((c) => !c.archived && c.type === "income").length;
      const expenseExisting = existing.filter((c) => !c.archived && c.type === "expense").length;
      const incomeRoom = Math.max(0, FREE_CATEGORY_LIMIT_PER_TYPE - incomeExisting);
      const expenseRoom = Math.max(0, FREE_CATEGORY_LIMIT_PER_TYPE - expenseExisting);
      const incomeItems = toCreate.filter((c: { type: string }) => c.type === "income");
      const expenseItems = toCreate.filter((c: { type: string }) => c.type === "expense");
      const trimmed = [
        ...incomeItems.slice(0, incomeRoom),
        ...expenseItems.slice(0, expenseRoom),
      ];
      skipped = toCreate.length - trimmed.length;
      toCreate = trimmed;
    }

    if (toCreate.length === 0) {
      return created({ categories: [], skipped });
    }

    const createdCategories = await prisma.$transaction(
      toCreate.map((c: { name: string; icon?: string; type: string }) =>
        prisma.category.create({
          data: { name: c.name, icon: c.icon || "", type: c.type, userId },
        })
      )
    );

    return created({ categories: createdCategories, skipped });
  } catch {
    return badRequest("Erreur lors de la création");
  }
}
