import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { unauthorized, ok } from "@/lib/api";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true,
      initialBalance: true, initialBalanceActivity: true,
      role: true, currency: true,
      emailVerified: true, plan: true, status: true,
      activityActivated: true,
      subscription: { select: { status: true, amount: true, currency: true, endDate: true } },
    },
  });

  if (!user) return unauthorized();
  return ok({ user: { ...user, currency: user.currency || "auto" } });
}
