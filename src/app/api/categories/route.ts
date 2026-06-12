import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, badRequest, ok, created } from "@/lib/api";

export async function GET() {
  try {
    const userId = await requireAuth();
    const categories = await prisma.category.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    });
    return ok({ categories });
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
      const categoryCount = await prisma.category.count({ where: { userId } });
      if (categoryCount >= 3) {
        return badRequest("Limite gratuite atteinte (3 catégories max). Passez à Premium pour ajouter plus de catégories.");
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

export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { id } = await req.json();

    await prisma.category.deleteMany({
      where: { id: parseInt(id), userId },
    });

    return ok({ success: true });
  } catch {
    return badRequest("Erreur lors de la suppression");
  }
}
