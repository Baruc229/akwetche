import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api";
import {
  getStartOfMonth, getEndOfMonth,
} from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const now = new Date();
    const startDate = getStartOfMonth(now);
    const endDate = getEndOfMonth(now);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, initialBalance: true, initialBalanceActivity: true, role: true, subscription: { select: { status: true } } },
    });

    if (!user) return new Response("User not found", { status: 404 });

    const transactions = await prisma.transaction.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
      include: { category: true },
      orderBy: { date: "desc" },
    });

    const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const savings = income - expense;
    const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(0) : "—";

    const byCat: Record<string, number> = {};
    transactions.filter(t => t.type === "expense").forEach(t => {
      const name = t.category?.name || "Non catégorisé";
      byCat[name] = (byCat[name] || 0) + t.amount;
    });
    const sortedCats = Object.entries(byCat).sort(([, a], [, b]) => b - a);

    const txRows = transactions.map(t => `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0ee;color:#666;font-size:12px">${new Date(t.date).toLocaleDateString("fr-FR")}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0ee;color:#1c1917;font-size:13px">${t.description}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0ee;color:#a8a29e;font-size:12px">${t.category?.name || "—"}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0ee;color:#059669;font-size:13px;text-align:right;font-weight:500">${t.type === "income" ? formatCurrency(t.amount) : ""}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0ee;color:#dc2626;font-size:13px;text-align:right;font-weight:500">${t.type === "expense" ? formatCurrency(t.amount) : ""}</td>
      </tr>`).join("");

    const catRows = sortedCats.map(([name, amount], i) => {
      const pct = expense > 0 ? (amount / expense * 100).toFixed(0) : "0";
      const colors = ["#059669", "#0d9488", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#be123c", "#ca8a04"];
      return `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0ee"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${colors[i % colors.length]};margin-right:8px;vertical-align:middle"></span>${name}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0ee;text-align:right;font-weight:500">${formatCurrency(amount)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0ee;text-align:right;color:#a8a29e">${pct}%</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Rapport mensuel — Akwetche</title>
<style>
  @page { margin: 20mm 15mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1c1917; background: #fff; margin: 0; padding: 0; }
  .header { text-align: center; padding: 20px 0 30px; border-bottom: 2px solid #059669; }
  .header h1 { color: #059669; margin: 0; font-size: 24px; }
  .header p { color: #a8a29e; margin: 4px 0 0; font-size: 13px; }
  .summary { display: flex; justify-content: center; gap: 20px; margin: 20px 0; }
  .summary-item { text-align: center; padding: 10px 20px; }
  .summary-item .label { color: #a8a29e; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  .summary-item .value { font-size: 22px; font-weight: 700; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th { background: #fafaf9; padding: 8px 12px; text-align: left; font-size: 11px; color: #a8a29e; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e7e5e4; }
  td { font-size: 13px; }
  h2 { font-size: 16px; color: #1c1917; margin: 24px 0 8px; padding-bottom: 6px; border-bottom: 1px solid #f0f0ee; }
  .footer { text-align: center; color: #a8a29e; font-size: 11px; margin-top: 30px; padding-top: 16px; border-top: 1px solid #f0f0ee; }
  @media print { .no-print { display: none; } body { background: #fff; } }
</style>
</head>
<body>
  <div class="header">
    <h1>Akwetche</h1>
    <p>Rapport mensuel — ${startDate.toLocaleDateString("fr-FR")} au ${endDate.toLocaleDateString("fr-FR")}</p>
    <p style="color:#666;font-size:12px;margin-top:8px">Généré le ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
  </div>

  <div class="summary">
    <div class="summary-item"><div class="label">Revenus</div><div class="value" style="color:#059669">${formatCurrency(income)}</div></div>
    <div class="summary-item"><div class="label">Dépenses</div><div class="value" style="color:#dc2626">${formatCurrency(expense)}</div></div>
    <div class="summary-item"><div class="label">Solde</div><div class="value" style="color:${savings >= 0 ? "#059669" : "#dc2626"}">${formatCurrency(savings)}</div></div>
    <div class="summary-item"><div class="label">Taux d'épargne</div><div class="value">${savingsRate}%</div></div>
  </div>

  ${sortedCats.length > 0 ? `
  <h2>Répartition des dépenses</h2>
  <table>
    <thead><tr><th>Catégorie</th><th style="text-align:right">Montant</th><th style="text-align:right">%</th></tr></thead>
    <tbody>${catRows}</tbody>
  </table>` : ""}

  <h2>Détail des transactions</h2>
  <table>
    <thead><tr><th>Date</th><th>Description</th><th>Catégorie</th><th style="text-align:right">Revenu</th><th style="text-align:right">Dépense</th></tr></thead>
    <tbody>${txRows || `<tr><td colspan="5" style="text-align:center;padding:20px;color:#a8a29e">Aucune transaction ce mois-ci</td></tr>`}</tbody>
  </table>

  <div class="footer">
    <p>Akwetche — Gestion financière personnelle</p>
    <p>${new Date().getFullYear()} Akwetche. Tous droits réservés.</p>
  </div>

  <div class="no-print" style="text-align:center;margin-top:16px">
    <button onclick="window.print()" style="background:#059669;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">Télécharger en PDF</button>
    <button onclick="window.close()" style="background:#e7e5e4;color:#1c1917;border:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;margin-left:8px">Fermer</button>
  </div>

  <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };</script>
</body>
</html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch {
    return new Response("Non autorisé", { status: 401 });
  }
}
