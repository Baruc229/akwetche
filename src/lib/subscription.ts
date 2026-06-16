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

  await prisma.category.updateMany({
    where: { userId, archived: true },
    data: { archived: false },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { plan: "premium" },
  });

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    if (user?.email) {
      const invoiceHtml = buildInvoiceEmail(user.name, amount, currency, provider, method, endDate);
      await sendSubscriptionEmail(user.email, "Votre facture Akwetche Premium", invoiceHtml);
    }
  } catch {}
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

  const categories = await prisma.category.findMany({
    where: { userId: sub.userId },
    include: { _count: { select: { transactions: true } } },
    orderBy: { transactions: { _count: "desc" } },
  });

  if (categories.length > 3) {
    const toArchive = categories.slice(3).map(c => c.id);
    await prisma.category.updateMany({
      where: { id: { in: toArchive } },
      data: { archived: true },
    });
  }

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

function generateInvoiceRef(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return `INV-${Date.now().toString(36).toUpperCase()}-${code}`;
}

function buildInvoiceEmail(userName: string, amount: number, currency: string, provider: string, method: string, endDate: Date): string {
  const ref = generateInvoiceRef();
  const date = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const expires = endDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const amountFmt = amount.toLocaleString("fr-FR");

  const methodLabel: Record<string, string> = { card: "Carte bancaire", paypal: "PayPal", mobile_money: "Mobile Money", stripe: "Carte bancaire" };
  const providerLabel: Record<string, string> = { stripe: "Stripe", paypal: "PayPal", fedapay: "FedaPay" };

  return `
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 20px">Bonjour ${userName},</p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin:0 0 24px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <span style="color:#059669;font-size:14px;font-weight:600">&#10003; Paiement confirmé</span>
          </td>
          <td align="right">
            <span style="display:inline-block;background:#059669;color:#ffffff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:4px;text-transform:uppercase">Payé</span>
          </td>
        </tr>
      </table>
    </div>

    <div style="border:1px solid #e7e5e4;border-radius:10px;overflow:hidden;margin:0 0 24px">
      <table width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px">
        <tr>
          <td style="background:#fafaf9;padding:14px 16px;border-bottom:2px solid #e7e5e4" colspan="2">
            <span style="color:#a8a29e;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Facture</span>
            <span style="color:#1c1917;font-size:16px;font-weight:700;display:block;margin-top:2px">${ref}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #f0f0ee;color:#a8a29e;width:40%">Date d'émission</td>
          <td style="padding:12px 16px;border-bottom:1px solid #f0f0ee;color:#1c1917;text-align:right">${date}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #f0f0ee;color:#a8a29e">Client</td>
          <td style="padding:12px 16px;border-bottom:1px solid #f0f0ee;color:#1c1917;text-align:right;font-weight:500">${userName}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #f0f0ee;color:#a8a29e">Forfait</td>
          <td style="padding:12px 16px;border-bottom:1px solid #f0f0ee;color:#1c1917;text-align:right">Akwetche Premium — 30 jours</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #f0f0ee;color:#a8a29e">Valable jusqu'au</td>
          <td style="padding:12px 16px;border-bottom:1px solid #f0f0ee;color:#1c1917;text-align:right">${expires}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #f0f0ee;color:#a8a29e">Mode de paiement</td>
          <td style="padding:12px 16px;border-bottom:1px solid #f0f0ee;color:#1c1917;text-align:right">${(providerLabel as any)[provider] || provider} — ${(methodLabel as any)[method] || method}</td>
        </tr>
        <tr>
          <td style="padding:14px 16px;background:#fafaf9;border-top:2px solid #d97706" colspan="2">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="color:#a8a29e;font-size:12px;font-weight:500">Total TTC</span>
                </td>
                <td align="right">
                  <span style="color:#d97706;font-size:20px;font-weight:800">${amountFmt} ${currency}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>

    <p style="color:#a8a29e;font-size:12px;line-height:1.5;margin:0;text-align:center">
      Cette facture fait office de reçu de paiement.<br>
      Conservez-la pour vos archives.
    </p>`;
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
