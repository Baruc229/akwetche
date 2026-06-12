import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, badRequest, created } from "@/lib/api";

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
      select: { name: true, type: true },
    });
    const existingKeys = new Set(existing.map((c) => `${c.type}:${c.name}`));

    const toCreate = categories.filter(
      (c: { name: string; type: string }) => !existingKeys.has(`${c.type}:${c.name}`)
    );

    if (!isPremium) {
      const currentCount = existing.length;
      if (currentCount + toCreate.length > 3) {
        return badRequest("Limite gratuite atteinte (3 catégories max). Passez à Premium pour ajouter plus de catégories.");
      }
    }

    if (toCreate.length === 0) {
      return created({ categories: [] });
    }

    const createdCategories = await prisma.$transaction(
      toCreate.map((c: { name: string; icon?: string; type: string }) =>
        prisma.category.create({
          data: { name: c.name, icon: c.icon || "", type: c.type, userId },
        })
      )
    );

    return created({ categories: createdCategories });
  } catch {
    return badRequest("Erreur lors de la création");
  }
}
