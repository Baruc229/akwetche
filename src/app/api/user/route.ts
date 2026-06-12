import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, badRequest, ok } from "@/lib/api";

export async function PUT(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { name, initialBalance, initialBalanceActivity, currency } = await req.json();

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(initialBalance !== undefined && { initialBalance: parseFloat(initialBalance) }),
        ...(initialBalanceActivity !== undefined && { initialBalanceActivity: parseFloat(initialBalanceActivity) }),
        ...(currency !== undefined && { currency: currency || "auto" }),
      },
    });

    const currencyVal = user.currency || "auto";
    return ok({ user: { id: user.id, name: user.name, email: user.email, initialBalance: user.initialBalance, initialBalanceActivity: user.initialBalanceActivity, currency: currencyVal, role: user.role } });
  } catch {
    return badRequest("Non autorisé");
  }
}
