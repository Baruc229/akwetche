import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, badRequest, ok } from "@/lib/api";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const budgetId = parseInt(id);
    if (!budgetId) return badRequest("ID invalide");

    const existing = await prisma.budget.findFirst({ where: { id: budgetId, userId } });
    if (!existing) return badRequest("Budget introuvable");

    const { amount } = await req.json();
    if (amount === undefined) return badRequest("Montant requis");

    const updated = await prisma.budget.update({
      where: { id: budgetId },
      data: { amount: parseFloat(amount) },
      include: { category: { select: { id: true, name: true, icon: true, type: true } } },
    });

    return ok({ budget: updated });
  } catch {
    return badRequest("Erreur lors de la mise à jour");
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const budgetId = parseInt(id);
    if (!budgetId) return badRequest("ID invalide");

    const existing = await prisma.budget.findFirst({ where: { id: budgetId, userId } });
    if (!existing) return badRequest("Budget introuvable");

    await prisma.budget.delete({ where: { id: budgetId } });
    return ok({ success: true });
  } catch {
    return badRequest("Erreur lors de la suppression");
  }
}
