import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, emailLayout } from "@/lib/email";
import { getStartOfMonth, getEndOfMonth } from "@/lib/utils";

const CRON_SECRET = process.env.CRON_SECRET || "change-me-in-production";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const monthStart = getStartOfMonth(now);
  const monthEnd = getEndOfMonth(now);
  const label = monthStart.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const [totalUsers, newUsers, totalPremium, newPremium, subsActive, totalTransactions, txVolume] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: monthStart, lte: monthEnd } } }),
    prisma.user.count({ where: { plan: "premium" } }),
    prisma.user.count({ where: { plan: "premium", updatedAt: { gte: monthStart, lte: monthEnd } } }),
    prisma.subscription.count({ where: { status: "active" } }),
    prisma.transaction.count({ where: { date: { gte: monthStart, lte: monthEnd } } }),
    prisma.transaction.aggregate({ where: { date: { gte: monthStart, lte: monthEnd } }, _sum: { amount: true } }),
  ]);

  const admins = await prisma.user.findMany({
    where: { role: "super_admin" },
    select: { id: true, email: true, name: true },
  });

  if (admins.length === 0) {
    return Response.json({ ok: false, error: "No admin found" });
  }

  const content = `
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 20px">Bonjour Administrateur,</p>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 20px">Voici le rapport mensuel d'Akwetche pour <strong>${label}</strong>.</p>

    <div style="border:1px solid #e7e5e4;border-radius:10px;overflow:hidden;margin:0 0 24px">
      <table width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="background:#fafaf9;padding:14px 16px;border-bottom:2px solid #059669" colspan="2"><span style="color:#059669;font-size:13px;font-weight:700">Utilisateurs</span></td></tr>
        <tr><td style="padding:10px 16px;border-bottom:1px solid #f0f0ee;color:#a8a29e">Total utilisateurs</td><td style="padding:10px 16px;border-bottom:1px solid #f0f0ee;color:#1c1917;text-align:right;font-weight:600">${totalUsers}</td></tr>
        <tr><td style="padding:10px 16px;border-bottom:1px solid #f0f0ee;color:#a8a29e">Nouveaux ce mois</td><td style="padding:10px 16px;border-bottom:1px solid #f0f0ee;color:#059669;text-align:right;font-weight:600">+${newUsers}</td></tr>
        <tr><td style="padding:10px 16px;border-bottom:1px solid #f0f0ee;color:#a8a29e">Abonnés Premium (total)</td><td style="padding:10px 16px;border-bottom:1px solid #f0f0ee;color:#d97706;text-align:right;font-weight:600">${totalPremium}</td></tr>
        <tr><td style="padding:10px 16px;border-bottom:1px solid #f0f0ee;color:#a8a29e">Nouveaux Premium ce mois</td><td style="padding:10px 16px;border-bottom:1px solid #f0f0ee;color:#d97706;text-align:right;font-weight:600">+${newPremium}</td></tr>
      </table>
    </div>

    <div style="border:1px solid #e7e5e4;border-radius:10px;overflow:hidden;margin:0 0 24px">
      <table width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="background:#fafaf9;padding:14px 16px;border-bottom:2px solid #059669" colspan="2"><span style="color:#059669;font-size:13px;font-weight:700">Activité</span></td></tr>
        <tr><td style="padding:10px 16px;border-bottom:1px solid #f0f0ee;color:#a8a29e">Transactions ce mois</td><td style="padding:10px 16px;border-bottom:1px solid #f0f0ee;color:#1c1917;text-align:right;font-weight:600">${totalTransactions}</td></tr>
        <tr><td style="padding:10px 16px;border-bottom:1px solid #f0f0ee;color:#a8a29e">Volume total</td><td style="padding:10px 16px;border-bottom:1px solid #f0f0ee;color:#1c1917;text-align:right;font-weight:600">${txVolume._sum.amount?.toLocaleString("fr-FR") || 0} FCFA</td></tr>
        <tr><td style="padding:10px 16px;border-bottom:1px solid #f0f0ee;color:#a8a29e">Abonnements actifs</td><td style="padding:10px 16px;border-bottom:1px solid #f0f0ee;color:#d97706;text-align:right;font-weight:600">${subsActive}</td></tr>
      </table>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px">
      <tr>
        <td align="center">
          <a href="${APP_URL}/dashboard/admin" style="display:inline-block;background:#059669;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600">Accéder à l'administration</a>
        </td>
      </tr>
    </table>
    <p style="color:#888;font-size:12px;line-height:1.5;margin:0;text-align:center">Rapport généré automatiquement le ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}.</p>`;

  const subject = `[Akwetche] Rapport mensuel — ${label}`;
  const html = emailLayout(subject, content);

  for (const admin of admins) {
    if (admin.email) {
      await sendEmail({ to: admin.email, subject, html });
    }
  }

  return Response.json({ ok: true, sentTo: admins.length });
}
