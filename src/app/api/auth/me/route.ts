import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { unauthorized, ok } from "@/lib/api";
import { daysUntil, getSubscriptionStatus } from "@/lib/subscription";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true,
      initialBalance: true, initialBalanceActivity: true,
      role: true, currency: true, baseCurrency: true,
      countryCode: true, phone: true, avatarUrl: true,
      emailVerified: true, plan: true, status: true,
      activityActivated: true, tontineAccess: true,
      recoitCommissions: true, commissionScopeDefault: true,
      adminNotificationPref: true, onboardingCompleted: true, notificationPrefs: true,
      subscription: { select: { status: true, amount: true, currency: true, endDate: true } },
    },
  });

  if (!user) return unauthorized();

  let subscriptionStatus = null;
  if (user.subscription) {
    const remaining = daysUntil(user.subscription.endDate);
    const status = getSubscriptionStatus(user.subscription.endDate, user.subscription.status);
    subscriptionStatus = {
      ...user.subscription,
      daysRemaining: remaining,
      label: status.label,
      variant: status.variant,
    };
  }

  return ok({
    user: {
      ...user,
      currency: user.currency || user.baseCurrency || "XOF",
      baseCurrency: user.baseCurrency || "XOF",
      adminNotificationPref: user.adminNotificationPref || "instant",
      subscription: subscriptionStatus,
    },
  });
}
