import { prisma } from "@/lib/prisma";
import { sendEmail, emailLayout } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export function daysUntil(date: Date): number {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function daysSince(date: Date): number {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export async function archiveSubscription(userId: number) {
  const current = await prisma.subscription.findUnique({ where: { userId } });
  if (!current) return;

  await prisma.subscriptionHistory.create({
    data: {
      userId,
      status: current.status,
      provider: current.provider,
      method: current.method,
      amount: current.amount,
      currency: current.currency,
      startDate: current.startDate,
      endDate: current.endDate,
    },
  });
}

export async function activatePremium(userId: number, provider: string, method: string, amount = 5000, currency = "XOF") {
  await archiveSubscription(userId);

  const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.subscription.upsert({
    where: { userId },
    create: { userId, status: "active", provider, method, amount, currency, endDate, notifiedAt7Days: false, notifiedAt3Days: false, notifiedAtExpiry: false, weeklyReminderCount: 0 },
    update: { status: "active", provider, method, amount, currency, endDate, notifiedAt7Days: false, notifiedAt3Days: false, notifiedAtExpiry: false, weeklyReminderCount: 0 },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { plan: "premium" },
  });

  await createNotification(userId, "subscription", "Abonnement Premium activé", "/dashboard/settings");
}

export async function expireSubscription(subscriptionId: number) {
  const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
  if (!sub || sub.status !== "active") return;

  await archiveSubscription(sub.userId);

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status: "expired" },
  });

  await prisma.user.update({
    where: { id: sub.userId },
    data: { plan: "free" },
  });

  await createNotification(sub.userId, "subscription", "Abonnement Premium expiré", "/dashboard/settings");
}

export function getSubscriptionStatus(endDate: Date, status: string) {
  if (status !== "active") return { label: "Expiré", variant: "expired" as const };

  const remaining = daysUntil(endDate);

  if (remaining <= 0) return { label: "Expiré", variant: "expired" as const };
  if (remaining <= 3) return { label: `Expire dans ${remaining} jour${remaining > 1 ? "s" : ""}`, variant: "critical" as const };
  if (remaining <= 7) return { label: `Expire dans ${remaining} jour${remaining > 1 ? "s" : ""}`, variant: "warning" as const };

  return { label: "Actif", variant: "active" as const };
}

// Email notifications
export function sendSubscriptionEmail(to: string, subject: string, bodyHtml: string) {
  return sendEmail({
    to,
    subject,
    html: emailLayout(subject, bodyHtml),
  });
}

export function sendExpiryReminderEmail(to: string, daysLeft: number, userName: string) {
  const subject = daysLeft === 0
    ? "Votre abonnement Premium Akwetche a expiré"
    : `Votre abonnement Premium Akwetche expire dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`;

  const body = daysLeft === 0
    ? `
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">Bonjour ${userName},</p>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">Votre abonnement Premium est arrivé à expiration. Vous êtes maintenant sur le plan gratuit.</p>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 20px">Votre historique est intact. Renouvelez pour retrouver toutes vos fonctionnalités.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px">
      <tr>
        <td align="center">
          <a href="${APP_URL}/payment" style="display:inline-block;background:#059669;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600">Renouveler maintenant</a>
        </td>
      </tr>
    </table>
    <p style="color:#888;font-size:13px;line-height:1.5;margin:0">Ou continuez à utiliser Akwetche en mode gratuit.</p>`
    : `
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">Bonjour ${userName},</p>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">Votre abonnement Akwetche Premium expire dans <strong>${daysLeft} jour${daysLeft > 1 ? "s" : ""}</strong>.</p>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 20px">Renouvelez maintenant pour ne pas perdre l'accès à vos fonctionnalités exclusives.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px">
      <tr>
        <td align="center">
          <a href="${APP_URL}/payment" style="display:inline-block;background:#059669;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600">Renouveler mon abonnement</a>
        </td>
      </tr>
    </table>`;

  return sendSubscriptionEmail(to, subject, body);
}

export function sendWeeklyRenewalReminderEmail(to: string, userName: string, weekNumber: number) {
  const subject = "Vous nous manquez — Renouvelez Akwetche Premium";
  const body = `
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">Bonjour ${userName},</p>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">Votre abonnement Premium a expiré il y a ${weekNumber} semaine${weekNumber > 1 ? "s" : ""}. Voici ce qui vous attend en renouvelant :</p>
    <ul style="color:#444;font-size:14px;line-height:1.8;padding-left:20px;margin:0 0 20px">
      <li>Transactions illimitées</li>
      <li>Catégories illimitées</li>
      <li>Mode activité commerciale</li>
      <li>Gestion des produits, ventes et stocks</li>
      <li>Statistiques avancées</li>
    </ul>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px">
      <tr>
        <td align="center">
          <a href="${APP_URL}/payment" style="display:inline-block;background:#059669;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600">Renouveler maintenant</a>
        </td>
      </tr>
    </table>
    <p style="color:#888;font-size:13px;line-height:1.5;margin:0">Vos données sont toujours en sécurité. Elles vous attendent.</p>`;

  return sendSubscriptionEmail(to, subject, body);
}
