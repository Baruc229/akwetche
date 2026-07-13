"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "../layout";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faCircleExclamation, faCrown, faArrowRight, faXmark, faLock, faUser, faBriefcase, faPiggyBank, faArrowTrendUp, faArrowDown, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency, toStorageCurrency, toDisplayCurrency } from "@/lib/utils";
import { detectCurrency, setActiveCurrency, type CurrencyCode } from "@/lib/currency";
import { CATEGORY_COLORS } from "@/lib/colors";
import CustomSelect from "@/components/ui/CustomSelect";
import OnboardingModal from "@/components/OnboardingModal";
import ExpenseBreakdown from "@/components/dashboard/ExpenseBreakdown";
import ProjectionCard from "@/components/dashboard/ProjectionCard";
import ActivitySummary from "@/components/dashboard/ActivitySummary";
import RecentTransactions from "@/components/dashboard/RecentTransactions";

type ScopeSummary = {
  income: number;
  expense: number;
  savings: number;
  balance: number;
  initialBalance: number;
  recurringExpense: number;
  pendingRecurringExpense: number;
  pendingRecurringIncome: number;
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
  const { user, commercialMode, setCurrency } = useDashboard();
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
  const [newTx, setNewTx] = useState({ type: "expense", amount: "", description: "", categoryId: "", scope: "personal", recurring: false, date: new Date().toISOString().split('T')[0] });
  const [txError, setTxError] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [limits, setLimits] = useState<{
    isPremium: boolean;
    incomeCount: number;
    expenseCount: number;
    maxFreeIncome: number;
    maxFreeExpense: number;
  } | null>(null);
  const [balanceHistory, setBalanceHistory] = useState<{ date: string; balance: number }[]>([]);

  const [subLoading, setSubLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const activeCurrency = detectCurrency();
  const isEuro = activeCurrency === "EUR";
  function handleToggle() {
    const next: CurrencyCode = isEuro ? "XOF" : "EUR";
    setActiveCurrency(next);
    setCurrency(next);
  }

  async function loadData() {
    try {
      const [monthRes, weekRes, txRes, catRes, limitsRes, histRes] = await Promise.all([
        fetch("/api/transactions/summary?period=month"),
        fetch("/api/transactions/summary?period=week"),
        fetch("/api/transactions?limit=3"),
        fetch("/api/categories"),
        fetch("/api/user/limits"),
        fetch("/api/transactions/balance-history?days=30"),
      ]);
      const monthData = await monthRes.json();
      const weekData = await weekRes.json();
      const txData = await txRes.json();
      const catData = await catRes.json();
      const limitsData = await limitsRes.json();
      const histData = await histRes.json();
      setMonthPersonal(monthData.personal || null);
      setMonthActivity(monthData.activity || null);
      setWeekPersonal(weekData.personal || null);
      setWeekActivity(weekData.activity || null);
      setRecentTransactions(txData.transactions || []);
      setCategories(catData.categories || []);
      setActiveCategoryIds(catData.activeCategoryIds || []);
      setLimits(limitsData);
      setBalanceHistory(Array.isArray(histData) ? histData : []);
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

    if (!newTx.amount || Number(newTx.amount) <= 0) { setTxError("Le montant doit être supérieur à 0"); return; }
    if (!newTx.description.trim()) { setTxError("La description est requise"); return; }
    if (!newTx.categoryId) { setTxError("La catégorie est requise"); return; }
    if (!newTx.date) { setTxError("La date est requise"); return; }

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
      const body: Record<string, unknown> = { type: newTx.type, amount: toStorageCurrency(Number(newTx.amount) || 0, activeCurrency), description: newTx.description, categoryId: Number(newTx.categoryId), date: newTx.date, scope: newTx.scope, recurring: newTx.recurring };
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setTxError(data.error || "Erreur");
        return;
      }
      setShowModal(false);
      setNewTx({ type: "expense", amount: "", description: "", categoryId: "", scope: "personal", recurring: false, date: new Date().toISOString().split('T')[0] });
      loadData();
      fetch("/api/user/limits").then(r => r.json()).then(setLimits);
    } catch {
      setTxError("Erreur réseau");
    }
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="skeleton h-6 w-44" />
            <div className="skeleton h-4 w-32" />
          </div>
        </div>
        <div className="card-hero space-y-3" style={{ background: 'var(--color-brand)' }}>
          <div className="skeleton h-4 w-32" style={{ background: 'rgba(255,255,255,0.2)' }} />
          <div className="skeleton h-10 w-48" style={{ background: 'rgba(255,255,255,0.2)' }} />
          <div className="grid grid-cols-2 gap-3">
            <div className="skeleton h-12 rounded-xl" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <div className="skeleton h-12 rounded-xl" style={{ background: 'rgba(255,255,255,0.1)' }} />
          </div>
        </div>
        <div className="card space-y-3">
          <div className="skeleton h-4 w-40" />
          <div className="space-y-2">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  const weekExpenses = (weekPersonal?.topCategories ?? []).filter(c => c.type === "expense");
  const weekActivityExpenses = (weekActivity?.topCategories ?? []).filter(c => c.type === "expense");

  const personalSummary = monthPersonal;
  const activitySummary = monthActivity;
  const totalIncome = (personalSummary?.income || 0) + (activitySummary?.income || 0);
  const totalExpense = (personalSummary?.expense || 0) + (activitySummary?.expense || 0);
  const totalBalance = (personalSummary?.balance || 0) + (activitySummary?.balance || 0);
  const isNegative = totalBalance < 0;
  const totalSavings = (personalSummary?.savings || 0) + (activitySummary?.savings || 0);

  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const dayOfMonth = new Date().getDate();
  const daysLeft = daysInMonth - dayOfMonth;
  const totalRecurringExpense = (personalSummary?.recurringExpense || 0) + (activitySummary?.recurringExpense || 0);
  const totalPendingRecurringExpense = (personalSummary?.pendingRecurringExpense || 0) + (activitySummary?.pendingRecurringExpense || 0);
  const totalPendingRecurringIncome = (personalSummary?.pendingRecurringIncome || 0) + (activitySummary?.pendingRecurringIncome || 0);
  const totalPonctuelExpense = totalExpense - totalRecurringExpense;
  const projectedExpenses = totalPendingRecurringExpense + (dayOfMonth > 0 ? (totalPonctuelExpense / dayOfMonth) * daysLeft : 0);
  const projectedRemaining = totalBalance - projectedExpenses + totalPendingRecurringIncome;
  const dailyAvgExpense = dayOfMonth > 0 ? totalExpense / dayOfMonth : 0;

  const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthlyBalances = balanceHistory.filter(d => new Date(d.date) >= startOfMonth);

  return (
    <div className="space-y-3 pb-24 sm:pb-0">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-ink">
              Bonjour, {user?.name?.split(" ")[0] || "utilisateur"}
            </h1>
            {limits?.isPremium && (
              <span className="badge-gold inline-flex items-center gap-1">
                <FontAwesomeIcon icon={faCrown} className="w-3 h-3" />
                Premium
              </span>
            )}
          </div>
          <p className="text-sm text-muted mt-0.5">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary hidden sm:flex self-start sm:self-auto"
        >
          <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
          Nouvelle transaction
        </button>
      </div>

      {/* Erreur chargement */}
      {loadError && (
        <div className="alert-inline neg">
          <FontAwesomeIcon icon={faCircleExclamation} className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm flex-1">{loadError}</p>
          <button onClick={() => setLoadError(null)} className="opacity-50 hover:opacity-100 shrink-0 transition-opacity">
            <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bannière configuration catégories */}
      {categories.length === 0 && (
        <div className="alert-inline warn">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-warn-bg)] flex items-center justify-center shrink-0">
            <FontAwesomeIcon icon={faCircleExclamation} className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">Configurez vos catégories</p>
            <p className="text-sm text-muted mt-1">
              Avant d&apos;ajouter des transactions, créez des catégories de dépenses et revenus dans les paramètres.
            </p>
            <a
              href="/dashboard/settings"
              className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-[var(--color-gold)] hover:opacity-80 transition-opacity"
            >
              Aller aux paramètres
              <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      {/* Bannière plan gratuit */}
      {limits && !limits.isPremium && user?.role === "user" && (
        <div className="card">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-gold-light)] flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={faCrown} className="w-5 h-5 text-[var(--color-gold)]" />
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
                className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-[var(--color-gold)] hover:opacity-80 transition-opacity"
              >
                Passer à Premium
                <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bannière solde initial */}
      {personalSummary && user?.initialBalance === 0 && user?.initialBalanceActivity === 0 && (totalIncome > 0 || totalExpense > 0) && (
        <div className="card">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-warn-bg)] flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={faCircleExclamation} className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink">Solde initial non défini</p>
              <p className="text-sm text-muted mt-1">
                Pour des projections précises, indiquez l&apos;argent que vous aviez avant de commencer dans les paramètres.
              </p>
              <a
                href="/dashboard/settings"
                className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-[var(--color-gold)] hover:opacity-80 transition-opacity"
              >
                Définir mon solde initial
                <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Bannière solde activité non renseigné */}
      {commercialMode && user?.initialBalanceActivity === 0 && monthActivity && (monthActivity.income + monthActivity.expense > 0) && (
        <div className="card">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-warn-bg)] flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={faBriefcase} className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink">Trésorerie de départ non renseignée</p>
              <p className="text-sm text-muted mt-1">
                Votre activité commerciale a des transactions mais aucun solde de départ n&apos;a été indiqué.
                Ajoutez-le dans les paramètres pour des soldes et projections plus précis.
              </p>
              <a
                href="/dashboard/settings"
                className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-[var(--color-gold)] hover:opacity-80 transition-opacity"
              >
                Définir ma trésorerie de départ
                <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Hero Card */}
      <div className="card-hero" style={{ background: 'linear-gradient(155deg, #1B2E28, #142320)' }}>
        <div className="flex items-center justify-between">
          <p className="text-label text-white/50">ARGENT DISPONIBLE</p>
          {(() => {
            if (balanceHistory.length < 8) return null;
            const recent7 = balanceHistory.slice(-7);
            const prev7 = balanceHistory.slice(-14, -7);
            if (recent7.length < 2 || prev7.length < 2) return null;
            const recentChange = recent7[recent7.length - 1].balance - recent7[0].balance;
            const prevChange = prev7[prev7.length - 1].balance - prev7[0].balance;
            if (prevChange === 0) return null;
            const pctChange = ((recentChange - prevChange) / Math.abs(prevChange)) * 100;
            if (!isFinite(pctChange)) return null;
            const isUp = pctChange >= 0;
            return (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(74,222,128,0.18)', color: '#4ADE80' }}
              >
                {isUp ? '▲' : '▼'} {Math.abs(pctChange).toFixed(0)}%
              </span>
            );
          })()}
        </div>
        <p className={`text-amount text-5xl text-white mt-1 ${isNegative ? "text-[var(--color-neg)]" : ""}`}>
          {formatCurrency(totalBalance)}
        </p>
        <button
          onClick={handleToggle}
          className="text-xs text-white/40 hover:text-white/70 transition-colors mb-4 underline underline-offset-2 decoration-white/20 cursor-pointer"
        >
          {isEuro ? "Voir en FCFA" : "Voir en EUR"}
        </button>
        <div className="h-px bg-white/10 mb-4" />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="card-inset" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <p className="text-label text-white/50">Reçus</p>
            <p className="text-amount text-lg" style={{ color: '#4ADE80' }}>{formatCurrency(totalIncome)}</p>
          </div>
          <div className="card-inset" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <p className="text-label text-white/50">Dépensés</p>
            <p className="text-amount text-lg" style={{ color: 'var(--color-neg)' }}>{formatCurrency(totalExpense)}</p>
          </div>
        </div>
        <div className="bar-row mb-2">
          <div className="bar-head">
            <div className="bar-label" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <FontAwesomeIcon icon={faPiggyBank} className="w-4 h-4 text-white/40" />
              Taux d&apos;épargne
            </div>
            <span className="bar-value text-white">{savingsRate > 0 && savingsRate < 1 ? savingsRate.toFixed(1) : savingsRate.toFixed(0)}%</span>
          </div>
          <div className="bar-track lg on-dark">
            <div className="bar-fill on-dark" style={{ width: `${Math.max(0, Math.min(100, savingsRate))}%` }} />
          </div>
        </div>
        {(() => {
          if (balanceHistory.length < 2) return null;
          const pts = balanceHistory.slice(-7);
          const vals = pts.map(d => d.balance);
          const lo = Math.min(...vals);
          const hi = Math.max(...vals);
          const span = hi - lo || 1;
          const W = 280, H = 30, P = 4;
          const coords = vals.map((v, i) => ({
            x: P + (i / (pts.length - 1)) * (W - P * 2),
            y: P + (1 - (v - lo) / span) * (H - P * 2),
          }));
          let curve = `M ${coords[0].x} ${coords[0].y}`;
          for (let i = 0; i < coords.length - 1; i++) {
            const c0 = coords[Math.max(0, i - 1)];
            const c1 = coords[i];
            const c2 = coords[i + 1];
            const c3 = coords[Math.min(coords.length - 1, i + 2)];
            curve += ` C ${c1.x + (c2.x - c0.x) / 6} ${c1.y + (c2.y - c0.y) / 6}, ${c2.x - (c3.x - c1.x) / 6} ${c2.y - (c3.y - c1.y) / 6}, ${c2.x} ${c2.y}`;
          }
          const fill = curve + ` L ${coords[coords.length - 1].x} ${H} L ${coords[0].x} ${H} Z`;
          return (
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" style={{ height: H }}>
              <defs>
                <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4ADE80" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#4ADE80" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <path d={fill} fill="url(#heroGrad)" />
              <path d={curve} fill="none" stroke="#4ADE80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          );
        })()}
      </div>

      {/* Grille : Répartition dépenses + Projection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ExpenseBreakdown
          personal={weekExpenses}
          activity={weekActivityExpenses}
          commercialMode={commercialMode}
        />
        <ProjectionCard
          projectedRemaining={projectedRemaining}
          dailyAvgExpense={dailyAvgExpense}
          daysLeft={daysLeft}
          dailyBalances={monthlyBalances}
          initialBalanceMissing={user?.initialBalance === 0 && user?.initialBalanceActivity === 0 && (totalIncome > 0 || totalExpense > 0)}
          totalBalance={totalBalance}
          pendingRecurringExpense={totalPendingRecurringExpense}
          pendingRecurringIncome={totalPendingRecurringIncome}
        />
      </div>

      {/* Activité commerciale */}
      {commercialMode && activitySummary && (activitySummary.income + activitySummary.expense > 0) && (
        <ActivitySummary
          income={activitySummary.income}
          expense={activitySummary.expense}
          savings={activitySummary.savings}
        />
      )}

      {/* Dernières opérations */}
      <RecentTransactions
        transactions={recentTransactions}
        onAdd={() => setShowModal(true)}
      />

      {/* Synthèse globale du mois */}
      {(monthPersonal && (monthPersonal.income + monthPersonal.expense > 0)) ||
      (commercialMode && monthActivity && (monthActivity.income + monthActivity.expense > 0)) ? (
        <div className="card">
          {(() => {
            const showPersonal = monthPersonal && monthPersonal.income + monthPersonal.expense > 0;
            const showActivity = monthActivity && commercialMode && monthActivity.income + monthActivity.expense > 0;
            const rawPersonalRate = monthPersonal && monthPersonal.income > 1 ? (monthPersonal.savings / monthPersonal.income) * 100 : null;
            const personalRate = rawPersonalRate !== null ? (rawPersonalRate < -100 ? -100 : rawPersonalRate) : null;
            const tIncome = (monthPersonal?.income || 0) + (monthActivity?.income || 0);
            const tExpense = (monthPersonal?.expense || 0) + (monthActivity?.expense || 0);
            const tSaved = (monthPersonal?.savings || 0) + (monthActivity?.savings || 0);
            const sRate = tIncome > 0 ? (tSaved / tIncome) * 100 : 0;
            const allCats = [...(monthPersonal?.topCategories ?? []), ...(monthActivity?.topCategories ?? [])];
            const bExpense = allCats.filter(c => c.type === "expense").sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];

            return (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <span className="bar-dot" style={{ background: 'var(--color-gold)' }} />
                  <h2 className="text-sm font-semibold text-ink">Synthèse du mois</h2>
                </div>

                {/* 4 KPI cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="card-inset text-center">
                    <p className="text-label">Revenus</p>
                    <p className="text-amount text-base mt-1">{formatCurrency(tIncome)}</p>
                  </div>
                  <div className="card-inset text-center">
                    <p className="text-label">Dépenses</p>
                    <p className="text-amount text-base mt-1">{formatCurrency(tExpense)}</p>
                  </div>
                  <div className="card-inset text-center">
                    <p className="text-label">Épargne</p>
                    <p className="text-amount text-base mt-1" style={{ color: tSaved >= 0 ? 'var(--color-pos)' : 'var(--color-neg)' }}>{formatCurrency(tSaved)}</p>
                  </div>
                  <div className="card-inset text-center">
                    <p className="text-label">Taux</p>
                    <p className="text-amount text-base mt-1">{sRate > 0 && sRate < 1 ? sRate.toFixed(1) : sRate.toFixed(0)}%</p>
                  </div>
                </div>

                {/* Tableau comparatif Perso / Activité / Total responsive */}
                {showPersonal && showActivity && (
                  <>
                    {/* Mobile: stacked rows */}
                    <div className="sm:hidden rounded-xl border border-[var(--color-border)] mb-4 divide-y divide-[var(--color-border)]">
                      {[
                        {
                          label: "Revenus", perso: monthPersonal?.income || 0, activity: monthActivity?.income || 0,
                          persoStyle: { color: 'var(--color-brand)' }, activityStyle: { color: 'var(--color-gold)' }, totalStyle: { color: 'var(--color-ink)' }, bg: ""
                        },
                        {
                          label: "Dépenses", perso: monthPersonal?.expense || 0, activity: monthActivity?.expense || 0,
                          persoStyle: { color: 'var(--color-neg)' }, activityStyle: { color: 'var(--color-neg)' }, totalStyle: { color: 'var(--color-ink)' }, bg: ""
                        },
                        {
                          label: "Résultat", perso: monthPersonal?.savings || 0, activity: monthActivity?.savings || 0,
                          persoStyle: { color: (monthPersonal?.savings || 0) >= 0 ? 'var(--color-brand)' : 'var(--color-neg)' }, activityStyle: { color: 'var(--color-gold)' }, totalStyle: { color: tSaved >= 0 ? 'var(--color-brand)' : 'var(--color-neg)' }, bg: "bg-[var(--color-gold-light)]"
                        },
                      ].map((r) => (
                        <div key={r.label} className={`px-4 py-3 ${r.bg}`}>
                          <p className="text-label mb-2">{r.label}</p>
                          <div className="flex items-center justify-between text-[13px]">
                            <span className="text-muted">Perso</span>
                            <span className="font-semibold" style={r.persoStyle}>{formatCurrency(r.perso)}</span>
                          </div>
                          <div className="flex items-center justify-between text-[13px] mt-1">
                            <span className="text-muted">Activité</span>
                            <span className="font-semibold" style={r.activityStyle}>{formatCurrency(r.activity)}</span>
                          </div>
                          <div className="flex items-center justify-between text-[13px] mt-1 pt-1.5 border-t border-[var(--color-border)]/50">
                            <span className="font-medium text-muted">Total</span>
                            <span className="font-bold" style={r.totalStyle}>{formatCurrency(r.label === "Résultat" ? tSaved : r.label === "Revenus" ? tIncome : tExpense)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Desktop: table */}
                    <div className="hidden sm:block rounded-xl border border-[var(--color-border)] mb-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ background: 'var(--color-surface-raised)' }}>
                            <th className="text-left px-4 py-2.5 font-semibold text-muted whitespace-nowrap"></th>
                            <th className="text-right px-4 py-2.5 font-semibold whitespace-nowrap" style={{ color: 'var(--color-brand)' }}>Perso</th>
                            <th className="text-right px-4 py-2.5 font-semibold whitespace-nowrap" style={{ color: 'var(--color-gold)' }}>Activité</th>
                            <th className="text-right px-4 py-2.5 font-semibold text-ink whitespace-nowrap">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                          <tr>
                            <td className="px-4 py-2 text-muted whitespace-nowrap">Revenus</td>
                            <td className="text-right px-4 py-2 font-medium whitespace-nowrap" style={{ color: 'var(--color-brand)' }}>{formatCurrency(monthPersonal?.income || 0)}</td>
                            <td className="text-right px-4 py-2 font-medium whitespace-nowrap" style={{ color: 'var(--color-gold)' }}>{formatCurrency(monthActivity?.income || 0)}</td>
                            <td className="text-right px-4 py-2 font-bold text-ink whitespace-nowrap">{formatCurrency(tIncome)}</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-muted whitespace-nowrap">Dépenses</td>
                            <td className="text-right px-4 py-2 font-medium whitespace-nowrap" style={{ color: 'var(--color-neg)' }}>{formatCurrency(monthPersonal?.expense || 0)}</td>
                            <td className="text-right px-4 py-2 font-medium whitespace-nowrap" style={{ color: 'var(--color-neg)' }}>{formatCurrency(monthActivity?.expense || 0)}</td>
                            <td className="text-right px-4 py-2 font-bold text-ink whitespace-nowrap">{formatCurrency(tExpense)}</td>
                          </tr>
                          <tr style={{ background: 'var(--color-gold-light)' }}>
                            <td className="text-left px-4 py-2 font-medium text-ink whitespace-nowrap">Résultat</td>
                            <td className="text-right px-4 py-2 font-bold whitespace-nowrap" style={{ color: (monthPersonal?.savings || 0) >= 0 ? 'var(--color-brand)' : 'var(--color-neg)' }}>{formatCurrency(monthPersonal?.savings || 0)}</td>
                            <td className="text-right px-4 py-2 font-bold whitespace-nowrap" style={{ color: 'var(--color-gold)' }}>{formatCurrency(monthActivity?.savings || 0)}</td>
                            <td className="text-right px-4 py-2 font-bold whitespace-nowrap" style={{ color: tSaved >= 0 ? 'var(--color-brand)' : 'var(--color-neg)' }}>{formatCurrency(tSaved)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* Blocs descriptifs Premium */}
                {(limits?.isPremium || user?.role !== "user") && (showPersonal || showActivity) && (
                  <>
                    {showPersonal && (
                      <div className="card-inset mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-subtle)' }}>
                            <FontAwesomeIcon icon={faUser} className="w-3.5 h-3.5" style={{ color: 'var(--color-brand)' }} />
                          </div>
                          <span className="text-label" style={{ color: 'var(--color-brand)' }}>Personnel</span>
                        </div>
                        <p className="text-sm text-muted leading-relaxed">
                          Sur le plan personnel, vous avez reçu <strong className="text-ink">{formatCurrency(monthPersonal!.income)}</strong> en revenus et dépensé <strong className="text-ink">{formatCurrency(monthPersonal!.expense)}</strong> ce mois-ci.
                          Capital initial : <strong className="text-ink">{formatCurrency(monthPersonal!.initialBalance)}</strong>, solde actuel : <strong className="text-ink">{formatCurrency(monthPersonal!.balance)}</strong>.
                           Taux d&apos;épargne : <strong className="text-ink">{personalRate === null ? "—" : personalRate === -100 ? "-100 % (déficit important)" : personalRate.toFixed(0) + " %"}</strong>.
                        </p>
                        {monthPersonal!.topCategories && monthPersonal!.topCategories.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span className="text-xs text-muted">Top catégories :</span>
                            {monthPersonal!.topCategories.slice(0, 3).map((c: any) => (
                              <span key={c.name} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-ink font-medium" style={{ background: 'var(--color-surface-raised)' }}>
                                {c.name} <span className="text-muted font-normal">{formatCurrency(Math.abs(c.amount))}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {showActivity && (
                      <div className="card-inset mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-gold-light)' }}>
                            <FontAwesomeIcon icon={faBriefcase} className="w-3.5 h-3.5" style={{ color: 'var(--color-gold)' }} />
                          </div>
                          <span className="text-label" style={{ color: 'var(--color-gold)' }}>Activité</span>
                        </div>
                        <p className="text-sm text-muted leading-relaxed">
                          Côté activité, vous avez réalisé <strong className="text-ink">{formatCurrency(monthActivity!.income)}</strong> de chiffre d&apos;affaires pour <strong className="text-ink">{formatCurrency(monthActivity!.expense)}</strong> de charges.
                           Bénéfice : <strong className="text-ink" style={{ color: monthActivity!.savings >= 0 ? 'var(--color-pos)' : 'var(--color-neg)' }}>{formatCurrency(monthActivity!.savings)}</strong>
                           {(() => {
                             const aIncome = monthActivity!.income;
                             const aSavings = monthActivity!.savings;
                             const aRaw = aIncome > 1 ? (aSavings / aIncome) * 100 : null;
                             const aRate = aRaw !== null ? (aRaw < -100 ? -100 : aRaw) : null;
                             return aRate !== null ? <> (marge de <strong className="text-ink">{aRate.toFixed(0)} %</strong>)</> : null;
                           })()}.
                        </p>
                        {monthActivity!.topCategories && monthActivity!.topCategories.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span className="text-xs text-muted">Top catégories :</span>
                            {monthActivity!.topCategories.slice(0, 3).map((c: any) => (
                              <span key={c.name} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-ink font-medium" style={{ background: 'var(--color-surface-raised)' }}>
                                {c.name} <span className="text-muted font-normal">{formatCurrency(Math.abs(c.amount))}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Bilan mensuel */}
                <div className="card-inset">
                  <p className="text-sm text-body leading-relaxed">
                    <span className="font-semibold">Bilan mensuel : </span>
                    <span className="font-medium" style={{ color: 'var(--color-pos)' }}>+{formatCurrency(tIncome)}</span>
                    <span className="text-muted"> reçus · </span>
                    <span className="font-medium" style={{ color: 'var(--color-neg)' }}>-{formatCurrency(tExpense)}</span>
                    <span className="text-muted"> dépensés · </span>
                    <span className="font-medium" style={{ color: 'var(--color-brand)' }}>={formatCurrency(tSaved)}</span>
                    <span className="text-muted"> épargnés · </span>
                    <span className="font-semibold">{sRate.toFixed(0)}%</span>
                    {bExpense && (
                      <span className="text-muted"> · Grosse dépense : <strong className="text-ink">{bExpense.name}</strong> ({formatCurrency(Math.abs(bExpense.amount))})</span>
                    )}
                    {sRate < 5 && showPersonal && (
                      <span style={{ color: 'var(--color-gold)' }}> · Taux faible ({sRate.toFixed(0)}%), surveillez vos dépenses</span>
                    )}
                    {sRate >= 20 && (
                      <span className="font-medium" style={{ color: 'var(--color-pos)' }}> · Excellent taux ({sRate.toFixed(0)}%)</span>
                    )}
                  </p>
                </div>
              </>
            );
          })()}
        </div>
      ) : null}

      {/* Modal Nouvelle transaction — form content */}
      {(() => {
        const atLimit = limits && !limits.isPremium && user?.role === "user" && (
          (newTx.type === "income" && limits.incomeCount >= limits.maxFreeIncome) ||
          (newTx.type === "expense" && limits.expenseCount >= limits.maxFreeExpense)
        );
        const formFields = (
          <>
            {commercialMode && (
              <div className="flex gap-2">
                <button type="button" onClick={() => setNewTx({ ...newTx, scope: "personal" })} className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${newTx.scope === "personal" ? "bg-[var(--color-brand)] text-white shadow-sm" : "bg-[var(--color-border)] text-muted hover:bg-[var(--color-surface-raised)]"}`}>Personnel</button>
                <button type="button" onClick={() => setNewTx({ ...newTx, scope: "activity" })} className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${newTx.scope === "activity" ? "bg-[var(--color-gold)] text-white shadow-sm" : "bg-[var(--color-border)] text-muted hover:bg-[var(--color-surface-raised)]"}`}>Activité</button>
              </div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setNewTx({ ...newTx, type: "expense", categoryId: "" })} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${newTx.type === "expense" ? "bg-[var(--color-neg)] text-white shadow-sm" : "bg-[var(--color-border)] text-muted hover:bg-[var(--color-surface-raised)]"}`}>Dépense</button>
              <button type="button" onClick={() => setNewTx({ ...newTx, type: "income", categoryId: "" })} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${newTx.type === "income" ? "bg-[var(--color-pos)] text-white shadow-sm" : "bg-[var(--color-border)] text-muted hover:bg-[var(--color-surface-raised)]"}`}>Revenu</button>
            </div>
            <div>
              <label className="field-label">Montant</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm font-semibold pointer-events-none">{activeCurrency === "XOF" ? "FCFA" : "EUR"}</span>
                <input type="number" value={newTx.amount} onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })} className="input-field pl-16" placeholder="ex: 5000" required min="1" />
              </div>
            </div>
            <div>
              <label className="field-label">Description</label>
              <input type="text" value={newTx.description} onChange={(e) => setNewTx({ ...newTx, description: e.target.value })} className="input-field" placeholder="ex: Achat alimentation" required />
            </div>
            <div>
              <label className="field-label">Catégorie</label>
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
            <div>
              <label className="field-label">Date</label>
              <input type="date" value={newTx.date} onChange={(e) => setNewTx({ ...newTx, date: e.target.value })} className="input-field" required />
            </div>
            {newTx.type === "expense" && (
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setNewTx({ ...newTx, recurring: !newTx.recurring })} className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold transition-all ${newTx.recurring ? "bg-[var(--color-brand)] text-white" : "bg-[var(--color-border)] text-transparent"}`}>
                  {newTx.recurring ? "✓" : ""}
                </button>
                <label className="text-sm text-muted cursor-pointer select-none" onClick={() => setNewTx({ ...newTx, recurring: !newTx.recurring })}>
                  Dépense récurrente (loyer, abonnement…)
                </label>
              </div>
            )}
            {limits && !limits.isPremium && user?.role === "user" && (
              <div className="card-inset" style={{ background: 'var(--color-warn-bg)' }}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium" style={{ color: 'var(--color-warn)' }}>{newTx.type === "income" ? "Revenus" : "Dépenses"} ce mois</span>
                  <span className="font-semibold" style={{ color: 'var(--color-warn)' }}>{newTx.type === "income" ? limits.incomeCount : limits.expenseCount}/{newTx.type === "income" ? limits.maxFreeIncome : limits.maxFreeExpense}</span>
                </div>
                {(newTx.type === "income" && limits.incomeCount >= limits.maxFreeIncome) || (newTx.type === "expense" && limits.expenseCount >= limits.maxFreeExpense) ? (
                  <p className="text-xs" style={{ color: 'var(--color-neg)' }}>Limite mensuelle atteinte. Passez à Premium.</p>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--color-warn)' }}>{Math.max(0, (newTx.type === "income" ? limits.maxFreeIncome : limits.maxFreeExpense) - (newTx.type === "income" ? limits.incomeCount : limits.expenseCount))} transaction(s) restante(s)</p>
                )}
              </div>
            )}
          </>
        );
        const submitFooter = (
          <>
            {txError && <div className="alert-inline neg mb-3"><FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 shrink-0 mt-0.5" /><p>{txError}</p></div>}
            <button type="submit" disabled={!!atLimit} className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed">Ajouter</button>
          </>
        );
        return (
          <>
            {/* Mobile — full page */}
            {showModal && (
              <div className="fixed inset-0 z-50 md:hidden bg-[var(--color-bg)] animate-slide-up flex flex-col">
                <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3.5 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                  <button onClick={() => setShowModal(false)} className="w-9 h-9 flex items-center justify-center text-muted hover:text-ink rounded-lg hover:bg-[var(--color-surface-raised)] transition-colors">
                    <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 rotate-180" />
                  </button>
                  <h3 className="text-base font-semibold text-ink">Nouvelle transaction</h3>
                </div>
                <form onSubmit={handleAddTransaction} className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">{formFields}</div>
                  <div className="shrink-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] p-5">{submitFooter}</div>
                </form>
              </div>
            )}
            {/* Desktop modal */}
            {showModal && (
              <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4 bg-black/40 animate-fade-in">
                <div className="bg-[var(--color-surface)] rounded-2xl p-6 w-full max-w-md shadow-xl animate-scale-in max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-semibold text-ink">Nouvelle transaction</h3>
                    <button onClick={() => setShowModal(false)} className="text-muted hover:text-ink">
                      <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
                    </button>
                  </div>
                  <form onSubmit={handleAddTransaction} className="space-y-4">
                    {formFields}
                    {submitFooter}
                  </form>
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* FAB mobile */}
      <button onClick={() => setShowModal(true)} aria-label="Nouvelle transaction" className="fixed bottom-20 right-4 z-40 lg:hidden w-14 h-14 bg-[var(--color-brand)] text-white rounded-full shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity animate-fade-in">
        <FontAwesomeIcon icon={faPlus} className="w-6 h-6" />
      </button>

      {showOnboarding && (
        <OnboardingModal onClose={completeOnboarding} currency={user?.baseCurrency} countryCode={user?.countryCode} />
      )}
    </div>
  );
}
