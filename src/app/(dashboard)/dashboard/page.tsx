"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "../layout";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWallet, faArrowTrendUp, faArrowTrendDown, faPlus, faCircleExclamation, faBriefcase, faUser, faArrowRight, faClock, faBagShopping, faPiggyBank, faTriangleExclamation, faCrown, faChartBar, faXmark, faArrowsUpDown, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency, formatDate } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/lib/colors";
import CustomSelect from "@/components/ui/CustomSelect";
import OnboardingModal from "@/components/OnboardingModal";

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
  const [activeCategoryIds, setActiveCategoryIds] = useState<number[]>([]);
  const [newTx, setNewTx] = useState({ type: "expense", amount: "", description: "", categoryId: "", scope: "personal" });
  const [txError, setTxError] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [limits, setLimits] = useState<{
  isPremium: boolean;
  incomeCount: number;
  expenseCount: number;
  maxFreeIncome: number;
  maxFreeExpense: number;
  } | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

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
  setActiveCategoryIds(catData.activeCategoryIds || []);
  setLimits(limitsData);
  } catch (e) {
  setLoadError("Impossible de charger les données. Vérifiez votre connexion.");
  console.error(e);
  } finally {
  setLoading(false);
  }
 }

  useEffect(() => {
    document.title = "Dashboard — Akwetche";
    loadData();
  }, []);

  useEffect(() => {
    if (!loading && user && user.onboardingCompleted === false && categories.length === 0) {
      setShowOnboarding(true);
    }
  }, [loading, user, categories]);

  async function completeOnboarding() {
    setShowOnboarding(false);
    await fetch("/api/user", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboardingCompleted: true }),
    });
  }

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
  <div className="space-y-5 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className="h-6 w-44 bg-stone/30 rounded-lg" />
        <div className="h-4 w-32 bg-stone/20 rounded-lg" />
      </div>
      <div className="h-10 w-40 bg-stone/30 rounded-xl hidden sm:block" />
    </div>
    <div className="bg-forest/20 rounded-2xl p-6 space-y-3">
      <div className="h-4 w-32 bg-white/20 rounded-lg" />
      <div className="h-8 w-48 bg-white/20 rounded-lg" />
      <div className="flex gap-4">
        <div className="h-4 w-24 bg-white/20 rounded-lg" />
        <div className="h-4 w-24 bg-white/20 rounded-lg" />
      </div>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div className="card p-4 space-y-2"><div className="h-4 w-20 bg-stone/30 rounded-lg" /><div className="h-7 w-28 bg-stone/20 rounded-lg" /></div>
      <div className="card p-4 space-y-2"><div className="h-4 w-20 bg-stone/30 rounded-lg" /><div className="h-7 w-28 bg-stone/20 rounded-lg" /></div>
      <div className="card p-4 space-y-2 col-span-2 sm:col-span-1"><div className="h-4 w-20 bg-stone/30 rounded-lg" /><div className="h-7 w-28 bg-stone/20 rounded-lg" /></div>
    </div>
    <div className="card p-5 space-y-3">
      <div className="h-4 w-40 bg-stone/30 rounded-lg" />
      <div className="space-y-2">
        <div className="h-4 w-full bg-stone/20 rounded-lg" />
        <div className="h-4 w-3/4 bg-stone/20 rounded-lg" />
        <div className="h-4 w-1/2 bg-stone/20 rounded-lg" />
      </div>
    </div>
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
   className="btn-primary hidden sm:flex items-center gap-2 text-sm self-start sm:self-auto"
   >
   <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
   Nouvelle transaction
   </button>
 </div>

  {/* Erreur chargement */}
  {loadError && (
  <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 animate-fade-in">
  <FontAwesomeIcon icon={faTriangleExclamation} className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
  <p className="text-sm text-red-700 flex-1">{loadError}</p>
  <button onClick={() => setLoadError(null)} className="text-red-400 hover:text-red-600 shrink-0"><FontAwesomeIcon icon={faXmark} className="w-4 h-4" /></button>
  </div>
  )}

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

  {/* Hero card — Argent disponible */}
  <div className="relative overflow-hidden bg-gradient-to-br from-forest via-[#1E4D35] to-[#2A6347] rounded-2xl p-6 md:p-8 text-white shadow-lg animate-fade-in">
    {/* Décorations de fond */}
    <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/[0.04]" />
    <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/[0.04]" />
    <div className="absolute top-1/3 right-1/4 w-20 h-20 rounded-full bg-white/[0.02]" />

    <div className="relative z-10">
      {/* En-tête avec montant */}
      <div className="flex items-start gap-4 mb-5">
        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0">
          <FontAwesomeIcon icon={faWallet} className="w-6 h-6 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Argent disponible</p>
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mt-1 break-all">{formatCurrency(totalBalance)}</p>
        </div>
      </div>

      {/* Pills Revenus / Dépenses */}
      <div className="flex flex-wrap items-center gap-2.5 mb-5 pb-5 border-b border-white/10">
        <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-xl px-3.5 py-1.5 text-sm font-medium">
          <FontAwesomeIcon icon={faArrowTrendUp} className="w-3.5 h-3.5 text-green-300" />
          <span>+{formatCurrency(totalIncome)}</span>
          <span className="text-white/50 text-xs font-normal">reçus</span>
        </span>
        <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-xl px-3.5 py-1.5 text-sm font-medium">
          <FontAwesomeIcon icon={faArrowTrendDown} className="w-3.5 h-3.5 text-red-300" />
          <span>-{formatCurrency(totalExpense)}</span>
          <span className="text-white/50 text-xs font-normal">dépensés</span>
        </span>
      </div>

      {/* Mini stat cards en ligne */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="min-w-0 overflow-hidden bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
          <p className="text-[10px] text-white/50 uppercase tracking-wider truncate">Revenus</p>
          <p className="text-sm font-bold mt-1 truncate">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="min-w-0 overflow-hidden bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
          <p className="text-[10px] text-white/50 uppercase tracking-wider truncate">Dépenses</p>
          <p className="text-sm font-bold mt-1 truncate">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="col-span-2 sm:col-span-1 min-w-0 overflow-hidden bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
          <p className="text-[10px] text-white/50 uppercase tracking-wider truncate">Épargne</p>
          <p className="text-sm font-bold mt-1 truncate">{savingsRate.toFixed(0)}%</p>
        </div>
      </div>
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

  {/* Grille : Répartition dépenses + Projection */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
  {/* Répartition des dépenses */}
  <div className="card p-5 animate-fade-in">
  <div className="flex items-center gap-2 mb-1">
    <div className="w-2 h-2 rounded-full bg-forest shrink-0" />
    <h2 className="text-sm font-semibold text-ink">Répartition des dépenses</h2>
  </div>
  <p className="text-xs text-muted mb-4">Cette semaine</p>
  {weekExpenses.length === 0 && (!commercialMode || weekActivityExpenses.length === 0) ? (
  <div className="text-center py-8">
    <div className="w-12 h-12 bg-sand rounded-2xl flex items-center justify-center mx-auto mb-3">
      <FontAwesomeIcon icon={faArrowTrendDown} className="w-5 h-5 text-muted" />
    </div>
    <p className="text-sm text-muted">Aucune dépense cette semaine</p>
  </div>
  ) : (
  <div className="space-y-4">
  {weekExpenses.length > 0 && (
  <div>
  {commercialMode && (
    <div className="flex items-center gap-1.5 mb-3">
      <span className="w-2 h-2 rounded-full bg-forest" />
      <span className="text-xs font-semibold text-forest uppercase tracking-wider">Personnel</span>
    </div>
  )}
   <div className="space-y-3">
   {weekExpenses.slice(0, 5).map((cat, i) => {
   const absAmount = Math.abs(cat.amount);
   const pct = totalWeekExpense > 0 ? (absAmount / totalWeekExpense) * 100 : 0;
   const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
   return (
   <div key={cat.name}>
   <div className="flex justify-between text-sm mb-1.5">
   <span className="text-ink flex items-center gap-2">
   <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: color }} />
   {cat.name}
   </span>
   <span className="text-muted font-medium tabular-nums">{pct.toFixed(0)}% <span className="text-muted/60">{formatCurrency(absAmount)}</span></span>
   </div>
   <div className="h-2.5 bg-sand rounded-full overflow-hidden">
   <div
    className="h-full rounded-full transition-all duration-700 ease-out"
    style={{ width: `${pct}%`, backgroundColor: color }}
   />
   </div>
   </div>
   );
   })}
  </div>
  </div>
  )}
  {commercialMode && weekActivityExpenses.length > 0 && (
  <div>
  <div className="flex items-center gap-1.5 mb-3">
    <span className="w-2 h-2 rounded-full bg-ochre" />
    <span className="text-xs font-semibold text-ochre uppercase tracking-wider">Activité</span>
  </div>
   <div className="space-y-3">
   {weekActivityExpenses.slice(0, 5).map((cat, i) => {
   const absAmount = Math.abs(cat.amount);
   const pct = totalWeekActivityExpense > 0 ? (absAmount / totalWeekActivityExpense) * 100 : 0;
   const color = CATEGORY_COLORS[(i + 3) % CATEGORY_COLORS.length];
   return (
   <div key={cat.name}>
   <div className="flex justify-between text-sm mb-1.5">
   <span className="text-ink flex items-center gap-2">
   <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: color }} />
   {cat.name}
   </span>
   <span className="text-muted font-medium tabular-nums">{pct.toFixed(0)}% <span className="text-muted/60">{formatCurrency(absAmount)}</span></span>
   </div>
   <div className="h-2.5 bg-sand rounded-full overflow-hidden">
   <div
    className="h-full rounded-full transition-all duration-700 ease-out"
    style={{ width: `${pct}%`, backgroundColor: color }}
   />
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
  <div className="flex items-center gap-2 mb-1">
    <div className="w-2 h-2 rounded-full bg-ochre shrink-0" />
    <h2 className="text-sm font-semibold text-ink">Projection</h2>
  </div>
  <p className="text-xs text-muted mb-4">Estimation si vous continuez à ce rythme</p>

  <div className="bg-gradient-to-br from-sand to-sand/80 rounded-xl p-5 text-center">
    <p className="text-xs text-muted mb-1">Solde estimé en fin de mois</p>
    <p className={`text-3xl font-bold tracking-tight ${projectedRemaining >= 0 ? "text-forest" : "text-red-500"}`}>
      {formatCurrency(projectedRemaining)}
    </p>

    {/* Barre de progression budget */}
    <div className="mt-4 space-y-1.5">
      <div className="flex justify-between text-xs text-muted">
        <span>Dépensé</span>
        <span>{formatCurrency(totalExpense)}</span>
      </div>
      <div className="h-3 bg-white rounded-full overflow-hidden border border-border">
        <div
          className={`h-full rounded-full transition-all duration-700 ${projectedRemaining >= 0 ? "bg-forest" : "bg-red-500"}`}
          style={{ width: `${Math.min(100, (totalExpense / Math.max(1, totalExpense + Math.max(0, projectedRemaining))) * 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted">
        <span>Restant</span>
        <span>{formatCurrency(Math.max(0, projectedRemaining))}</span>
      </div>
    </div>
  </div>

  <div className="mt-4 flex items-center justify-between text-sm px-1">
    <span className="text-muted">Dépense moyenne / jour</span>
    <span className="font-semibold text-ink tabular-nums">{formatCurrency(dailyAvgExpense)}</span>
  </div>
  <div className="flex items-center justify-between text-sm px-1 mt-1.5">
    <span className="text-muted">Jours restants</span>
    <span className="font-semibold text-ink tabular-nums">{daysLeft} jour{daysLeft > 1 ? "s" : ""}</span>
  </div>

  {projectedRemaining < 0 && (
  <div className="mt-4 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl">
    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
      <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 text-red-500" />
    </div>
    <div>
      <p className="text-xs font-semibold text-red-700">Attention</p>
      <p className="text-xs text-red-600 mt-0.5">Vous dépensez plus que votre budget disponible.</p>
    </div>
  </div>
  )}
  </div>
  </div>

  {/* Indicateurs clés */}
  {(personalSummary || activitySummary) && (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-forest/10 flex items-center justify-center">
          <FontAwesomeIcon icon={faPiggyBank} className="w-5 h-5 text-forest" />
        </div>
        <div>
          <p className="text-xs text-muted">Taux d&apos;épargne</p>
          <p className="text-lg font-bold text-ink">{savingsRate.toFixed(0)}%</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              savingsRate >= 20 ? "bg-forest" : savingsRate >= 5 ? "bg-ochre" : "bg-red-500"
            }`}
            style={{ width: `${Math.min(100, savingsRate)}%` }}
          />
        </div>
        <span className="text-xs text-muted shrink-0">{formatCurrency(totalSavings)}</span>
      </div>
    </div>

    <div className="card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-ochre/10 flex items-center justify-center">
          <FontAwesomeIcon icon={faArrowTrendDown} className="w-5 h-5 text-ochre" />
        </div>
        <div>
          <p className="text-xs text-muted">Plus grosse dépense</p>
          <p className="text-lg font-bold text-ink truncate">
            {biggestExpense ? biggestExpense.name : "—"}
          </p>
        </div>
      </div>
      <p className="text-xs text-muted">
        {biggestExpense
          ? `${formatCurrency(Math.abs(biggestExpense.amount))} · ${biggestExpense.type === "expense" ? "dépense" : "revenu"}`
          : "Aucune dépense ce mois-ci"}
      </p>
    </div>

    <div className="card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-forest/10 flex items-center justify-center">
          <FontAwesomeIcon icon={faWallet} className="w-5 h-5 text-forest" />
        </div>
        <div>
          <p className="text-xs text-muted">Dépense moyenne / jour</p>
          <p className="text-lg font-bold text-ink">{formatCurrency(dailyAvgExpense)}</p>
        </div>
      </div>
      <p className="text-xs text-muted">{daysLeft} jour{daysLeft > 1 ? "s" : ""} restant{daysLeft > 1 ? "s" : ""} ce mois</p>
    </div>
  </div>
  )}

  {/* Section Activité — résumé commercial */}
  {commercialMode && activitySummary && (activitySummary.income + activitySummary.expense > 0) && (
  <div className="relative overflow-hidden bg-gradient-to-br from-white via-white to-ochre-light/30 rounded-2xl p-5 border border-ochre/20 shadow-sm animate-fade-in">
    <div className="absolute top-0 right-0 w-32 h-32 bg-ochre/5 rounded-full -mr-10 -mt-10" />
    <div className="relative z-10">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-10 h-10 rounded-xl bg-ochre/10 flex items-center justify-center">
          <FontAwesomeIcon icon={faBriefcase} className="w-5 h-5 text-ochre" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-ink">Mon activité</h2>
          <p className="text-xs text-muted">Résumé commercial du mois</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="min-w-0 overflow-hidden bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-ochre/10">
          <p className="text-xs text-muted uppercase tracking-wider truncate">Chiffre d&apos;affaires</p>
          <p className="text-xl font-bold text-ochre mt-1 truncate">{formatCurrency(activitySummary.income)}</p>
        </div>
        <div className="min-w-0 overflow-hidden bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-ochre/10">
          <p className="text-xs text-muted uppercase tracking-wider truncate">Bénéfice</p>
          <p className="text-xl font-bold text-forest mt-1 truncate">{formatCurrency(Math.max(0, activitySummary.savings))}</p>
          <p className="text-[10px] text-muted mt-0.5">après dépenses</p>
        </div>
        <div className="min-w-0 overflow-hidden bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-ochre/10">
          <p className="text-xs text-muted uppercase tracking-wider truncate">Marge</p>
          <p className="text-xl font-bold text-ink mt-1 truncate">
            {activitySummary.income > 0 ? ((Math.max(0, activitySummary.savings) / activitySummary.income) * 100).toFixed(0) : 0}%
          </p>
        </div>
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
  className="inline-flex items-center gap-1 text-xs font-medium text-forest hover:text-forest-light transition-colors"
  >
  Voir tout
  <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
  </a>
  </div>
  {recentTransactions.length === 0 ? (
  <div className="text-center py-8">
  <div className="w-12 h-12 bg-sand rounded-2xl flex items-center justify-center mx-auto mb-3">
  <FontAwesomeIcon icon={faClock} className="w-5 h-5 text-muted" />
  </div>
  <p className="text-sm text-muted">Aucune opération pour le moment</p>
  <button
  onClick={() => setShowModal(true)}
  className="text-forest text-sm font-medium mt-2 hover:text-forest-light underline underline-offset-2"
  >
  Ajouter une transaction
  </button>
  </div>
  ) : (
  <div className="space-y-1">
  {recentTransactions.map((tx, i) => {
  const isIncome = tx.type === "income";
  return (
  <div
  key={tx.id}
  className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl hover:bg-sand transition-all duration-200 animate-slide-in"
  style={{ animationDelay: `${i * 50}ms` }}
  >
  <div
  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
  isIncome ? "bg-forest/10" : "bg-ochre/10"
  }`}
  >
  <FontAwesomeIcon
  icon={isIncome ? faArrowTrendUp : faArrowTrendDown}
  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isIncome ? "text-forest" : "text-ochre"}`}
  />
  </div>
  <div className="flex-1 min-w-0">
  <div className="flex items-start justify-between gap-2">
  <p className="text-sm font-medium text-ink truncate">
  {tx.description}
  </p>
  <span className={`text-sm font-bold tabular-nums shrink-0 whitespace-nowrap ${isIncome ? "text-forest" : "text-ochre"}`}>
  {isIncome ? "+" : "-"}{formatCurrency(tx.amount)}
  </span>
  </div>
  <p className="text-xs text-muted truncate mt-0.5">
  {tx.category?.name || "Non catégorisé"}
  <span className="text-muted/40 mx-1">·</span>
  {formatDate(tx.date)}
  {tx.scope === "activity" && (
  <><span className="text-muted/40 mx-1">·</span><span className="text-ochre font-medium">Activité</span></>
  )}
  </p>
  </div>
  </div>
  );
  })}
  </div>
  )}
  </div>

  {/* Rappel catégories / Liens rapides */}
  {categories.length === 0 ? (
  <div className="card p-5 animate-fade-in border-l-4 border-l-ochre">
  <div className="flex items-start gap-3">
  <div className="w-10 h-10 rounded-xl bg-ochre-light flex items-center justify-center shrink-0">
  <FontAwesomeIcon icon={faCircleExclamation} className="w-5 h-5 text-ochre" />
  </div>
  <div>
  <p className="text-sm font-semibold text-ink">
  Configurez vos catégories
  </p>
  <p className="text-sm text-muted mt-1 leading-relaxed">
  Avant d&apos;ajouter des transactions, créez des catégories de dépenses et revenus dans les paramètres.
  </p>
  <a
  href="/dashboard/settings"
  className="inline-flex items-center gap-1.5 text-sm font-medium text-ochre hover:text-ochre-light mt-3 transition-colors"
  >
  Aller aux paramètres
  <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
  </a>
  </div>
  </div>
  </div>
  ) : (
  <div className="card p-5 animate-fade-in">
  <h2 className="text-sm font-semibold text-ink mb-4">Liens rapides</h2>
  <div className="space-y-2.5">
  <a
  href="/dashboard/transactions"
  className="group flex items-center gap-4 p-3.5 rounded-xl border border-border hover:border-forest/20 hover:bg-forest/[0.02] transition-all"
  >
  <div className="w-10 h-10 rounded-xl bg-forest/10 flex items-center justify-center group-hover:bg-forest/20 transition-colors">
  <FontAwesomeIcon icon={faArrowsUpDown} className="w-4 h-4 text-forest" />
  </div>
  <div className="flex-1">
  <p className="text-sm font-medium text-ink group-hover:text-forest transition-colors">Voir tout l&apos;historique</p>
  <p className="text-xs text-muted">Consultez et filtrez toutes vos opérations</p>
  </div>
  <FontAwesomeIcon icon={faChevronRight} className="w-3 h-3 text-muted group-hover:text-forest transition-colors" />
  </a>
  {commercialMode && (
  <>
  <a
  href="/dashboard/products"
  className="group flex items-center gap-4 p-3.5 rounded-xl border border-border hover:border-ochre/20 hover:bg-ochre/[0.02] transition-all"
  >
  <div className="w-10 h-10 rounded-xl bg-ochre/10 flex items-center justify-center group-hover:bg-ochre/20 transition-colors">
  <FontAwesomeIcon icon={faBagShopping} className="w-4 h-4 text-ochre" />
  </div>
  <div className="flex-1">
  <p className="text-sm font-medium text-ink group-hover:text-ochre transition-colors">Gérer mes produits</p>
  <p className="text-xs text-muted">Ajoutez ou modifiez votre catalogue</p>
  </div>
  <FontAwesomeIcon icon={faChevronRight} className="w-3 h-3 text-muted group-hover:text-ochre transition-colors" />
  </a>
  <a
  href="/dashboard/sales"
  className="group flex items-center gap-4 p-3.5 rounded-xl border border-border hover:border-ochre/20 hover:bg-ochre/[0.02] transition-all"
  >
  <div className="w-10 h-10 rounded-xl bg-ochre/10 flex items-center justify-center group-hover:bg-ochre/20 transition-colors">
  <FontAwesomeIcon icon={faArrowTrendUp} className="w-4 h-4 text-ochre" />
  </div>
  <div className="flex-1">
  <p className="text-sm font-medium text-ink group-hover:text-ochre transition-colors">Enregistrer une vente</p>
  <p className="text-xs text-muted">Suivez votre chiffre d&apos;affaires</p>
  </div>
  <FontAwesomeIcon icon={faChevronRight} className="w-3 h-3 text-muted group-hover:text-ochre transition-colors" />
  </a>
  </>
  )}
  </div>
  </div>
  )}
  </div>

  {/* Synthèse du mois */}
  {(monthPersonal && (monthPersonal.income + monthPersonal.expense > 0)) ||
  (commercialMode && monthActivity && (monthActivity.income + monthActivity.expense > 0)) ? (
  <div className="card p-5 animate-fade-in">
    <div className="flex items-center gap-2 mb-4">
      <div className="w-2 h-2 rounded-full bg-forest shrink-0" />
      <h2 className="text-sm font-semibold text-ink">Synthèse du mois</h2>
    </div>

    {(() => {
      const showPersonal = monthPersonal && monthPersonal.income + monthPersonal.expense > 0;
      const showActivity = monthActivity && commercialMode && monthActivity.income + monthActivity.expense > 0;
      const personalRate = monthPersonal && monthPersonal.income > 0 ? (monthPersonal.savings / monthPersonal.income) * 100 : 0;
      const tIncome = (monthPersonal?.income || 0) + (monthActivity?.income || 0);
      const tExpense = (monthPersonal?.expense || 0) + (monthActivity?.expense || 0);
      const tSaved = Math.max(0, (monthPersonal?.savings || 0)) + Math.max(0, (monthActivity?.savings || 0));
      const tBalance = (monthPersonal?.balance || 0) + (monthActivity?.balance || 0);
      const sRate = tIncome > 0 ? (tSaved / tIncome) * 100 : 0;
      const allCats = [...(monthPersonal?.topCategories ?? []), ...(monthActivity?.topCategories ?? [])];
      const bExpense = allCats.filter(c => c.type === "expense").sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];

      return (
      <>
        {/* 4 KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="min-w-0 overflow-hidden bg-forest/[0.04] rounded-xl p-3.5 text-center">
            <p className="text-[10px] text-muted uppercase tracking-wider truncate">Revenus</p>
            <p className="text-base font-bold text-forest mt-0.5 truncate">{formatCurrency(tIncome)}</p>
          </div>
          <div className="min-w-0 overflow-hidden bg-ochre/[0.04] rounded-xl p-3.5 text-center">
            <p className="text-[10px] text-muted uppercase tracking-wider truncate">Dépenses</p>
            <p className="text-base font-bold text-ochre mt-0.5 truncate">{formatCurrency(tExpense)}</p>
          </div>
          <div className="min-w-0 overflow-hidden bg-forest/[0.04] rounded-xl p-3.5 text-center">
            <p className="text-[10px] text-muted uppercase tracking-wider truncate">Épargne</p>
            <p className="text-base font-bold text-forest mt-0.5 truncate">{formatCurrency(tSaved)}</p>
          </div>
          <div className="min-w-0 overflow-hidden bg-ochre/[0.04] rounded-xl p-3.5 text-center">
            <p className="text-[10px] text-muted uppercase tracking-wider truncate">Taux</p>
            <p className="text-base font-bold text-ink mt-0.5 truncate">{sRate.toFixed(0)}%</p>
          </div>
        </div>

        {/* Tableau comparatif Perso / Activité / Total (desktop) */}
        {showPersonal && showActivity && (
        <>
        <div className="hidden sm:block rounded-xl border border-border overflow-hidden mb-4">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sand">
                <th className="text-left px-4 py-2.5 font-semibold text-muted"></th>
                <th className="text-right px-4 py-2.5 font-semibold text-forest">Perso</th>
                <th className="text-right px-4 py-2.5 font-semibold text-ochre">Activité</th>
                <th className="text-right px-4 py-2.5 font-semibold text-ink">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-2 text-muted">Revenus</td>
                <td className="text-right px-4 py-2 font-medium text-forest">{formatCurrency(monthPersonal?.income || 0)}</td>
                <td className="text-right px-4 py-2 font-medium text-ochre">{formatCurrency(monthActivity?.income || 0)}</td>
                <td className="text-right px-4 py-2 font-bold text-ink">{formatCurrency(tIncome)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-muted">Dépenses</td>
                <td className="text-right px-4 py-2 font-medium text-ochre">{formatCurrency(monthPersonal?.expense || 0)}</td>
                <td className="text-right px-4 py-2 font-medium text-red-500">{formatCurrency(monthActivity?.expense || 0)}</td>
                <td className="text-right px-4 py-2 font-bold text-ink">{formatCurrency(tExpense)}</td>
              </tr>
              <tr className="bg-ochre-light/30">
                <td className="text-left px-4 py-2 font-medium text-ink">Résultat</td>
                <td className="text-right px-4 py-2 font-bold text-forest">{formatCurrency(Math.max(0, monthPersonal?.savings || 0))}</td>
                <td className="text-right px-4 py-2 font-bold text-ochre">{formatCurrency(Math.max(0, monthActivity?.savings || 0))}</td>
                <td className="text-right px-4 py-2 font-bold text-forest">{formatCurrency(tSaved)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        </div>

        {/* Fiches récap — Mobile */}
        <div className="sm:hidden space-y-3 mb-4">
          {showPersonal && (
            <div className="bg-white rounded-xl border border-border p-4">
              <p className="text-xs font-semibold text-forest uppercase tracking-wider mb-3">Personnel</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted">Revenus</span><span className="font-medium text-forest">{formatCurrency(monthPersonal?.income || 0)}</span></div>
                <div className="flex justify-between"><span className="text-muted">Dépenses</span><span className="font-medium text-ochre">{formatCurrency(monthPersonal?.expense || 0)}</span></div>
                <div className="flex justify-between border-t border-border pt-2"><span className="text-ink font-medium">Résultat</span><span className="font-bold text-forest">{formatCurrency(Math.max(0, monthPersonal?.savings || 0))}</span></div>
                <div className="flex justify-between"><span className="text-muted">Taux</span><span className="font-semibold text-ink">{monthPersonal?.income ? `${personalRate.toFixed(0)}%` : "-"}</span></div>
              </div>
            </div>
          )}
          {showActivity && (
            <div className="bg-white rounded-xl border border-border p-4">
              <p className="text-xs font-semibold text-ochre uppercase tracking-wider mb-3">Activité</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted">Revenus</span><span className="font-medium text-ochre">{formatCurrency(monthActivity?.income || 0)}</span></div>
                <div className="flex justify-between"><span className="text-muted">Dépenses</span><span className="font-medium text-red-500">{formatCurrency(monthActivity?.expense || 0)}</span></div>
                <div className="flex justify-between border-t border-border pt-2"><span className="text-ink font-medium">Résultat</span><span className="font-bold text-ochre">{formatCurrency(Math.max(0, monthActivity?.savings || 0))}</span></div>
                <div className="flex justify-between"><span className="text-muted">Taux</span><span className="font-semibold text-ink">{monthActivity?.income ? `${((Math.max(0, monthActivity?.savings || 0) / monthActivity!.income) * 100).toFixed(0)}%` : "-"}</span></div>
              </div>
            </div>
          )}
          <div className="bg-ochre-light/30 rounded-xl border border-border p-4">
            <p className="text-xs font-semibold text-ink uppercase tracking-wider mb-3">Total</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted">Revenus</span><span className="font-semibold text-ink">{formatCurrency(tIncome)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Dépenses</span><span className="font-semibold text-ink">{formatCurrency(tExpense)}</span></div>
              <div className="flex justify-between border-t border-border pt-2"><span className="text-ink font-medium">Résultat</span><span className="font-bold text-forest">{formatCurrency(tSaved)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Taux</span><span className="font-bold text-ink">{sRate.toFixed(0)}%</span></div>
            </div>
          </div>
        </div>
        </>
        )}

        {/* Blocs descriptifs par scope (Premium) */}
        {(limits?.isPremium || user?.role !== "user") && (showPersonal || showActivity) && (
        <>
          {showPersonal && (
          <div className="bg-white border border-border rounded-xl p-4 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-forest/10 flex items-center justify-center shrink-0">
                <FontAwesomeIcon icon={faWallet} className="w-3.5 h-3.5 text-forest" />
              </div>
              <span className="text-xs font-semibold text-forest uppercase tracking-wider">Personnel</span>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              Sur le plan personnel, vous avez reçu <strong className="text-ink">{formatCurrency(monthPersonal!.income)}</strong>&nbsp;en revenus et dépensé <strong className="text-ink">{formatCurrency(monthPersonal!.expense)}</strong>&nbsp;ce mois-ci.
              Capital initial&nbsp;: <strong className="text-ink">{formatCurrency(monthPersonal!.initialBalance)}</strong>, solde actuel&nbsp;: <strong className="text-ink">{formatCurrency(monthPersonal!.balance)}</strong>.
              Taux d&apos;épargne&nbsp;: <strong className="text-ink">{personalRate.toFixed(0)}%</strong>.
            </p>
            {monthPersonal!.topCategories && monthPersonal!.topCategories.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-xs text-muted">Top catégories&nbsp;:</span>
              {monthPersonal!.topCategories.slice(0, 3).map(c => (
                <span key={c.name} className="inline-flex items-center gap-1 bg-sand rounded-lg px-2.5 py-1 text-xs text-ink font-medium">
                  {c.name}&nbsp;<span className="text-muted font-normal shrink-0">{formatCurrency(Math.abs(c.amount))}</span>
                </span>
              ))}
            </div>
            )}
          </div>
          )}
          {showActivity && (
          <div className="bg-white border border-border rounded-xl p-4 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-ochre/10 flex items-center justify-center shrink-0">
                <FontAwesomeIcon icon={faBriefcase} className="w-3.5 h-3.5 text-ochre" />
              </div>
              <span className="text-xs font-semibold text-ochre uppercase tracking-wider">Activité</span>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              Côté activité, vous avez réalisé <strong className="text-ink">{formatCurrency(monthActivity!.income)}</strong>&nbsp;de chiffre d&apos;affaires pour <strong className="text-ink">{formatCurrency(monthActivity!.expense)}</strong>&nbsp;de charges.
              Bénéfice&nbsp;: <strong className="text-ink">{formatCurrency(Math.max(0, monthActivity!.savings))}</strong>
              {monthActivity!.income > 0 && <span> (marge de <strong className="text-ink">{((Math.max(0, monthActivity!.savings) / monthActivity!.income) * 100).toFixed(0)}%</strong>)</span>}.
            </p>
            {monthActivity!.topCategories && monthActivity!.topCategories.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-xs text-muted">Top catégories&nbsp;:</span>
              {monthActivity!.topCategories.slice(0, 3).map(c => (
                <span key={c.name} className="inline-flex items-center gap-1 bg-sand rounded-lg px-2.5 py-1 text-xs text-ink font-medium">
                  {c.name}&nbsp;<span className="text-muted font-normal shrink-0">{formatCurrency(Math.abs(c.amount))}</span>
                </span>
              ))}
            </div>
            )}
          </div>
          )}
        </>
        )}

        {/* Bilan mensuel */}
        <div className="flex flex-wrap items-center gap-2.5 p-4 bg-gradient-to-r from-forest/[0.03] to-ochre/[0.03] rounded-xl border border-border">
          <div className="flex-1 text-sm text-muted leading-relaxed">
            <span className="font-semibold text-ink">Bilan mensuel&nbsp;: </span>
            <span className="text-forest font-medium">+{formatCurrency(tIncome)}</span>
            <span className="text-muted/50"> reçus · </span>
            <span className="text-ochre font-medium">-{formatCurrency(tExpense)}</span>
            <span className="text-muted/50"> dépensés · </span>
            <span className="text-forest font-medium">={formatCurrency(tSaved)}</span>
            <span className="text-muted/50"> épargnés · </span>
            <span className="text-ink font-semibold">{sRate.toFixed(0)}%</span>
            {bExpense && (
              <span className="text-muted/50"> · Grosse dépense&nbsp;: <strong className="text-ink">{bExpense.name}</strong> ({formatCurrency(Math.abs(bExpense.amount))})</span>
            )}
            {sRate < 5 && showPersonal && (
              <span className="text-ochre"> · Taux faible ({sRate.toFixed(0)}%), surveillez vos dépenses</span>
            )}
            {sRate >= 20 && (
              <span className="text-forest"> · Excellent taux ({sRate.toFixed(0)}%)</span>
            )}
          </div>
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
     options={(() => {
     const isPrem = limits?.isPremium || false;
     const ofType = categories.filter((c: any) => c.type === newTx.type).sort((a: any, b: any) => a.id - b.id);
     if (isPrem) return ofType.map((c: any) => ({ value: String(c.id), label: c.name }));
     const active = ofType.filter((c: any) => activeCategoryIds.includes(c.id));
     const locked = ofType.filter((c: any) => !activeCategoryIds.includes(c.id));
     if (locked.length === 0) return active.map((c: any) => ({ value: String(c.id), label: c.name }));
     return [
     ...active.map((c: any) => ({ value: String(c.id), label: c.name })),
     { value: "__sep__", label: "Nécessitent Premium", separator: true },
     ...locked.map((c: any) => ({ value: String(c.id), label: c.name, disabled: true, disabledReason: "Premium requis" })),
     ];
     })()}
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

  {/* FAB mobile */}
  <button
  onClick={() => setShowModal(true)}
  className="sm:hidden fixed bottom-24 right-5 z-50 w-14 h-14 bg-forest text-white rounded-full shadow-lg flex items-center justify-center hover:bg-forest-dark transition-all active:scale-95"
  aria-label="Nouvelle transaction"
  >
  <FontAwesomeIcon icon={faPlus} className="w-6 h-6" />
  </button>

  {showOnboarding && (
    <OnboardingModal onClose={completeOnboarding} currency={user?.baseCurrency} countryCode={user?.countryCode} />
  )}
  </div>
  );
}
