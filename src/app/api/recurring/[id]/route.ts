import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, badRequest, ok } from "@/lib/api";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const templateId = parseInt(id);
    if (!templateId) return badRequest("ID invalide");

    const existing = await prisma.recurringTemplate.findFirst({ where: { id: templateId, userId } });
    if (!existing) return badRequest("Template introuvable");

    const { name, amount, type, scope, dayOfMonth, categoryId, active } = await req.json();

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (amount !== undefined) data.amount = parseFloat(amount);
    if (type !== undefined) data.type = type;
    if (scope !== undefined) data.scope = scope;
    if (dayOfMonth !== undefined) data.dayOfMonth = parseInt(dayOfMonth);
    if (categoryId !== undefined) data.categoryId = categoryId ? parseInt(categoryId) : null;
    if (active !== undefined) data.active = active === true;

    const updated = await prisma.recurringTemplate.update({
      where: { id: templateId },
      data,
      include: { category: { select: { id: true, name: true, icon: true, type: true } } },
    });

    return ok({ template: updated });
  } catch {
    return badRequest("Erreur lors de la mise à jour");
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const templateId = parseInt(id);
    if (!templateId) return badRequest("ID invalide");

    const existing = await prisma.recurringTemplate.findFirst({ where: { id: templateId, userId } });
    if (!existing) return badRequest("Template introuvable");

    await prisma.recurringTemplate.delete({ where: { id: templateId } });
    return ok({ success: true });
  } catch {
    return badRequest("Erreur lors de la suppression");
  }
}
