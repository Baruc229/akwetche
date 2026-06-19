import { prisma } from "@/lib/prisma";
import { sendEmail, emailLayout } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { ALLOWED_COUNTRIES } from "@/lib/currency";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const FLAG_SVGS: Record<string, string> = {
  BJ: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><polygon points="0,0 3,0 3,0.67 0,0.67" fill="#008751"/><polygon points="0,0.67 3,0.67 3,1.33 0,1.33" fill="#FCD116"/><polygon points="0,1.33 3,1.33 3,2 0,2" fill="#E8112D"/></svg>',
  TG: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><polygon points="0,0 3,0 3,0.4 0,0.4" fill="#006A4E"/><polygon points="0,0.4 3,0.4 3,0.8 0,0.8" fill="#FFCE00"/><polygon points="0,0.8 3,0.8 3,1.2 0,1.2" fill="#006A4E"/><polygon points="0,1.2 3,1.2 3,1.6 0,1.6" fill="#FFCE00"/><polygon points="0,1.6 3,1.6 3,2 0,2" fill="#006A4E"/><polygon points="0,0 1.2,0 1.2,1.2 0,1.2" fill="#D21034"/><polygon points="0.6,0.15 0.66,0.5 0.86,0.5 0.7,0.65 0.76,0.95 0.6,0.8 0.44,0.95 0.5,0.65 0.34,0.5 0.54,0.5" fill="#FFF"/></svg>',
  BF: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><polygon points="0,0 3,0 3,1 0,1" fill="#EF2B2D"/><polygon points="0,1 3,1 3,2 0,2" fill="#009460"/><polygon points="1.5,0.15 1.65,0.7 2.2,0.7 1.75,1 1.9,1.6 1.5,1.25 1.1,1.6 1.25,1 0.8,0.7 1.35,0.7" fill="#FCD116"/></svg>',
  CI: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><polygon points="0,0 1,0 1,2 0,2" fill="#FF8200"/><polygon points="1,0 2,0 2,2 1,2" fill="#FFF"/><polygon points="2,0 3,0 3,2 2,2" fill="#009E60"/></svg>',
  FR: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><polygon points="0,0 1,0 1,2 0,2" fill="#0055A4"/><polygon points="1,0 2,0 2,2 1,2" fill="#FFF"/><polygon points="2,0 3,0 3,2 2,2" fill="#EF4135"/></svg>',
  BE: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><polygon points="0,0 1,0 1,2 0,2" fill="#000"/><polygon points="1,0 2,0 2,2 1,2" fill="#FAE042"/><polygon points="2,0 3,0 3,2 2,2" fill="#ED2939"/></svg>',
};

function countryHtml(code: string): string {
  const c = ALLOWED_COUNTRIES.find((x) => x.code === code);
  if (!c) return code;
  const svg = FLAG_SVGS[code] || "";
  return `${svg} ${c.name}`;
}

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
      const k = key === "userName" ? "Nom" : key === "userEmail" ? "Email" : key === "date" ? "Date" : key === "amount" ? "Montant" : key === "currency" ? "Devise" : key === "countryCode" ? "Pays" : key === "phone" ? "Téléphone" : key === "baseCurrency" ? "Devise du compte" : key;
      const display = key === "countryCode" ? countryHtml(String(val)) : String(val);
      return `<tr><td style="padding:8px 16px;border-bottom:1px solid #f0f0ee;color:#a8a29e;width:40%">${k}</td><td style="padding:8px 16px;border-bottom:1px solid #f0f0ee;color:#1c1917;text-align:right;font-weight:500">${display}</td></tr>`;
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
        .map(([k, v]) => {
          const label = k === "userName" ? "Nom" : k === "userEmail" ? "Email" : k === "date" ? "Date" : k === "amount" ? "Montant" : k === "currency" ? "Devise" : k === "countryCode" ? "Pays" : k === "phone" ? "Téléphone" : k === "baseCurrency" ? "Devise" : k;
          const display = k === "countryCode" ? countryHtml(String(v)) : String(v);
          return `${label}: ${display}`;
        })
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
  payload: { userName: string; userEmail: string; amount?: number; currency?: string; countryCode?: string; phone?: string; baseCurrency?: string },
) {
  const admin = await getAdmin();
  if (!admin?.email) {
    console.warn("[notifyAdmin] No admin email found — skipping notification");
    return;
  }

  console.log(`[notifyAdmin] ${type} — ${payload.userName} (${payload.userEmail}) → admin: ${admin.email} (mode: ${admin.adminNotificationPref || "instant"})`);

  const data: Record<string, unknown> = {
    userName: payload.userName,
    userEmail: payload.userEmail,
    date: formatDate(new Date()),
  };
  if (payload.amount !== undefined) data.amount = payload.amount;
  if (payload.currency !== undefined) data.currency = payload.currency;
  if (payload.countryCode !== undefined) data.countryCode = payload.countryCode;
  if (payload.phone !== undefined) data.phone = payload.phone;
  if (payload.baseCurrency !== undefined) data.baseCurrency = payload.baseCurrency;

  if (admin.adminNotificationPref === "instant") {
    const subject = `[Akwetche] ${eventLabel(type)}`;
    const html = buildAdminEmailHtml(type, data);
    const result = await sendEmail({ to: admin.email, subject, html: emailLayout(subject, html) });
    if (result?.error) {
      console.error(`[notifyAdmin] Email send failed:`, result.error);
    } else {
      console.log(`[notifyAdmin] Email sent successfully`);
    }
    await createNotification(admin.id, "admin", `${eventLabel(type)} — ${payload.userName} (${payload.userEmail})`, "/dashboard/admin");
  } else {
    await prisma.pendingAdminEmail.create({
      data: { type, data: JSON.stringify(data) },
    });
    console.log(`[notifyAdmin] Queued for digest`);
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
