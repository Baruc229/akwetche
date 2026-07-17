import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api";
import { generatePdf } from "@/lib/pdf";
import {
  getStartOfWeek, getEndOfWeek,
  getStartOfMonth, getEndOfMonth,
  getStartOfYear, getEndOfYear,
} from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

const PERIOD_LABELS: Record<string, string> = {
  weekly: "hebdomadaire",
  monthly: "mensuel",
  yearly: "annuel",
};

const COLORS = ["#0D1B35", "#142D54", "#C9A84C", "#dc2626", "#7c3aed", "#0891b2", "#be123c", "#ca8a04"];

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "monthly";
    const now = new Date();

    let startDate: Date;
    let endDate: Date;

    if (type === "weekly") {
      startDate = getStartOfWeek(now);
      endDate = getEndOfWeek(now);
    } else if (type === "yearly") {
      startDate = getStartOfYear(now);
      endDate = getEndOfYear(now);
    } else {
      startDate = getStartOfMonth(now);
      endDate = getEndOfMonth(now);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        initialBalance: true,
        initialBalanceActivity: true,
        role: true,
        subscription: { select: { status: true } },
      },
    });

    if (!user) return new Response("User not found", { status: 404 });

    const isPremium = user?.subscription?.status === "active" || user?.role !== "user";
    const catFilter = isPremium ? {} : { archived: false };

    const transactions = await prisma.transaction.findMany({
      where: { userId, date: { gte: startDate, lte: endDate }, category: catFilter },
      include: { category: true },
      orderBy: { date: "desc" },
    });

    const allIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const allExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const allSavings = allIncome - allExpense;
    const savingsRate = allIncome > 0 ? ((allSavings / allIncome) * 100).toFixed(0) : "—";

    const personalIncome = transactions.filter(t => t.type === "income" && t.scope === "personal").reduce((s, t) => s + t.amount, 0);
    const personalExpense = transactions.filter(t => t.type === "expense" && t.scope === "personal").reduce((s, t) => s + t.amount, 0);
    const personalSavings = personalIncome - personalExpense;

    const activityIncome = transactions.filter(t => t.type === "income" && t.scope === "activity").reduce((s, t) => s + t.amount, 0);
    const activityExpense = transactions.filter(t => t.type === "expense" && t.scope === "activity").reduce((s, t) => s + t.amount, 0);
    const activitySavings = activityIncome - activityExpense;

    const hasActivity = activityIncome > 0 || activityExpense > 0 || (user?.initialBalanceActivity || 0) > 0;

    // Categories breakdown
    const byCat: Record<string, number> = {};
    transactions.filter(t => t.type === "expense").forEach(t => {
      const name = t.category?.name || "Non catégorisé";
      byCat[name] = (byCat[name] || 0) + t.amount;
    });
    const sortedCats = Object.entries(byCat).sort(([, a], [, b]) => b - a);

    // Commercial data
    const salesData = await prisma.sale.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
      include: { product: true },
    });
    const totalRevenue = salesData.reduce((s, sale) => s + sale.totalAmount, 0);
    const totalProfit = salesData.reduce((s, sale) => s + sale.profit, 0);
    const products = await prisma.product.findMany({ where: { userId } });
    const stockValue = products.reduce((s, p) => s + p.purchasePrice * p.stock, 0);
    const hasCommercial = salesData.length > 0 || products.length > 0;

    // Transaction rows
    const txRows = transactions.map(t => `
      <tr>
        <td style="padding:7px 12px;border-bottom:1px solid #f0f0ee;color:#64748b;font-size:12px">${new Date(t.date).toLocaleDateString("fr-FR")}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #f0f0ee;color:#0D1B35;font-size:13px">${t.description}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #f0f0ee;color:#94a3b8;font-size:12px">${t.category?.name || "—"}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #f0f0ee;color:#94a3b8;font-size:11px;text-align:center">${t.scope === "activity" ? "Activité" : "Perso"}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #f0f0ee;color:#0D1B35;font-size:13px;text-align:right;font-weight:500">${t.type === "income" ? formatCurrency(t.amount) : ""}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #f0f0ee;color:#dc2626;font-size:13px;text-align:right;font-weight:500">${t.type === "expense" ? formatCurrency(t.amount) : ""}</td>
      </tr>`).join("");

    const catRows = sortedCats.map(([name, amount], i) => {
      const pct = allExpense > 0 ? (amount / allExpense * 100).toFixed(0) : "0";
      return `
      <tr>
        <td style="padding:7px 12px;border-bottom:1px solid #f0f0ee">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${COLORS[i % COLORS.length]};margin-right:8px;vertical-align:middle"></span>${name}
        </td>
        <td style="padding:7px 12px;border-bottom:1px solid #f0f0ee;text-align:right;font-weight:500">${formatCurrency(amount)}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #f0f0ee;text-align:right;color:#94a3b8">${pct}%</td>
      </tr>`;
    }).join("");

    const periodLabel = PERIOD_LABELS[type] || "mensuel";
    const dateRange = `${startDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} → ${endDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;
    const generatedAt = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

    const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Rapport ${periodLabel} — Akwetche</title>
<style>
  @page { margin: 18mm 15mm; size: A4; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; background: #fff; margin: 0; padding: 0; }

  .header { text-align: center; padding: 24px 0 28px; border-bottom: 3px solid #0D1B35; }
  .header h1 { color: #0D1B35; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
  .header .subtitle { color: #C9A84C; margin: 4px 0 0; font-size: 14px; font-weight: 600; }
  .header .date { color: #94a3b8; font-size: 11px; margin-top: 8px; }

  .summary { display: flex; justify-content: center; gap: 0; margin: 24px 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
  .summary-item { text-align: center; padding: 16px 24px; flex: 1; }
  .summary-item:not(:last-child) { border-right: 1px solid #e2e8f0; }
  .summary-item .label { color: #94a3b8; font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600; }
  .summary-item .value { font-size: 20px; font-weight: 700; margin-top: 4px; }

  .section-title { font-size: 15px; color: #0D1B35; margin: 28px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #C9A84C; font-weight: 700; }

  .scope-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 12px 0; }
  .scope-card { padding: 14px 16px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; }
  .scope-card h4 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; font-weight: 700; }
  .scope-card p { margin: 2px 0; font-size: 13px; }
  .scope-card .val { font-weight: 600; }

  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th { background: #f8fafc; padding: 8px 12px; text-align: left; font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; font-weight: 700; }
  td { font-size: 13px; }

  .footer { text-align: center; color: #94a3b8; font-size: 10px; margin-top: 36px; padding-top: 16px; border-top: 1px solid #e2e8f0; }

  @media (max-width: 600px) {
    .summary { flex-direction: column; }
    .summary-item:not(:last-child) { border-right: none; border-bottom: 1px solid #e2e8f0; }
    .scope-grid { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>
  <div class="header">
    <h1>Akwetche</h1>
    <p class="subtitle">Rapport ${periodLabel}</p>
    <p class="date">${dateRange}</p>
    <p class="date">Généré le ${generatedAt}</p>
  </div>

  <div class="summary">
    <div class="summary-item">
      <div class="label">Revenus</div>
      <div class="value" style="color:#0D1B35">${formatCurrency(allIncome)}</div>
    </div>
    <div class="summary-item">
      <div class="label">Dépenses</div>
      <div class="value" style="color:#dc2626">${formatCurrency(allExpense)}</div>
    </div>
    <div class="summary-item">
      <div class="label">Solde</div>
      <div class="value" style="color:${allSavings >= 0 ? "#0D1B35" : "#dc2626"}">${formatCurrency(allSavings)}</div>
    </div>
    <div class="summary-item">
      <div class="label">Taux d'épargne</div>
      <div class="value">${savingsRate}%</div>
    </div>
  </div>

  ${hasActivity ? `
  <p class="section-title">Situation par périmètre</p>
  <div class="scope-grid">
    <div class="scope-card">
      <h4>Personnel</h4>
      <p>Reçus : <span class="val" style="color:#0D1B35">${formatCurrency(personalIncome)}</span></p>
      <p>Dépensés : <span class="val" style="color:#dc2626">${formatCurrency(personalExpense)}</span></p>
      <p>Épargne : <span class="val" style="color:${personalSavings >= 0 ? "#0D1B35" : "#dc2626"}">${formatCurrency(personalSavings)}</span></p>
    </div>
    <div class="scope-card">
      <h4>Activité</h4>
      <p>Reçus : <span class="val" style="color:#C9A84C">${formatCurrency(activityIncome)}</span></p>
      <p>Dépensés : <span class="val" style="color:#dc2626">${formatCurrency(activityExpense)}</span></p>
      <p>Épargne : <span class="val" style="color:${activitySavings >= 0 ? "#0D1B35" : "#dc2626"}">${formatCurrency(activitySavings)}</span></p>
    </div>
  </div>` : ""}

  ${hasCommercial ? `
  <p class="section-title">Activité commerciale</p>
  <div class="summary">
    <div class="summary-item">
      <div class="label">Chiffre d'affaires</div>
      <div class="value" style="color:#C9A84C">${formatCurrency(totalRevenue)}</div>
    </div>
    <div class="summary-item">
      <div class="label">Profit</div>
      <div class="value" style="color:#0D1B35">${formatCurrency(totalProfit)}</div>
    </div>
    <div class="summary-item">
      <div class="label">Valeur stock</div>
      <div class="value">${formatCurrency(stockValue)}</div>
    </div>
  </div>` : ""}

  ${sortedCats.length > 0 ? `
  <p class="section-title">Répartition des dépenses</p>
  <table>
    <thead><tr><th>Catégorie</th><th style="text-align:right">Montant</th><th style="text-align:right">%</th></tr></thead>
    <tbody>${catRows}</tbody>
  </table>` : ""}

  <p class="section-title">Détail des transactions</p>
  <table>
    <thead><tr><th>Date</th><th>Description</th><th>Catégorie</th><th style="text-align:center">Périmètre</th><th style="text-align:right">Revenu</th><th style="text-align:right">Dépense</th></tr></thead>
    <tbody>${txRows || `<tr><td colspan="6" style="text-align:center;padding:24px;color:#94a3b8">Aucune transaction pour cette période</td></tr>`}</tbody>
  </table>

  <div class="footer">
    <p><strong>Akwetche</strong> — Gestion financière personnelle</p>
    <p>${new Date().getFullYear()} Akwetche. Tous droits réservés.</p>
  </div>

</body>
</html>`;

    const pdfBuffer = await generatePdf(html);

    const periodSlug = type === "weekly" ? "hebdomadaire" : type === "yearly" ? "annuel" : "mensuel";
    const filename = `rapport-${periodSlug}-${now.toISOString().slice(0, 7)}.pdf`;

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);

    return new Response(new Uint8Array(pdfBuffer).buffer, { headers });
  } catch (err) {
    console.error("[reports/pdf] Error:", err);
    return new Response("Erreur lors de la génération du PDF", { status: 500 });
  }
}
