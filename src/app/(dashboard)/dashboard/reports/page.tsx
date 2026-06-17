"use client";

import { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowTrendUp, faArrowTrendDown, faPiggyBank, faBagShopping, faWallet, faArrowUpRightFromSquare, faBox, faTriangleExclamation, faDownload, faChartBar, faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/lib/colors";

type StatsBlock = {
 income: number; expense: number; savings: number; topCategories: Record<string, number>;
};

type ReportData = {
 period: { start: string; end: string; type: string };
 current: StatsBlock;
 previous: StatsBlock;
 evolution: { income: string | null; expense: string | null; savings: string | null };
 personal: {
 current: StatsBlock; previous: StatsBlock;
 evolution: { income: string | null; expense: string | null; savings: string | null };
 };
 activity: {
 current: StatsBlock; previous: StatsBlock;
 evolution: { income: string | null; expense: string | null; savings: string | null };
 };
 commercial: {
 revenue: number;
 profit: number;
 stockValue: number;
 productCount: number;
 outOfStock: number;
 mostProfitable: { name: string; total: number; quantity: number }[];
 mostSold: { name: string; total: number; quantity: number }[];
 };
 initialBalance: number;
 initialBalanceActivity: number;
};

export default function ReportsPage() {
 const [period, setPeriod] = useState("monthly");
 const [data, setData] = useState<ReportData | null>(null);
 const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Bilans — Akwetche";
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports?type=${period}`)
 .then((res) => res.json())
 .then(setData)
 .finally(() => setLoading(false));
 }, [period]);

 function handleDownload() {
 window.print();
 }

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" />
 </div>
 );
 }

 const periods = [
 { value: "weekly", label: "Cette semaine" },
 { value: "monthly", label: "Ce mois-ci" },
 { value: "yearly", label: "Cette année" },
 ];

 const periodLabel = periods.find(p => p.value === period)?.label || "";

 function EvolutionBadge({ value, positiveIsGood }: { value: string | null; positiveIsGood: boolean }) {
 if (!value) return null;
 const num = parseFloat(value);
 if (num === 0) return null;
 const isGood = positiveIsGood ? num > 0 : num < 0;
 return (
 <span className={`inline-flex items-center gap-1 text-xs font-medium ${isGood ? "text-forest" : "text-red-500"}`}>
 {isGood ? <FontAwesomeIcon icon={faArrowTrendUp} className="w-3 h-3" /> : <FontAwesomeIcon icon={faArrowTrendDown} className="w-3 h-3" />}
 {Math.abs(num).toFixed(0)}% vs période précédente
 </span>
 );
 }

 function getTopExpenseLabel(categories: Record<string, number>): string {
 const entries = Object.entries(categories).sort(([, a], [, b]) => b - a);
 if (entries.length === 0) return "";
 const [name, amount] = entries[0];
 return `${name} (${formatCurrency(amount)})`;
 }

 const totalCurrent = data ? data.current.income + data.current.expense : 0;
 const savingsRate = data && data.current.income > 0 ? (data.current.savings / data.current.income) * 100 : 0;
 const avgDaily = data ? data.current.expense / 30 : 0;

 return (
 <div className="space-y-5">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div>
 <h1 className="text-2xl font-bold text-ink">Bilans</h1>
 <p className="text-muted text-sm mt-0.5">Ce qui s&apos;est passé, en clair</p>
 </div>
 <button
 onClick={handleDownload}
 className="btn-secondary flex items-center gap-2 text-sm self-start sm:self-auto no-print"
 >
 <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
 Télécharger le rapport
 </button>
 </div>

 <div className="flex items-center gap-2 flex-wrap no-print">
 {periods.map((p) => (
 <button
 key={p.value}
 onClick={() => setPeriod(p.value)}
 className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
 period === p.value
 ? "bg-ochre-light text-forest"
 : "text-muted hover:bg-border"
 }`}
 >
 {p.label}
 </button>
 ))}
 </div>

 {data && (
 <>
 {/* En-tête du rapport imprimable */}
 <div className="print-header">
 <h1 className="text-xl font-bold text-forest">Akwetche — Rapport financier</h1>
 <p className="text-sm text-muted">
 {data.period.start && data.period.end
 ? `Du ${new Date(data.period.start).toLocaleDateString("fr-FR")} au ${new Date(data.period.end).toLocaleDateString("fr-FR")}`
 : periodLabel}
 </p>
 <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 print-summary">
 <div className="bg-ochre-light rounded-xl p-3">
 <p className="text-xs text-forest font-medium">Revenus totaux</p>
 <p className="text-lg font-bold text-forest">{formatCurrency(data.current.income)}</p>
 </div>
 <div className="bg-ochre-light rounded-xl p-3">
 <p className="text-xs text-ochre font-medium">Dépenses totales</p>
 <p className="text-lg font-bold text-ochre">{formatCurrency(data.current.expense)}</p>
 </div>
 <div className="bg-ochre-light rounded-xl p-3">
 <p className="text-xs text-forest-light font-medium">Solde net</p>
 <p className="text-lg font-bold text-forest-light">{formatCurrency(data.current.savings)}</p>
 </div>
 <div className="bg-sand rounded-xl p-3">
 <p className="text-xs text-muted font-medium">Taux d'épargne</p>
 <p className={`text-lg font-bold ${savingsRate >= 20 ? "text-forest" : savingsRate >= 5 ? "text-ochre" : "text-red-500"}`}>
 {savingsRate.toFixed(0)}%
 </p>
 </div>
 </div>
 </div>

 {/* Résumé humain */}
 <div className="card p-6 bg-sand animate-fade-in">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-sm font-semibold text-ink">{periodLabel}</h2>
 <div className="flex items-center gap-1.5 text-xs text-muted">
 <FontAwesomeIcon icon={faCalendarDays} className="w-3.5 h-3.5" />
 {data.period.start && data.period.end
 ? `Du ${new Date(data.period.start).toLocaleDateString("fr-FR")} au ${new Date(data.period.end).toLocaleDateString("fr-FR")}`
 : periodLabel}
 </div>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div className="flex items-center gap-3 p-3 bg-white rounded-xl">
 <div className="w-10 h-10 rounded-xl bg-ochre-light flex items-center justify-center shrink-0">
 <FontAwesomeIcon icon={faArrowTrendUp} className="w-5 h-5 text-forest-light" />
 </div>
 <div className="min-w-0">
 <p className="text-sm text-muted">Vous avez reçu</p>
 <p className="text-lg font-bold text-forest-light">{formatCurrency(data.current.income)}</p>
 <EvolutionBadge value={data.evolution.income} positiveIsGood={true} />
 </div>
 </div>
 <div className="flex items-center gap-3 p-3 bg-white rounded-xl">
 <div className="w-10 h-10 rounded-xl bg-ochre-light flex items-center justify-center shrink-0">
 <FontAwesomeIcon icon={faArrowTrendDown} className="w-5 h-5 text-ochre" />
 </div>
 <div className="min-w-0">
 <p className="text-sm text-muted">Vous avez dépensé</p>
 <p className="text-lg font-bold text-ochre">{formatCurrency(data.current.expense)}</p>
 <EvolutionBadge value={data.evolution.expense} positiveIsGood={false} />
 </div>
 </div>
 <div className="flex items-center gap-3 p-3 bg-white rounded-xl">
 <div className="w-10 h-10 rounded-xl bg-ochre-light flex items-center justify-center shrink-0">
 <FontAwesomeIcon icon={faPiggyBank} className="w-5 h-5 text-forest" />
 </div>
 <div className="min-w-0">
 <p className="text-sm text-muted">Il vous reste</p>
 <p className="text-lg font-bold text-forest">{formatCurrency(Math.max(0, data.current.savings))}</p>
 <EvolutionBadge value={data.evolution.savings} positiveIsGood={true} />
 </div>
 </div>
 </div>
 </div>

 {/* Indicateurs clés */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 <div className="rounded-2xl p-4 sm:p-5 animate-fade-in bg-ochre-light border border-border">
 <p className="text-xs sm:text-sm font-medium text-forest">Revenus + Dépenses</p>
 <p className="text-lg sm:text-xl font-bold text-forest mt-1">{formatCurrency(totalCurrent)}</p>
 <p className="text-xs sm:text-sm text-forest mt-0.5">Volume total</p>
 </div>
 <div className="rounded-2xl p-4 sm:p-5 animate-fade-in bg-ochre-light border border-border">
 <p className="text-xs sm:text-sm font-medium text-forest-light">Taux d&apos;épargne</p>
 <p className={`text-lg sm:text-xl font-bold mt-1 ${savingsRate >= 20 ? "text-forest" : savingsRate >= 5 ? "text-ochre" : "text-red-500"}`}>
 {savingsRate.toFixed(0)}%
 </p>
 <p className={`text-xs sm:text-sm mt-0.5 ${savingsRate >= 20 ? "text-forest" : savingsRate >= 5 ? "text-ochre" : "text-red-500"}`}>
 {savingsRate >= 20 ? "Excellent" : savingsRate >= 5 ? "Correct" : "Faible"}
 </p>
 </div>
 <div className="rounded-2xl p-4 sm:p-5 animate-fade-in bg-ochre-light border border-border">
 <p className="text-xs sm:text-sm font-medium text-ochre">Moyenne / jour</p>
 <p className="text-lg sm:text-xl font-bold text-ochre mt-1">{formatCurrency(avgDaily)}</p>
 <p className="text-xs sm:text-sm text-ochre mt-0.5">Dépense quotidienne</p>
 </div>
 <div className="rounded-2xl p-4 sm:p-5 animate-fade-in bg-sand border border-border">
 <p className="text-xs sm:text-sm font-medium text-muted">Plus grosse dépense</p>
 <p className="text-lg sm:text-xl font-bold text-ink mt-1 break-words leading-tight">
 {getTopExpenseLabel(data.current.topCategories) || "—"}
 </p>
 <p className="text-xs sm:text-sm text-muted mt-0.5">Catégorie principale</p>
 </div>
 </div>

 {/* Comparaison périodes */}
 <div className="card p-5 animate-fade-in">
 <div className="flex items-center gap-2 mb-4">
 <FontAwesomeIcon icon={faChartBar} className="w-5 h-5 text-forest" />
 <h2 className="text-sm font-semibold text-ink">Comparaison</h2>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-sm whitespace-nowrap">
 <thead>
 <tr className="border-b border-border">
 <th className="text-left px-3 py-2 text-muted font-medium"></th>
 <th className="text-right px-3 py-2 text-muted font-medium">Période actuelle</th>
 <th className="text-right px-3 py-2 text-muted font-medium">Période précédente</th>
 <th className="text-right px-3 py-2 text-muted font-medium">Évolution</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 <tr>
 <td className="px-3 py-2.5 text-ink">Revenus</td>
 <td className="text-right px-3 py-2.5 font-medium text-forest-light">{formatCurrency(data.current.income)}</td>
 <td className="text-right px-3 py-2.5 text-muted">{formatCurrency(data.previous.income)}</td>
 <td className="text-right px-3 py-2.5">
 {data.evolution.income && (
 <span className={parseFloat(data.evolution.income) >= 0 ? "text-forest" : "text-red-500"}>
 {parseFloat(data.evolution.income) >= 0 ? "+" : ""}{data.evolution.income}%
 </span>
 )}
 </td>
 </tr>
 <tr>
 <td className="px-3 py-2.5 text-ink">Dépenses</td>
 <td className="text-right px-3 py-2.5 font-medium text-ochre">{formatCurrency(data.current.expense)}</td>
 <td className="text-right px-3 py-2.5 text-muted">{formatCurrency(data.previous.expense)}</td>
 <td className="text-right px-3 py-2.5">
 {data.evolution.expense && (
 <span className={parseFloat(data.evolution.expense) <= 0 ? "text-forest" : "text-red-500"}>
 {parseFloat(data.evolution.expense) >= 0 ? "+" : ""}{data.evolution.expense}%
 </span>
 )}
 </td>
 </tr>
 <tr className="bg-ochre-light">
 <td className="px-3 py-2.5 text-ink font-medium">Épargne</td>
 <td className="text-right px-3 py-2.5 font-bold text-forest">{formatCurrency(Math.max(0, data.current.savings))}</td>
 <td className="text-right px-3 py-2.5 text-muted">{formatCurrency(Math.max(0, data.previous.savings))}</td>
 <td className="text-right px-3 py-2.5">
 {data.evolution.savings && (
 <span className={parseFloat(data.evolution.savings) >= 0 ? "text-forest" : "text-red-500"}>
 {parseFloat(data.evolution.savings) >= 0 ? "+" : ""}{data.evolution.savings}%
 </span>
 )}
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>

 {/* Détail des dépenses */}
 {Object.keys(data.current.topCategories).length > 0 && (
 <div className="card p-5 animate-fade-in">
 <div className="flex items-center gap-2 mb-4">
 <FontAwesomeIcon icon={faArrowTrendDown} className="w-5 h-5 text-ochre" />
 <h2 className="text-sm font-semibold text-ink">Où est passé votre argent ?</h2>
 </div>
 <p className="text-xs text-muted mb-4">Répartition par catégorie</p>
 <div className="space-y-3">
  {Object.entries(data.current.topCategories)
  .sort(([, a], [, b]) => b - a)
  .map(([cat, amount], i) => {
  const total = data.current.expense || 1;
  const pct = (amount / total) * 100;
  const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
  return (
  <div key={cat}>
  <div className="flex justify-between text-sm mb-1">
  <span className="text-ink flex items-center gap-1.5">
  <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: color }} />
  {cat}
  </span>
  <span className="text-muted">{formatCurrency(amount)} ({pct.toFixed(0)}%)</span>
  </div>
  <div className="h-2.5 bg-border rounded-full overflow-hidden">
  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
  </div>
  </div>
  );
  })}
 </div>
 </div>
 )}

 {/* Résumé financier simplifié — Personnel */}
 <div className="card p-5 animate-fade-in">
 <div className="flex items-center gap-3 mb-3">
 <FontAwesomeIcon icon={faWallet} className="w-5 h-5 text-forest" />
 <h2 className="text-sm font-semibold text-ink">Situation financière</h2>
 </div>
 <div className="mb-4">
 <h3 className="text-xs font-semibold text-forest uppercase tracking-wider mb-2">Personnel</h3>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
 <div className="bg-sand rounded-xl p-3">
 <p className="text-muted">Capital de départ</p>
 <p className="font-semibold text-ink">{formatCurrency(data.initialBalance)}</p>
 </div>
 <div className="bg-ochre-light rounded-xl p-3">
 <p className="text-forest-light">Reçu</p>
 <p className="font-semibold text-forest-light">+{formatCurrency(data.personal.current.income)}</p>
 </div>
 <div className="bg-ochre-light rounded-xl p-3">
 <p className="text-ochre">Dépensé</p>
 <p className="font-semibold text-ochre">-{formatCurrency(data.personal.current.expense)}</p>
 </div>
 <div className={`rounded-xl p-3 ${data.personal.current.savings >= 0 ? "bg-ochre-light" : "bg-red-50"}`}>
 <p className={data.personal.current.savings >= 0 ? "text-forest" : "text-red-600"}>Solde</p>
 <p className={`font-semibold ${data.personal.current.savings >= 0 ? "text-forest" : "text-red-700"}`}>
 {formatCurrency(data.initialBalance + data.personal.current.income - data.personal.current.expense)}
 </p>
 </div>
 </div>
 </div>
 {data.initialBalanceActivity > 0 || data.activity.current.income > 0 || data.activity.current.expense > 0 ? (
 <div>
 <h3 className="text-xs font-semibold text-ochre uppercase tracking-wider mb-2">Activité</h3>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
 <div className="bg-sand rounded-xl p-3">
 <p className="text-muted">Capital de départ</p>
 <p className="font-semibold text-ink">{formatCurrency(data.initialBalanceActivity)}</p>
 </div>
 <div className="bg-ochre-light rounded-xl p-3">
 <p className="text-forest-light">Reçu</p>
 <p className="font-semibold text-forest-light">+{formatCurrency(data.activity.current.income)}</p>
 </div>
 <div className="bg-ochre-light rounded-xl p-3">
 <p className="text-ochre">Dépensé</p>
 <p className="font-semibold text-ochre">-{formatCurrency(data.activity.current.expense)}</p>
 </div>
 <div className={`rounded-xl p-3 ${data.activity.current.savings >= 0 ? "bg-ochre-light" : "bg-red-50"}`}>
 <p className={data.activity.current.savings >= 0 ? "text-forest" : "text-red-600"}>Solde</p>
 <p className={`font-semibold ${data.activity.current.savings >= 0 ? "text-forest" : "text-red-700"}`}>
 {formatCurrency(data.initialBalanceActivity + data.activity.current.income - data.activity.current.expense)}
 </p>
 </div>
 </div>
 </div>
 ) : null}
 </div>

 {/* Activité commerciale */}
 {data.commercial.productCount > 0 && (
 <div className="card p-5 animate-fade-in border-l-4 border-l-ochre">
 <div className="flex items-center gap-2 mb-4">
 <div className="w-8 h-8 rounded-xl bg-ochre-light flex items-center justify-center">
 <FontAwesomeIcon icon={faBagShopping} className="w-4 h-4 text-ochre" />
 </div>
 <h2 className="text-sm font-semibold text-ink">Votre activité</h2>
 </div>
 <div className="space-y-3">
 <div className="flex items-center justify-between p-3 bg-white rounded-xl">
 <span className="text-sm text-muted">Chiffre d&apos;affaires</span>
 <span className="text-sm font-bold text-forest-light">{formatCurrency(data.commercial.revenue)}</span>
 </div>
 <div className="flex items-center justify-between p-3 bg-white rounded-xl">
 <span className="text-sm text-muted">Bénéfice</span>
 <span className="text-sm font-bold text-forest">{formatCurrency(data.commercial.profit)}</span>
 </div>
 {data.commercial.productCount > 0 && (
 <div className="flex items-center justify-between p-3 bg-white rounded-xl">
 <span className="text-sm text-muted">Stock</span>
 <span className="text-sm font-bold text-ink">
 {data.commercial.productCount} produit{data.commercial.productCount !== 1 ? "s" : ""}
 {data.commercial.outOfStock > 0 && (
 <span className="text-red-500 text-xs ml-1">({data.commercial.outOfStock} en rupture)</span>
 )}
 </span>
 </div>
 )}
 </div>
 {data.commercial.mostSold.length > 0 && (
 <div className="mt-4 pt-3 border-t border-border">
 <p className="text-xs text-muted mb-2">Produits les plus vendus</p>
 <div className="space-y-1.5">
 {data.commercial.mostSold.slice(0, 3).map((p) => (
 <div key={p.name} className="flex items-center justify-between text-sm">
 <span className="text-muted">{p.name}</span>
 <span className="font-medium text-ink">{p.quantity} vendu{p.quantity !== 1 ? "s" : ""}</span>
 </div>
 ))}
 </div>
 </div>
 )}
 {data.commercial.mostProfitable.length > 0 && (
 <div className="mt-3 pt-3 border-t border-border">
 <p className="text-xs text-muted mb-2">Produits les plus rentables</p>
 <div className="space-y-1.5">
 {data.commercial.mostProfitable.slice(0, 3).map((p) => (
 <div key={p.name} className="flex items-center justify-between text-sm">
 <span className="text-muted">{p.name}</span>
 <span className="font-medium text-forest">{formatCurrency(p.total)}</span>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 )}

 {/* Lien vers historique */}
 <div className="flex justify-center no-print">
 <a
 href="/dashboard/transactions"
 className="inline-flex items-center gap-2 text-sm text-forest hover:text-forest font-medium"
 >
 Voir le détail des transactions
 <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="w-3.5 h-3.5" />
 </a>
 </div>
 </>
 )}
 </div>
 );
}
