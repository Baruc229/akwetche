import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { unauthorized, ok } from "@/lib/api";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) {
    return ok({ subscription: null });
  }

  return ok({
    subscription: {
      status: sub.status,
      amount: sub.amount,
      currency: sub.currency,
      provider: sub.provider,
      startDate: sub.startDate,
      endDate: sub.endDate,
    },
  });
}
