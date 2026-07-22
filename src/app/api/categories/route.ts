import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, badRequest, ok, created } from "@/lib/api";
import { FREE_CATEGORY_LIMIT_PER_TYPE } from "@/lib/limits";

export async function GET() {
  try {
    const userId = await requireAuth();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        subscription: { select: { status: true } },
      },
    });
    const isPremium = user?.subscription?.status === "active" || user?.role !== "user";

    const categories = await prisma.category.findMany({
      where: { userId },
      orderBy: [{ type: "asc" }, { id: "asc" }],
    });

    let activeCategoryIds: number[];
    if (isPremium) {
      activeCategoryIds = categories.filter((c) => !c.archived).map((c) => c.id);
    } else {
      const seen = { income: 0, expense: 0 };
      activeCategoryIds = categories
        .filter((c) => !c.archived)
        .filter((c) => {
          seen[c.type as "income" | "expense"]++;
          return seen[c.type as "income" | "expense"] <= FREE_CATEGORY_LIMIT_PER_TYPE;
        })
        .map((c) => c.id);
    }

    return ok({ categories, activeCategoryIds, isPremium });
  } catch {
    return badRequest("Non autorisé");
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { name, icon, type } = await req.json();

    if (!name || !type) {
      return badRequest("Nom et type requis");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        subscription: { select: { status: true } },
      },
    });
    const isPremium = user?.subscription?.status === "active" || user?.role !== "user";

    if (!isPremium) {
      const activeByType = await prisma.category.groupBy({
        by: ["type"],
        where: { userId, archived: false },
        _count: { id: true },
      });
      const incomeActive = activeByType.find((g) => g.type === "income")?._count.id ?? 0;
      const expenseActive = activeByType.find((g) => g.type === "expense")?._count.id ?? 0;
      const limit = FREE_CATEGORY_LIMIT_PER_TYPE;
      if ((type === "income" && incomeActive >= limit) || (type === "expense" && expenseActive >= limit)) {
        return badRequest(`Limite gratuite atteinte (${limit} catégories par type max). Passez à Premium pour ajouter plus de catégories.`);
      }
    }

    const existing = await prisma.category.findFirst({
      where: { name, userId },
    });
    if (existing) {
      return badRequest("Cette catégorie existe déjà");
    }

    const category = await prisma.category.create({
      data: { name, icon: icon || "", type, userId },
    });

    return created({ category });
  } catch {
    return badRequest("Erreur lors de la création");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { id, archived } = await req.json();
    await prisma.category.updateMany({
      where: { id: parseInt(id), userId },
      data: { archived },
    });
    return ok({ success: true });
  } catch {
    return badRequest("Erreur lors de la mise à jour");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { id } = await req.json();
    const catId = parseInt(id);

    // Transactons with this category get categoryId = null (SetNull)
    await prisma.category.deleteMany({
      where: { id: catId, userId },
    });

    return ok({ success: true });
  } catch {
    return badRequest("Erreur lors de la suppression");
  }
}
