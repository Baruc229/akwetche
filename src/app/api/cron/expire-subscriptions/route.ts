import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { daysUntil, expireSubscription, sendExpiryReminderEmail, sendWeeklyRenewalReminderEmail } from "@/lib/subscription";
import { notifyAdmin } from "@/lib/admin-emails";

const CRON_SECRET = process.env.CRON_SECRET;
if (!CRON_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("CRON_SECRET must be set in production");
}

async function getUser(id: number) {
  return prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true } });
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const results: string[] = [];

  // 1. Expirer les abonnements dont la date est passée
  const expired = await prisma.subscription.findMany({
    where: { status: "active", endDate: { lte: new Date() } },
  });

  for (const sub of expired) {
    await expireSubscription(sub.id);
    results.push(`Expired subscription ${sub.id} for user ${sub.userId}`);

    // Notifier à l'expiration
    if (!sub.notifiedAtExpiry) {
      const user = await getUser(sub.userId);
      if (user?.email) {
        await sendExpiryReminderEmail(user.email, 0, user.name);
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { notifiedAtExpiry: true },
        });
        results.push(`Sent expiry notification to ${user.email}`);
      }
    }

    // Notifier l'admin
    const userForAdmin = await getUser(sub.userId);
    if (userForAdmin) {
      notifyAdmin("subscription_expired", { userName: userForAdmin.name || userForAdmin.email || "", userEmail: userForAdmin.email || "" });
    }
  }

  // 2. Notifier J-7
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const warn7 = await prisma.subscription.findMany({
    where: {
      status: "active",
      notifiedAt7Days: false,
      endDate: { gte: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), lte: new Date(in7Days.getTime() + 24 * 60 * 60 * 1000) },
    },
  });

  for (const sub of warn7) {
    const remaining = daysUntil(sub.endDate);
    const user = await getUser(sub.userId);
    if (user?.email) {
      await sendExpiryReminderEmail(user.email, remaining, user.name);
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { notifiedAt7Days: true },
      });
      results.push(`Sent J-${remaining} reminder to ${user.email}`);
    }
  }

  // 3. Notifier J-3
  const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const warn3 = await prisma.subscription.findMany({
    where: {
      status: "active",
      notifiedAt3Days: false,
      endDate: { gte: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), lte: new Date(in3Days.getTime() + 24 * 60 * 60 * 1000) },
    },
  });

  for (const sub of warn3) {
    const remaining = daysUntil(sub.endDate);
    const user = await getUser(sub.userId);
    if (user?.email) {
      await sendExpiryReminderEmail(user.email, remaining, user.name);
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { notifiedAt3Days: true },
      });
      results.push(`Sent J-${remaining} reminder to ${user.email}`);
    }
  }

  // 4. Rappels hebdomadaires (max 4) pour abonnements expirés
  const expiredSubs = await prisma.subscription.findMany({
    where: { status: "expired", weeklyReminderCount: { lt: 4 } },
  });

  for (const sub of expiredSubs) {
    const since = daysUntil(sub.endDate); // negative days
    const weeksSince = Math.abs(Math.floor(since / 7));

    if (weeksSince > sub.weeklyReminderCount) {
      const user = await getUser(sub.userId);
      if (user?.email) {
        await sendWeeklyRenewalReminderEmail(user.email, user.name, sub.weeklyReminderCount + 1);
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { weeklyReminderCount: { increment: 1 } },
        });
        results.push(`Sent weekly reminder ${sub.weeklyReminderCount + 1} to ${user.email}`);
      }
    }
  }

  return Response.json({ ok: true, results });
}
