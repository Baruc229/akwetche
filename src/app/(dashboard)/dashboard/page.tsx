"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "../layout";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWallet, faArrowTrendUp, faArrowTrendDown, faPlus, faCircleExclamation, faBriefcase, faUser, faArrowRight, faClock, faBagShopping, faPiggyBank, faTriangleExclamation, faCrown, faChartBar, faXmark } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency, formatDate } from "@/lib/utils";
import CustomSelect from "@/components/ui/CustomSelect";

const CATEGORY_COLORS = [
 '#4A90D9',
 '#9B59B6',
 '#E74C6F',
 '#1ABC9C',
 '#E67E22',
 '#3498DB',
 '#8E44AD',
 '#16A085',
];

type ScopeSummary = {
 income: number;
 expense: number;
 savings: number;
 balance: number;
 initialBalance: number;
 topCategories: { name: string; icon: string; amount: number; type: string }[];
};

type Transaction = {
 id: number;
 type: string;
 amount: number;
 description: string;
 date: string;
 scope: string;
 category: { name: string; icon: string };
};

export default function DashboardPage() {
 const { user, commercialMode } = useDashboard();
 const router = useRouter();
 const [monthPersonal, setMonthPersonal] = useState<ScopeSummary | null>(null);
 const [monthActivity, setMonthActivity] = useState<ScopeSummary | null>(null);
 const [weekPersonal, setWeekPersonal] = useState<ScopeSummary | null>(null);
 const [weekActivity, setWeekActivity] = useState<ScopeSummary | null>(null);
 const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
 const [loading, setLoading] = useState(true);
 const [showModal, setShowModal] = useState(false);
 const [categories, setCategories] = useState<{ id: number; name: string; icon: string; type: string }[]>([]);
 const [newTx, setNewTx] = useState({ type: "expense", amount: "", description: "", categoryId: "", scope: "personal" });
 const [txError, setTxError] = useState("");
 const [limits, setLimits] = useState<{
 isPremium: boolean;
 incomeCount: number;
 expenseCount: number;
 maxFreeIncome: number;
 maxFreeExpense: number;
 } | null>(null);
 const [subLoading, setSubLoading] = useState(false);

 async function loadData() {
 try {
 const [monthRes, weekRes, txRes, catRes, limitsRes] = await Promise.all([
 fetch("/api/transactions/summary?period=month"),
 fetch("/api/transactions/summary?period=week"),
 fetch("/api/transactions?limit=5"),
 fetch("/api/categories"),
 fetch("/api/user/limits"),
 ]);
 const monthData = await monthRes.json();
 const weekData = await weekRes.json();
 const txData = await txRes.json();
 const catData = await catRes.json();
 const limitsData = await limitsRes.json();
 setMonthPersonal(monthData.personal || null);
 setMonthActivity(monthData.activity || null);
 setWeekPersonal(weekData.personal || null);
 setWeekActivity(weekData.activity || null);
 setRecentTransactions(txData.transactions || []);
 setCategories(catData.categories || []);
 setLimits(limitsData);
 } catch (e) {
 console.error(e);
 } finally {
 setLoading(false);
 }
 }

 useEffect(() => {
 loadData();
 }, []);

 async function handleSubscribe() {
 router.push("/payment");
 }

 async function handleAddTransaction(e: React.FormEvent) {
 e.preventDefault();
 setTxError("");
 if (limits && !limits.isPremium && user?.role === "user") {
 const atLimit = newTx.type === "income"
 ? limits.incomeCount >= limits.maxFreeIncome
 : limits.expenseCount >= limits.maxFreeExpense;
 if (atLimit) {
 setTxError(`Limite mensuelle gratuite atteinte (${limits.maxFreeIncome} revenus / ${limits.maxFreeExpense} dépenses max). Passez à Premium pour continuer.`);
 return;
 }
 }
 try {
 const res = await fetch("/api/transactions", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify(newTx),
 });
 const data = await res.json();
 if (!res.ok) {
 setTxError(data.error || "Erreur");
 return;
 }
 setShowModal(false);
 setNewTx({ type: "expense", amount: "", description: "", categoryId: "", scope: "personal" });
 loadData();
 fetch("/api/user/limits").then(r => r.json()).then(setLimits);
 } catch {
 setTxError("Erreur");
 }
 }

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" />
 </div>
 );
 }

 const weekExpenses = (weekPersonal?.topCategories ?? []).filter(c => c.type === "expense");
 const weekActivityExpenses = (weekActivity?.topCategories ?? []).filter(c => c.type === "expense");
 const totalWeekExpense = weekExpenses.reduce((acc, c) => acc + Math.abs(c.amount), 0);
 const totalWeekActivityExpense = weekActivityExpenses.reduce((acc, c) => acc + Math.abs(c.amount), 0);

 const personalSummary = monthPersonal;
 const activitySummary = monthActivity;
 const totalIncome = (personalSummary?.income || 0) + (activitySummary?.income || 0);
 const totalExpense = (personalSummary?.expense || 0) + (activitySummary?.expense || 0);
 const totalBalance = (personalSummary?.balance || 0) + (activitySummary?.balance || 0);
 const totalSavings = Math.max(0, (personalSummary?.savings || 0) + (activitySummary?.savings || 0));

 const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
 const dayOfMonth = new Date().getDate();
 const daysLeft = daysInMonth - dayOfMonth;
 const dailyAvgExpense = dayOfMonth > 0 ? (totalExpense / dayOfMonth) : 0;
 const projectedExpense = dailyAvgExpense * daysInMonth;
 const projectedRemaining = totalBalance - (dailyAvgExpense * daysLeft);

 const prevMonthTotal = (personalSummary?.initialBalance || 0) + totalIncome - totalExpense;
 const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

 const biggestExpense = [...(personalSummary?.topCategories ?? []), ...(activitySummary?.topCategories ?? [])]
 .filter(c => c.type === "expense")
 .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];

 return (
 <div className="space-y-5">
 {/* En-tête */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div>
 <div className="flex items-center gap-2 flex-wrap">
 <h1 className="text-xl sm:text-2xl font-bold text-ink">
 Bonjour, {user?.name?.split(" ")[0] || "utilisateur"}
 </h1>
 {limits?.isPremium && (
 <span className="inline-flex items-center gap-1 text-xs font-semibold bg-ochre-light text-ochre px-2.5 py-0.5 rounded-full">
 <FontAwesomeIcon icon={faCrown} className="w-3 h-3" />
 Premium
 </span>
 )}
 </div>
 <p className="text-muted text-sm mt-0.5">
 {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
 </p>
 </div>
 <button
 onClick={() => setShowModal(true)}
 className="btn-primary flex items-center gap-2 text-sm self-start sm:self-auto"
 >
 <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
 Nouvelle transaction
 </button>
 </div>

 {/* Bannière configuration catégories */}
 {categories.length === 0 && (
 <div className="bg-ochre-light border border-border rounded-2xl p-5 animate-fade-in">
 <div className="flex items-start gap-3">
 <FontAwesomeIcon icon={faCircleExclamation} className="w-5 h-5 text-ochre shrink-0 mt-0.5" />
 <div className="flex-1">
 <p className="text-sm font-semibold text-ochre">
 Configurez vos catégories
 </p>
 <p className="text-sm text-ochre mt-1">
 Avant d'ajouter des transactions, créez des catégories de dépenses et revenus dans les paramètres.
 </p>
 <a
 href="/dashboard/settings"
 className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-ochre bg-ochre-light hover:bg-ochre-light px-4 py-2 rounded-xl transition-colors"
 >
 Aller aux paramètres
 <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" />
 </a>
 </div>
 </div>
 </div>
 )}

 {/* Bannière plan gratuit */}
 {limits && !limits.isPremium && user?.role === "user" && (
 <div className="bg-sand border border-border rounded-2xl p-5 animate-fade-in">
 <div className="flex items-start gap-3">
 <div className="w-10 h-10 rounded-xl bg-ochre-light flex items-center justify-center shrink-0">
 <FontAwesomeIcon icon={faCrown} className="w-5 h-5 text-ochre" />
 </div>
 <div className="flex-1">
 <p className="text-sm font-semibold text-ink">
 Plan gratuit — {limits.maxFreeIncome} revenus et {limits.maxFreeExpense} dépenses max
 </p>
 <p className="text-sm text-muted mt-1">
 Passez à Premium pour profiter de catégories illimitées, du mode commercial, et exporter vos rapports.
 </p>
 <button
 onClick={handleSubscribe}
 className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-ochre bg-ochre-light hover:bg-ochre-light px-4 py-2 rounded-xl transition-colors"
 >
 Passer à Premium
 <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" />
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Argent disponible aujourd'hui */}
 <div className="bg-forest rounded-2xl p-6 text-white shadow-lg animate-fade-in">
 <div className="flex items-center gap-2 mb-1">
 <FontAwesomeIcon icon={faWallet} className="w-5 h-5 text-sand" />
 <p className="text-sm text-sand font-medium">Argent disponible</p>
 </div>
 <p className="text-3xl font-bold mt-1">{formatCurrency(totalBalance)}</p>
 <div className="mt-3 flex items-center gap-4 text-sm text-sand">
 <span className="flex items-center gap-1">
 <FontAwesomeIcon icon={faArrowTrendUp} className="w-3.5 h-3.5" />
 +{formatCurrency(totalIncome)} reçus
 </span>
 <span className="flex items-center gap-1">
 <FontAwesomeIcon icon={faArrowTrendDown} className="w-3.5 h-3.5" />
 -{formatCurrency(totalExpense)} dépensés
 </span>
 </div>

 </div>

 {/* Jauge limites Free */}
 {limits && !limits.isPremium && user?.role === "user" && (
 <div className="card p-4 animate-fade-in">
 <div className="flex items-center justify-between mb-2">
 <p className="text-xs font-semibold text-muted uppercase tracking-wider">Limites du plan gratuit</p>
 <button
 onClick={handleSubscribe}
 disabled={subLoading}
 className="text-xs text-forest hover:text-forest font-medium disabled:opacity-50"
 >
 {subLoading ? "Redirection..." : "Passer à Premium"}
 </button>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <div className="flex items-center justify-between text-xs text-muted mb-1">
 <span>Revenus</span>
 <span>{limits.incomeCount}/{limits.maxFreeIncome}</span>
 </div>
 <div className="w-full h-2 bg-border rounded-full overflow-hidden">
 <div
 className={`h-full rounded-full transition-all ${
 limits.incomeCount >= limits.maxFreeIncome
 ? "bg-red-500"
 : limits.incomeCount >= limits.maxFreeIncome - 1
 ? "bg-ochre"
 : "bg-forest"
 }`}
 style={{ width: `${Math.min(100, (limits.incomeCount / limits.maxFreeIncome) * 100)}%` }}
 />
 </div>
 </div>
 <div>
 <div className="flex items-center justify-between text-xs text-muted mb-1">
 <span>Dépenses</span>
 <span>{limits.expenseCount}/{limits.maxFreeExpense}</span>
 </div>
 <div className="w-full h-2 bg-border rounded-full overflow-hidden">
 <div
 className={`h-full rounded-full transition-all ${
 limits.expenseCount >= limits.maxFreeExpense
 ? "bg-red-500"
 : limits.expenseCount >= limits.maxFreeExpense - 1
 ? "bg-ochre"
 : "bg-forest"
 }`}
 style={{ width: `${Math.min(100, (limits.expenseCount / limits.maxFreeExpense) * 100)}%` }}
 />
 </div>
 </div>
 </div>
 {(limits.incomeCount >= limits.maxFreeIncome || limits.expenseCount >= limits.maxFreeExpense) && (
 <div className="flex items-start gap-2 mt-3 p-3 bg-red-50 rounded-xl">
 <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
 <div className="flex-1">
 <p className="text-xs text-red-700">
 Vous avez atteint la limite mensuelle gratuite.
 </p>
 <button
 onClick={handleSubscribe}
 disabled={subLoading}
 className="mt-2 text-xs font-medium text-red-700 underline hover:no-underline disabled:opacity-50"
 >
 {subLoading ? "Redirection..." : "Passer à Premium pour continuer"}
 </button>
 </div>
 </div>
 )}
 </div>
 )}

 {/* Grille : Où est passé mon argent + Projection */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
 {/* Où est passé mon argent */}
 <div className="card p-5 animate-fade-in">
 <h2 className="text-sm font-semibold text-ink mb-1">Où est passé mon argent ?</h2>
 <p className="text-xs text-muted mb-4">Cette semaine</p>
 {weekExpenses.length === 0 && (!commercialMode || weekActivityExpenses.length === 0) ? (
 <p className="text-sm text-muted text-center py-6">Aucune dépense cette semaine</p>
 ) : (
 <div className="space-y-4">
 {weekExpenses.length > 0 && (
 <div>
 {commercialMode && <p className="text-xs font-semibold text-forest mb-2 uppercase tracking-wider">Personnel</p>}
  <div className="space-y-3">
  {weekExpenses.slice(0, 5).map((cat, i) => {
  const absAmount = Math.abs(cat.amount);
  const pct = totalWeekExpense > 0 ? (absAmount / totalWeekExpense) * 100 : 0;
  const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
  return (
  <div key={cat.name}>
  <div className="flex justify-between text-sm mb-1">
  <span className="text-ink flex items-center gap-1.5">
  <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: color }} />
  {cat.name}
  </span>
  <span className="text-muted font-medium">{pct.toFixed(0)}% ({formatCurrency(absAmount)})</span>
  </div>
  <div className="h-2 bg-border rounded-full overflow-hidden">
  <div className="h-full rounded-full transition-all duration-500"
  style={{ width: `${pct}%`, backgroundColor: color }} />
  </div>
  </div>
  );
  })}
 </div>
 </div>
 )}
 {commercialMode && weekActivityExpenses.length > 0 && (
 <div>
 <p className="text-xs font-semibold text-ochre mb-2 uppercase tracking-wider">Activité</p>
  <div className="space-y-3">
  {weekActivityExpenses.slice(0, 5).map((cat, i) => {
  const absAmount = Math.abs(cat.amount);
  const pct = totalWeekActivityExpense > 0 ? (absAmount / totalWeekActivityExpense) * 100 : 0;
  const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
  return (
  <div key={cat.name}>
  <div className="flex justify-between text-sm mb-1">
  <span className="text-ink flex items-center gap-1.5">
  <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: color }} />
  {cat.name}
  </span>
  <span className="text-muted font-medium">{pct.toFixed(0)}% ({formatCurrency(absAmount)})</span>
  </div>
  <div className="h-2 bg-border rounded-full overflow-hidden">
  <div className="h-full rounded-full transition-all duration-500"
  style={{ width: `${pct}%`, backgroundColor: color }} />
  </div>
  </div>
  );
  })}
 </div>
 </div>
 )}
 </div>
 )}
 </div>

 {/* Projection fin de mois */}
 <div className="card p-5 animate-fade-in">
 <h2 className="text-sm font-semibold text-ink mb-1">Projection</h2>
 <p className="text-xs text-muted mb-4">Si vous continuez à ce rythme</p>
 <div className="bg-sand rounded-xl p-4 text-center">
 <p className="text-sm text-muted">Il vous restera environ</p>
 <p className={`text-2xl font-bold mt-1 ${projectedRemaining >= 0 ? "text-forest" : "text-red-500"}`}>
 {formatCurrency(Math.max(0, projectedRemaining))}
 </p>
 <p className="text-xs text-muted mt-1">à la fin du mois ({daysLeft} jours restants)</p>
 </div>
 <div className="mt-3 flex items-center justify-between text-sm">
 <span className="text-muted">Dépense moyenne / jour</span>
 <span className="font-medium text-ink">{formatCurrency(dailyAvgExpense)}</span>
 </div>
 {projectedRemaining < 0 && (
 <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 rounded-xl">
 <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
 <p className="text-xs text-red-600">Attention : vous dépensez plus que vous ne possédez.</p>
 </div>
 )}
 </div>
 </div>

 {/* Ce mois-ci — version humaine */}
 {(personalSummary || activitySummary) && (
 <div className="card p-5 animate-fade-in">
 <h2 className="text-sm font-semibold text-ink mb-1">Ce mois-ci</h2>
 <p className="text-xs text-muted mb-4">Résumé de votre mois en un coup d&apos;œil</p>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div className="bg-ochre-light rounded-xl p-4">
 <p className="text-xs text-forest-light font-medium">Vous avez reçu</p>
 <p className="text-lg font-bold text-forest-light mt-1">{formatCurrency(totalIncome)}</p>
 </div>
 <div className="bg-ochre-light rounded-xl p-4">
 <p className="text-xs text-ochre font-medium">Vous avez dépensé</p>
 <p className="text-lg font-bold text-ochre mt-1">{formatCurrency(totalExpense)}</p>
 </div>
 <div className="bg-ochre-light rounded-xl p-4">
 <p className="text-xs text-forest font-medium">Il vous reste</p>
 <p className="text-lg font-bold text-forest mt-1">{formatCurrency(Math.max(0, totalBalance))}</p>
 </div>
 </div>
 <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
 {biggestExpense && (
 <div className="bg-white border border-border rounded-xl p-3 flex items-center gap-3">
 <div className="w-9 h-9 rounded-xl bg-ochre-light flex items-center justify-center">
 <FontAwesomeIcon icon={faArrowTrendDown} className="w-4 h-4 text-ochre" />
 </div>
 <div>
 <p className="text-xs text-muted">Votre plus grosse dépense</p>
 <p className="text-sm font-semibold text-ink">{biggestExpense.name} ({formatCurrency(Math.abs(biggestExpense.amount))})</p>
 </div>
 </div>
 )}
 <div className="bg-white border border-border rounded-xl p-3 flex items-center gap-3">
 <div className="w-9 h-9 rounded-xl bg-ochre-light flex items-center justify-center">
 <FontAwesomeIcon icon={faPiggyBank} className="w-4 h-4 text-forest" />
 </div>
 <div>
 <p className="text-xs text-muted">Taux d&apos;épargne</p>
 <p className="text-sm font-semibold text-ink">{savingsRate.toFixed(0)}% ({formatCurrency(totalSavings)} mis de côté)</p>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Section Activité — résumé quotidien */}
 {commercialMode && activitySummary && (activitySummary.income + activitySummary.expense > 0) && (
 <div className="card p-5 animate-fade-in border-l-4 border-l-ochre">
 <div className="flex items-center gap-2 mb-1">
 <FontAwesomeIcon icon={faBriefcase} className="w-4 h-4 text-ochre" />
 <h2 className="text-sm font-semibold text-ink">Mon activité aujourd&apos;hui</h2>
 </div>
 <p className="text-xs text-muted mb-3">Votre activité commerciale</p>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div className="bg-ochre-light rounded-xl p-4">
 <p className="text-xs text-ochre font-medium">Ce mois-ci</p>
 <p className="text-base font-bold text-ochre mt-1">{formatCurrency(activitySummary.income)}</p>
 <p className="text-xs text-muted">chiffre d&apos;affaires</p>
 </div>
 <div className="bg-ochre-light rounded-xl p-4">
 <p className="text-xs text-forest-light font-medium">Bénéfice</p>
 <p className="text-base font-bold text-forest-light mt-1">{formatCurrency(Math.max(0, activitySummary.savings))}</p>
 <p className="text-xs text-muted">après dépenses</p>
 </div>
 <div className="bg-sand rounded-xl p-4">
 <p className="text-xs text-muted font-medium">Marge</p>
 <p className="text-base font-bold text-ink mt-1">
 {activitySummary.income > 0 ? ((Math.max(0, activitySummary.savings) / activitySummary.income) * 100).toFixed(0) : 0}%
 </p>
 <p className="text-xs text-muted">de bénéfice</p>
 </div>
 </div>
 </div>
 )}

 {/* Transactions récentes + Liens rapides */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
 <div className="card p-5 animate-fade-in">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-sm font-semibold text-ink">
 Dernières opérations
 </h2>
 <a
 href="/dashboard/transactions"
 className="flex items-center gap-1 text-xs text-forest hover:text-forest font-medium"
 >
 Voir tout
 <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
 </a>
 </div>
 {recentTransactions.length === 0 ? (
 <div className="text-center py-8 text-muted">
 <FontAwesomeIcon icon={faClock} className="w-8 h-8 mx-auto mb-2 opacity-50" />
 <p className="text-sm">Aucune opération pour le moment</p>
 <button
 onClick={() => setShowModal(true)}
 className="text-forest text-sm font-medium mt-2 hover:text-forest"
 >
 Ajouter une transaction
 </button>
 </div>
 ) : (
 <div className="space-y-2">
 {recentTransactions.map((tx, i) => (
 <div
 key={tx.id}
 className="flex items-center justify-between p-3 rounded-xl hover:bg-sand transition-colors animate-slide-in"
 style={{ animationDelay: `${i * 50}ms` }}
 >
 <div className="flex items-center gap-3">
 <div
 className={`w-9 h-9 rounded-xl flex items-center justify-center ${
 tx.type === "income"
 ? "bg-ochre-light"
 : "bg-ochre-light"
 }`}
 >
 {tx.type === "income" ? (
 <FontAwesomeIcon icon={faArrowTrendUp} className="w-4 h-4 text-forest-light" />
 ) : (
 <FontAwesomeIcon icon={faArrowTrendDown} className="w-4 h-4 text-ochre" />
 )}
 </div>
 <div>
 <p className="text-sm font-medium text-ink">
 {tx.description}
 </p>
 <p className="text-xs text-muted">
 {tx.category?.name} · {formatDate(tx.date)}
 {tx.scope === "activity" && (
 <span className="ml-1.5 text-ochre font-medium">· activité</span>
 )}
 </p>
 </div>
 </div>
 <span
 className={`text-sm font-semibold ${
 tx.type === "income"
 ? "text-forest-light"
 : "text-ochre"
 }`}
 >
 {tx.type === "income" ? "+" : "-"}
 {formatCurrency(tx.amount)}
 </span>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Rappel catégories */}
 {categories.length === 0 && (
 <div className="bg-ochre-light border border-border rounded-2xl p-5 animate-fade-in">
 <div className="flex items-start gap-3">
 <FontAwesomeIcon icon={faCircleExclamation} className="w-5 h-5 text-ochre flex-shrink-0 mt-0.5" />
 <div>
 <p className="text-sm font-medium text-ochre">
 Configurez vos catégories
 </p>
 <p className="text-sm text-ochre mt-1">
 Avant d&apos;ajouter des transactions, créez des catégories de
 dépenses et revenus dans les paramètres.
 </p>
 <a
 href="/dashboard/settings"
 className="inline-flex items-center gap-1 text-sm font-medium text-ochre hover:text-ochre mt-2"
 >
 Aller aux paramètres
 <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
 </a>
 </div>
 </div>
 </div>
 )}

 {categories.length > 0 && (
 <div className="card p-5 animate-fade-in">
 <h2 className="text-sm font-semibold text-ink mb-3">Liens rapides</h2>
 <div className="space-y-2">
 <a
 href="/dashboard/transactions"
 className="flex items-center gap-3 p-3 rounded-xl hover:bg-sand transition-colors"
 >
 <div className="w-9 h-9 rounded-xl bg-border flex items-center justify-center">
 <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 text-muted" />
 </div>
 <div>
 <p className="text-sm font-medium text-ink">Voir tout l&apos;historique</p>
 <p className="text-xs text-muted">Consultez et filtrez toutes vos opérations</p>
 </div>
 </a>
 {commercialMode && (
 <>
 <a
 href="/dashboard/products"
 className="flex items-center gap-3 p-3 rounded-xl hover:bg-sand transition-colors"
 >
 <div className="w-9 h-9 rounded-xl bg-ochre-light flex items-center justify-center">
 <FontAwesomeIcon icon={faBagShopping} className="w-4 h-4 text-ochre" />
 </div>
 <div>
 <p className="text-sm font-medium text-ink">Gérer mes produits</p>
 <p className="text-xs text-muted">Ajoutez ou modifiez votre catalogue</p>
 </div>
 </a>
 <a
 href="/dashboard/sales"
 className="flex items-center gap-3 p-3 rounded-xl hover:bg-sand transition-colors"
 >
 <div className="w-9 h-9 rounded-xl bg-ochre-light flex items-center justify-center">
 <FontAwesomeIcon icon={faArrowTrendUp} className="w-4 h-4 text-forest-light" />
 </div>
 <div>
 <p className="text-sm font-medium text-ink">Enregistrer une vente</p>
 <p className="text-xs text-muted">Suivez votre chiffre d&apos;affaires</p>
 </div>
 </a>
 </>
 )}
 </div>
 </div>
 )}
 </div>

 {/* Synthèse — Explication facile */}
 {(monthPersonal && (monthPersonal.income + monthPersonal.expense > 0)) ||
 (commercialMode && monthActivity && (monthActivity.income + monthActivity.expense > 0)) ? (
 <div className="bg-sand border border-border rounded-2xl p-5 animate-fade-in">
 <div className="flex items-center gap-2 mb-4">
 <FontAwesomeIcon icon={faPiggyBank} className="w-5 h-5 text-forest" />
 <h2 className="text-sm font-semibold text-ink">En résumé</h2>
 </div>

 {(() => {
 const showPersonal = monthPersonal && monthPersonal.income + monthPersonal.expense > 0;
 const showActivity = monthActivity && commercialMode && monthActivity.income + monthActivity.expense > 0;
 const personalRate = monthPersonal && monthPersonal.income > 0 ? (monthPersonal.savings / monthPersonal.income) * 100 : 0;
 const activityRate = monthActivity && monthActivity.income > 0 ? (monthActivity.savings / monthActivity.income) * 100 : 0;
 const totalIncome = (monthPersonal?.income || 0) + (monthActivity?.income || 0);
 const totalExpense = (monthPersonal?.expense || 0) + (monthActivity?.expense || 0);
 const totalSaved = Math.max(0, (monthPersonal?.savings || 0)) + Math.max(0, (monthActivity?.savings || 0));
 const totalBalance = (monthPersonal?.balance || 0) + (monthActivity?.balance || 0);
 const savingsRate = totalIncome > 0 ? (totalSaved / totalIncome) * 100 : 0;

 const allCats = [...(monthPersonal?.topCategories ?? []), ...(monthActivity?.topCategories ?? [])];
 const biggestExpense = allCats.filter(c => c.type === "expense").sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];

 return (
 <>
 {/* Tableau comparatif */}
 <div className="overflow-x-auto rounded-xl border border-border bg-white mb-4">
 <table className="w-full text-sm whitespace-nowrap">
 <thead>
 <tr className="bg-ochre-light">
 <th className="text-left px-4 py-2.5 font-semibold text-forest"></th>
 <th className="text-right px-4 py-2.5 font-semibold text-forest">Perso</th>
 {showActivity && <th className="text-right px-4 py-2.5 font-semibold text-ochre">Activité</th>}
 <th className="text-right px-4 py-2.5 font-semibold text-ink">Total</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 <tr>
 <td className="px-4 py-2.5 text-muted">Revenus</td>
 <td className="text-right px-4 py-2.5 font-medium text-forest-light">{formatCurrency(monthPersonal?.income || 0)}</td>
 {showActivity && <td className="text-right px-4 py-2.5 font-medium text-ochre">{formatCurrency(monthActivity?.income || 0)}</td>}
 <td className="text-right px-4 py-2.5 font-semibold text-ink">{formatCurrency(totalIncome)}</td>
 </tr>
 <tr>
 <td className="px-4 py-2.5 text-muted">Dépenses</td>
 <td className="text-right px-4 py-2.5 font-medium text-ochre">{formatCurrency(monthPersonal?.expense || 0)}</td>
 {showActivity && <td className="text-right px-4 py-2.5 font-medium text-red-500">{formatCurrency(monthActivity?.expense || 0)}</td>}
 <td className="text-right px-4 py-2.5 font-semibold text-ink">{formatCurrency(totalExpense)}</td>
 </tr>
 <tr className="bg-ochre-light">
 <td className="px-4 py-2.5 text-ink font-medium">Résultat</td>
 <td className="text-right px-4 py-2.5 font-bold text-forest">{formatCurrency(Math.max(0, monthPersonal?.savings || 0))}</td>
 {showActivity && <td className="text-right px-4 py-2.5 font-bold text-ochre">{formatCurrency(Math.max(0, monthActivity?.savings || 0))}</td>}
 <td className="text-right px-4 py-2.5 font-bold text-forest">{formatCurrency(totalSaved)}</td>
 </tr>
 <tr>
 <td className="px-4 py-2.5 text-muted">Taux d'épargne</td>
 <td className="text-right px-4 py-2.5 font-medium text-ink">
 {monthPersonal?.income ? `${personalRate.toFixed(0)}%` : "-"}
 </td>
 {showActivity && <td className="text-right px-4 py-2.5 font-medium text-ink">
 {monthActivity?.income ? `${activityRate.toFixed(0)}%` : "-"}
 </td>}
 <td className="text-right px-4 py-2.5 font-semibold text-ink">{savingsRate.toFixed(0)}%</td>
 </tr>
 <tr>
 <td className="px-4 py-2.5 text-muted">Disponible</td>
 <td className="text-right px-4 py-2.5 font-medium text-ink">{formatCurrency(monthPersonal?.balance || 0)}</td>
 {showActivity && <td className="text-right px-4 py-2.5 font-medium text-ink">{formatCurrency(monthActivity?.balance || 0)}</td>}
 <td className="text-right px-4 py-2.5 font-bold text-forest">{formatCurrency(totalBalance)}</td>
 </tr>
 </tbody>
 </table>
 </div>

 {/* Phrase explicative détaillée */}
 <div className="text-sm text-ink leading-relaxed space-y-3">
 {showPersonal && showActivity ? (
 <>
 <div className="bg-white rounded-xl p-4 border border-border space-y-2">
<h4 className="font-semibold text-ink text-xs uppercase tracking-wider"><FontAwesomeIcon icon={faWallet} className="w-3 h-3 mr-1" /> Personnel</h4>
  <p className="text-muted">
  Sur le plan personnel, vous avez reçu <strong className="text-forest-light">{formatCurrency(monthPersonal!.income)}</strong> et dépensé <strong className="text-ochre">{formatCurrency(monthPersonal!.expense)}</strong> ce mois-ci.
  Votre capital de départ était de <strong className="text-ink">{formatCurrency(monthPersonal!.initialBalance)}</strong>, ce qui porte votre solde personnel à <strong className="text-forest">{formatCurrency(monthPersonal!.balance)}</strong>.
  Votre taux d&apos;épargne personnel est de <strong className="text-ink">{personalRate.toFixed(0)}%</strong>
 {personalRate < 5 ? <span className="text-ochre"> — attention, vous dépensez presque tous vos revenus personnels</span> : personalRate >= 20 ? <span className="text-forest"> — bravo, vous épargnez plus de 20% !</span> : <span> — un bon équilibre</span>}.
 </p>
  </div>
  <div className="bg-white rounded-xl p-4 border border-border space-y-2">
  <h4 className="font-semibold text-ink text-xs uppercase tracking-wider"><FontAwesomeIcon icon={faBagShopping} className="w-3 h-3 mr-1" /> Activité</h4>
  <p className="text-muted">
  Côté activité, vous avez généré <strong className="text-forest-light">{formatCurrency(monthActivity!.income)}</strong> de chiffre d&apos;affaires pour <strong className="text-ochre">{formatCurrency(monthActivity!.expense)}</strong> de dépenses liées à votre commerce.
 Votre bénéfice d&apos;activité est de <strong className="text-forest">{formatCurrency(Math.max(0, monthActivity!.savings))}</strong>
 {monthActivity!.income > 0 ? <span>, soit une marge de <strong className="text-ochre">{activityRate.toFixed(0)}%</strong></span> : null}.
 Capital d&apos;activité de départ : <strong className="text-ink">{formatCurrency(monthActivity!.initialBalance)}</strong>, solde activité actuel : <strong className="text-forest">{formatCurrency(monthActivity!.balance)}</strong>.
 </p>
 </div>
 <div className="bg-ochre-light rounded-xl p-4 border border-border space-y-1">
 <h4 className="font-semibold text-forest text-xs uppercase tracking-wider"><FontAwesomeIcon icon={faChartBar} className="w-3 h-3 mr-1" /> Synthèse globale</h4>
 <p className="text-ink">
 Au total (personnel + activité), vous avez gagné <strong>{formatCurrency(totalIncome)}</strong>, dépensé <strong>{formatCurrency(totalExpense)}</strong>, et mis de côté <strong>{formatCurrency(totalSaved)}</strong> soit un taux d&apos;épargne global de <strong>{savingsRate.toFixed(0)}%</strong>.
 Vos deux budgets combinés vous laissent <strong className="text-forest">{formatCurrency(totalBalance)}</strong> de disponible.
 </p>
 </div>
 </>
 ) : showPersonal ? (
 <>
 <div className="bg-white rounded-xl p-4 border border-border space-y-2">
<h4 className="font-semibold text-ink text-xs uppercase tracking-wider"><FontAwesomeIcon icon={faWallet} className="w-3 h-3 mr-1" /> Personnel</h4>
  <p className="text-muted">
  Ce mois-ci, vous avez reçu <strong className="text-forest-light">{formatCurrency(monthPersonal!.income)}</strong> et dépensé <strong className="text-ochre">{formatCurrency(monthPersonal!.expense)}</strong>.
 Vous partiez de <strong className="text-ink">{formatCurrency(monthPersonal!.initialBalance)}</strong>, il vous reste donc <strong className="text-forest">{formatCurrency(monthPersonal!.balance)}</strong>.
 Vous avez épargné <strong>{formatCurrency(Math.max(0, monthPersonal!.savings))}</strong> soit <strong>{personalRate.toFixed(0)}%</strong> de vos revenus
 {personalRate < 5 ? <span className="text-ochre"> — faites attention, vous dépensez la quasi-totalité de ce que vous gagnez</span> : personalRate >= 20 ? <span className="text-forest"> — bravo, une excellente maîtrise de vos finances !</span> : <span> — un rythme soutenable</span>}.
 </p>
 </div>
 </>
 ) : (
  <>
  <div className="bg-white rounded-xl p-4 border border-border space-y-2">
  <h4 className="font-semibold text-ink text-xs uppercase tracking-wider"><FontAwesomeIcon icon={faBagShopping} className="w-3 h-3 mr-1" /> Activité</h4>
  <p className="text-muted">
  Votre activité a généré <strong className="text-forest-light">{formatCurrency(monthActivity!.income)}</strong> de ventes pour <strong className="text-ochre">{formatCurrency(monthActivity!.expense)}</strong> de dépenses professionnelles.
 Le bénéfice net de votre activité est de <strong className="text-forest">{formatCurrency(Math.max(0, monthActivity!.savings))}</strong>
 {monthActivity!.income > 0 ? <span>, soit une marge bénéficiaire de <strong className="text-ochre">{activityRate.toFixed(0)}%</strong></span> : null}.
 Capital de départ : <strong className="text-ink">{formatCurrency(monthActivity!.initialBalance)}</strong>, solde actuel : <strong className="text-forest">{formatCurrency(monthActivity!.balance)}</strong>.
 </p>
 </div>
 </>
 )}
 {biggestExpense && (
 <div className="flex items-start gap-2 p-3 bg-sand rounded-xl">
 <FontAwesomeIcon icon={faArrowTrendDown} className="w-4 h-4 text-ochre flex-shrink-0 mt-0.5" />
 <p className="text-sm text-muted">
 Votre plus grosse dépense toutes catégories confondues : <strong className="text-ink">{biggestExpense.name} ({formatCurrency(Math.abs(biggestExpense.amount))})</strong>
 </p>
 </div>
 )}
 </div>
 </>
 );
 })()}
 </div>
 ) : null}

 {/* Nouvelle transaction — Modal */}
 {showModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
  <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-scale-in max-h-[90vh] overflow-y-auto">
  <div className="flex items-center justify-between mb-5">
  <h3 className="text-lg font-semibold text-ink">
  Nouvelle transaction
  </h3>
 <button
 onClick={() => setShowModal(false)}
                className="text-muted hover:text-muted"
              >
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
 </div>
 <form onSubmit={handleAddTransaction} className="space-y-4">
 {commercialMode && (
 <div className="flex gap-2">
 <button
 type="button"
 onClick={() => setNewTx({ ...newTx, scope: "personal" })}
 className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
 newTx.scope === "personal"
 ? "bg-forest text-white shadow-sm"
 : "bg-border text-muted hover:bg-sand"
 }`}
 >
 Personnel
 </button>
 <button
 type="button"
 onClick={() => setNewTx({ ...newTx, scope: "activity" })}
 className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
 newTx.scope === "activity"
 ? "bg-ochre text-white shadow-sm"
 : "bg-border text-muted hover:bg-sand"
 }`}
 >
 Activité
 </button>
 </div>
 )}
 <div className="flex gap-2">
 <button
 type="button"
 onClick={() => setNewTx({ ...newTx, type: "expense" })}
 className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
 newTx.type === "expense"
 ? "bg-ochre text-white shadow-sm"
 : "bg-border text-muted hover:bg-sand"
 }`}
 >
 Dépense
 </button>
 <button
 type="button"
 onClick={() => setNewTx({ ...newTx, type: "income" })}
 className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
 newTx.type === "income"
 ? "bg-forest-light text-white shadow-sm"
 : "bg-border text-muted hover:bg-sand"
 }`}
 >
 Revenu
 </button>
 </div>

 <div>
 <label className="block text-sm text-muted mb-1">Montant</label>
 <input
 type="number"
 value={newTx.amount}
 onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
 className="input-field"
 placeholder="Ex: 5000"
 required
 min="1"
 />
 </div>

 <div>
 <label className="block text-sm text-muted mb-1">Description</label>
 <input
 type="text"
 value={newTx.description}
 onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
 className="input-field"
 placeholder="Ex: Achat alimentation"
 required
 />
 </div>

   <div>
   <label className="block text-sm text-muted mb-1">Catégorie</label>
    <CustomSelect
    options={categories.filter((c: any) => c.type === newTx.type && (limits?.isPremium || !c.archived)).map((c: any) => ({ value: String(c.id), label: c.name }))}
    value={newTx.categoryId}
    onChange={(v) => setNewTx({ ...newTx, categoryId: v })}
    placeholder="Sélectionner..."
    />
   </div>

 {limits && !limits.isPremium && user?.role === "user" && (
 <div className="p-3 bg-ochre-light rounded-xl">
 <div className="flex items-center justify-between text-xs mb-1">
 <span className="font-medium text-ochre">
 {newTx.type === "income" ? "Revenus" : "Dépenses"} ce mois
 </span>
 <span className="font-semibold text-ochre">
 {newTx.type === "income" ? limits.incomeCount : limits.expenseCount}/{newTx.type === "income" ? limits.maxFreeIncome : limits.maxFreeExpense}
 </span>
 </div>
 {(newTx.type === "income" && limits.incomeCount >= limits.maxFreeIncome) ||
 (newTx.type === "expense" && limits.expenseCount >= limits.maxFreeExpense) ? (
 <p className="text-xs text-red-600">Limite mensuelle atteinte. Passez à Premium.</p>
 ) : (
 <p className="text-xs text-ochre">
 {Math.max(0, (newTx.type === "income" ? limits.maxFreeIncome : limits.maxFreeExpense) - (newTx.type === "income" ? limits.incomeCount : limits.expenseCount))} transaction(s) restante(s)
 </p>
 )}
 </div>
 )}

 {txError && (
 <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">
 {txError}
 </p>
 )}

 {(() => {
 const atLimit = limits && !limits.isPremium && user?.role === "user" && (
 (newTx.type === "income" && limits.incomeCount >= limits.maxFreeIncome) ||
 (newTx.type === "expense" && limits.expenseCount >= limits.maxFreeExpense)
 );
 return (
 <button type="submit" disabled={!!atLimit} className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed">
 Ajouter
 </button>
 );
 })()}
 </form>
 </div>
 </div>
 )}
 </div>
 );
}
