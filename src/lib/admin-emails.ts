import { prisma } from "@/lib/prisma";
import { sendEmail, emailLayout } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

type AdminEventType = "new_registration" | "new_subscription" | "subscription_expired";

function eventLabel(type: AdminEventType): string {
  const labels: Record<AdminEventType, string> = {
    new_registration: "Nouvelle inscription",
    new_subscription: "Nouvel abonnement Premium",
    subscription_expired: "Abonnement Premium expiré",
  };
  return labels[type];
}

function buildAdminEmailHtml(type: AdminEventType, data: Record<string, unknown>): string {
  const label = eventLabel(type);

  const rows = Object.entries(data)
    .map(([key, val]) => {
      const k = key === "userName" ? "Nom" : key === "userEmail" ? "Email" : key === "date" ? "Date" : key === "amount" ? "Montant" : key === "currency" ? "Devise" : key;
      return `<tr><td style="padding:8px 16px;border-bottom:1px solid #f0f0ee;color:#a8a29e;width:40%">${k}</td><td style="padding:8px 16px;border-bottom:1px solid #f0f0ee;color:#1c1917;text-align:right;font-weight:500">${String(val)}</td></tr>`;
    })
    .join("");

  return `
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin:0 0 24px">
      <span style="color:#dc2626;font-size:14px;font-weight:600">&#9888; Action requise</span>
    </div>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 20px">Bonjour Administrateur,</p>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 20px">Un événement vient de se produire sur Akwetche :</p>
    <div style="border:1px solid #e7e5e4;border-radius:10px;overflow:hidden;margin:0 0 24px">
      <table width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="background:#fafaf9;padding:14px 16px;border-bottom:2px solid #e7e5e4" colspan="2"><span style="color:#a8a29e;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">${label}</span></td></tr>
        ${rows}
      </table>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px">
      <tr>
        <td align="center">
          <a href="${APP_URL}/dashboard/admin" style="display:inline-block;background:#059669;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600">Voir dans le tableau de bord</a>
        </td>
      </tr>
    </table>`;
}

function buildDigestEmailHtml(events: { type: AdminEventType; data: Record<string, unknown> }[]): string {
  const items = events
    .map((ev) => {
      const label = eventLabel(ev.type);
      const details = Object.entries(ev.data)
        .map(([k, v]) => `${k === "userName" ? "Nom" : k === "userEmail" ? "Email" : k === "date" ? "Date" : k}: ${v}`)
        .join(" | ");
      return `<tr><td style="padding:12px 16px;border-bottom:1px solid #f0f0ee;color:#1c1917;font-size:14px"><span style="display:inline-block;background:#fef2f2;color:#dc2626;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;margin-right:8px">${label}</span>${details}</td></tr>`;
    })
    .join("");

  return `
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 20px">Bonjour Administrateur,</p>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 20px">Voici le récapitulatif des événements survenus aujourd'hui sur Akwetche :</p>
    <div style="border:1px solid #e7e5e4;border-radius:10px;overflow:hidden;margin:0 0 24px">
      <table width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="background:#fafaf9;padding:14px 16px;border-bottom:2px solid #e7e5e4" colspan="2"><span style="color:#a8a29e;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Événements (${events.length})</span></td></tr>
        ${items}
      </table>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px">
      <tr>
        <td align="center">
          <a href="${APP_URL}/dashboard/admin" style="display:inline-block;background:#059669;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600">Accéder à l'administration</a>
        </td>
      </tr>
    </table>`;
}

async function getAdmin() {
  return prisma.user.findFirst({
    where: { role: "super_admin" },
    select: { id: true, email: true, name: true, adminNotificationPref: true },
  });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export async function notifyAdmin(
  type: AdminEventType,
  payload: { userName: string; userEmail: string; amount?: number; currency?: string },
) {
  const admin = await getAdmin();
  if (!admin?.email) return;

  const data: Record<string, unknown> = {
    userName: payload.userName,
    userEmail: payload.userEmail,
    date: formatDate(new Date()),
  };
  if (payload.amount !== undefined) data.amount = payload.amount;
  if (payload.currency !== undefined) data.currency = payload.currency;

  if (admin.adminNotificationPref === "instant") {
    const subject = `[Akwetche] ${eventLabel(type)}`;
    const html = buildAdminEmailHtml(type, data);
    await sendEmail({ to: admin.email, subject, html: emailLayout(subject, html) });
    await createNotification(admin.id, "admin", `${eventLabel(type)} — ${payload.userName} (${payload.userEmail})`, "/dashboard/admin");
  } else {
    await prisma.pendingAdminEmail.create({
      data: { type, data: JSON.stringify(data) },
    });
  }
}

export async function sendAdminDigest() {
  const admin = await getAdmin();
  if (!admin?.email) return;

  const pending = await prisma.pendingAdminEmail.findMany({
    where: { sentAt: null },
    orderBy: { createdAt: "asc" },
  });

  if (pending.length === 0) return;

  const events = pending.map((p) => ({
    type: p.type as AdminEventType,
    data: JSON.parse(p.data) as Record<string, unknown>,
  }));

  const subject = `[Akwetche] Résumé quotidien — ${events.length} événement${events.length > 1 ? "s" : ""}`;
  const html = buildDigestEmailHtml(events);
  await sendEmail({ to: admin.email, subject, html: emailLayout(subject, html) });

  await prisma.pendingAdminEmail.updateMany({
    where: { id: { in: pending.map((p) => p.id) } },
    data: { sentAt: new Date() },
  });

  await createNotification(admin.id, "admin", `Résumé quotidien envoyé — ${events.length} événement${events.length > 1 ? "s" : ""}`, "/dashboard/admin");
}
