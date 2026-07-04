import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { unauthorized, badRequest, ok } from "@/lib/api";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const transactionId = parseInt(id);
  if (!transactionId) return badRequest("ID invalide");

  const existing = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
  });
  if (!existing) return badRequest("Transaction introuvable");

  const { type, amount, description, date, categoryId, scope, recurring } = await req.json();

  const updateData: Record<string, unknown> = {};
  if (type !== undefined) updateData.type = type;
  if (amount !== undefined) updateData.amount = parseFloat(amount);
  if (description !== undefined) updateData.description = description;
  if (date !== undefined) updateData.date = new Date(date);
  if (categoryId !== undefined) updateData.categoryId = parseInt(categoryId);
  if (scope !== undefined) updateData.scope = scope;
  if (recurring !== undefined) updateData.recurring = recurring === true;

  const updated = await prisma.transaction.update({
    where: { id: transactionId },
    data: updateData,
    include: { category: true },
  });

  return ok({ transaction: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const transactionId = parseInt(id);
  if (!transactionId) return badRequest("ID invalide");

  const existing = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
  });
  if (!existing) return badRequest("Transaction introuvable");

  await prisma.transaction.delete({ where: { id: transactionId } });
  return ok({ success: true });
}
