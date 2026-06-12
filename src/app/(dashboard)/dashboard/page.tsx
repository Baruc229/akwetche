"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "../layout";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  AlertCircle,
  Briefcase,
  User,
  ArrowRight,
  Clock,
  ShoppingBag,
  PiggyBank,
  AlertTriangle,
  Crown,
  BarChart3,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

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
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
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
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-stone-900">
              Bonjour, {user?.name?.split(" ")[0] || "utilisateur"}
            </h1>
            {limits?.isPremium && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full">
                <Crown className="w-3 h-3" />
                Premium
              </span>
            )}
          </div>
          <p className="text-stone-500 text-sm mt-0.5">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Nouvelle transaction
        </button>
      </div>

      {/* Bannière configuration catégories */}
      {categories.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 animate-fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">
                Configurez vos catégories
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Avant d'ajouter des transactions, créez des catégories de dépenses et revenus dans les paramètres.
              </p>
              <a
                href="/dashboard/settings"
                className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 px-4 py-2 rounded-xl transition-colors"
              >
                Aller aux paramètres
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Argent disponible aujourd'hui */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg animate-fade-in">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-5 h-5 text-emerald-100" />
          <p className="text-sm text-emerald-100 font-medium">Argent disponible</p>
        </div>
        <p className="text-3xl font-bold mt-1">{formatCurrency(totalBalance)}</p>
        <div className="mt-3 flex items-center gap-4 text-sm text-emerald-100">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            +{formatCurrency(totalIncome)} reçus
          </span>
          <span className="flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" />
            -{formatCurrency(totalExpense)} dépensés
          </span>
        </div>

      </div>

      {/* Jauge limites Free */}
      {limits && !limits.isPremium && user?.role === "user" && (
        <div className="card p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Limites du plan gratuit</p>
            <button
              onClick={handleSubscribe}
              disabled={subLoading}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-50"
            >
              {subLoading ? "Redirection..." : "Passer à Premium"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                <span>Revenus</span>
                <span>{limits.incomeCount}/{limits.maxFreeIncome}</span>
              </div>
              <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    limits.incomeCount >= limits.maxFreeIncome
                      ? "bg-red-500"
                      : limits.incomeCount >= limits.maxFreeIncome - 1
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, (limits.incomeCount / limits.maxFreeIncome) * 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                <span>Dépenses</span>
                <span>{limits.expenseCount}/{limits.maxFreeExpense}</span>
              </div>
              <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    limits.expenseCount >= limits.maxFreeExpense
                      ? "bg-red-500"
                      : limits.expenseCount >= limits.maxFreeExpense - 1
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, (limits.expenseCount / limits.maxFreeExpense) * 100)}%` }}
                />
              </div>
            </div>
          </div>
          {(limits.incomeCount >= limits.maxFreeIncome || limits.expenseCount >= limits.maxFreeExpense) && (
            <div className="flex items-start gap-2 mt-3 p-3 bg-red-50 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
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
          <h2 className="text-sm font-semibold text-stone-700 mb-1">Où est passé mon argent ?</h2>
          <p className="text-xs text-stone-400 mb-4">Cette semaine</p>
          {weekExpenses.length === 0 && (!commercialMode || weekActivityExpenses.length === 0) ? (
            <p className="text-sm text-stone-400 text-center py-6">Aucune dépense cette semaine</p>
          ) : (
            <div className="space-y-4">
              {weekExpenses.length > 0 && (
                <div>
                  {commercialMode && <p className="text-xs font-semibold text-emerald-600 mb-2 uppercase tracking-wider">Personnel</p>}
                  <div className="space-y-3">
                    {weekExpenses.slice(0, 5).map((cat) => {
                      const absAmount = Math.abs(cat.amount);
                      const pct = totalWeekExpense > 0 ? (absAmount / totalWeekExpense) * 100 : 0;
                      return (
                        <div key={cat.name}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-stone-700">{cat.name}</span>
                            <span className="text-stone-500 font-medium">{pct.toFixed(0)}% ({formatCurrency(absAmount)})</span>
                          </div>
                          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {commercialMode && weekActivityExpenses.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-600 mb-2 uppercase tracking-wider">Activité</p>
                  <div className="space-y-3">
                    {weekActivityExpenses.slice(0, 5).map((cat) => {
                      const absAmount = Math.abs(cat.amount);
                      const pct = totalWeekActivityExpense > 0 ? (absAmount / totalWeekActivityExpense) * 100 : 0;
                      return (
                        <div key={cat.name}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-stone-700">{cat.name}</span>
                            <span className="text-stone-500 font-medium">{pct.toFixed(0)}% ({formatCurrency(absAmount)})</span>
                          </div>
                          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }} />
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
          <h2 className="text-sm font-semibold text-stone-700 mb-1">Projection</h2>
          <p className="text-xs text-stone-400 mb-4">Si vous continuez à ce rythme</p>
          <div className="bg-stone-50 rounded-xl p-4 text-center">
            <p className="text-sm text-stone-500">Il vous restera environ</p>
            <p className={`text-2xl font-bold mt-1 ${projectedRemaining >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {formatCurrency(Math.max(0, projectedRemaining))}
            </p>
            <p className="text-xs text-stone-400 mt-1">à la fin du mois ({daysLeft} jours restants)</p>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-stone-500">Dépense moyenne / jour</span>
            <span className="font-medium text-stone-700">{formatCurrency(dailyAvgExpense)}</span>
          </div>
          {projectedRemaining < 0 && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-600">Attention : vous dépensez plus que vous ne possédez.</p>
            </div>
          )}
        </div>
      </div>

      {/* Ce mois-ci — version humaine */}
      {(personalSummary || activitySummary) && (
        <div className="card p-5 animate-fade-in">
          <h2 className="text-sm font-semibold text-stone-700 mb-1">Ce mois-ci</h2>
          <p className="text-xs text-stone-400 mb-4">Résumé de votre mois en un coup d&apos;œil</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-teal-50 rounded-xl p-4">
              <p className="text-xs text-teal-600 font-medium">Vous avez reçu</p>
              <p className="text-lg font-bold text-teal-700 mt-1">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-xs text-amber-600 font-medium">Vous avez dépensé</p>
              <p className="text-lg font-bold text-amber-700 mt-1">{formatCurrency(totalExpense)}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4">
              <p className="text-xs text-emerald-600 font-medium">Il vous reste</p>
              <p className="text-lg font-bold text-emerald-700 mt-1">{formatCurrency(Math.max(0, totalBalance))}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {biggestExpense && (
              <div className="bg-white border border-stone-200 rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-stone-500">Votre plus grosse dépense</p>
                  <p className="text-sm font-semibold text-stone-800">{biggestExpense.name} ({formatCurrency(Math.abs(biggestExpense.amount))})</p>
                </div>
              </div>
            )}
            <div className="bg-white border border-stone-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <PiggyBank className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-stone-500">Taux d&apos;épargne</p>
                <p className="text-sm font-semibold text-stone-800">{savingsRate.toFixed(0)}% ({formatCurrency(totalSavings)} mis de côté)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section Activité — résumé quotidien */}
      {commercialMode && activitySummary && (activitySummary.income + activitySummary.expense > 0) && (
        <div className="card p-5 animate-fade-in border-l-4 border-l-amber-400">
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-stone-700">Mon activité aujourd&apos;hui</h2>
          </div>
          <p className="text-xs text-stone-400 mb-3">Votre activité commerciale</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-xs text-amber-600 font-medium">Ce mois-ci</p>
              <p className="text-base font-bold text-amber-700 mt-1">{formatCurrency(activitySummary.income)}</p>
              <p className="text-xs text-stone-400">chiffre d&apos;affaires</p>
            </div>
            <div className="bg-teal-50 rounded-xl p-4">
              <p className="text-xs text-teal-600 font-medium">Bénéfice</p>
              <p className="text-base font-bold text-teal-700 mt-1">{formatCurrency(Math.max(0, activitySummary.savings))}</p>
              <p className="text-xs text-stone-400">après dépenses</p>
            </div>
            <div className="bg-stone-50 rounded-xl p-4">
              <p className="text-xs text-stone-600 font-medium">Marge</p>
              <p className="text-base font-bold text-stone-700 mt-1">
                {activitySummary.income > 0 ? ((Math.max(0, activitySummary.savings) / activitySummary.income) * 100).toFixed(0) : 0}%
              </p>
              <p className="text-xs text-stone-400">de bénéfice</p>
            </div>
          </div>
        </div>
      )}

      {/* Transactions récentes + Liens rapides */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-stone-700">
              Dernières opérations
            </h2>
            <a
              href="/dashboard/transactions"
              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Voir tout
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-stone-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune opération pour le moment</p>
              <button
                onClick={() => setShowModal(true)}
                className="text-emerald-600 text-sm font-medium mt-2 hover:text-emerald-700"
              >
                Ajouter une transaction
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((tx, i) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-stone-50 transition-colors animate-slide-in"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        tx.type === "income"
                          ? "bg-teal-100"
                          : "bg-amber-100"
                      }`}
                    >
                      {tx.type === "income" ? (
                        <TrendingUp className="w-4 h-4 text-teal-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-800">
                        {tx.description}
                      </p>
                      <p className="text-xs text-stone-400">
                        {tx.category?.name} · {formatDate(tx.date)}
                        {tx.scope === "activity" && (
                          <span className="ml-1.5 text-amber-500 font-medium">· activité</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      tx.type === "income"
                        ? "text-teal-600"
                        : "text-amber-600"
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
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 animate-fade-in">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Configurez vos catégories
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Avant d&apos;ajouter des transactions, créez des catégories de
                  dépenses et revenus dans les paramètres.
                </p>
                <a
                  href="/dashboard/settings"
                  className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-800 mt-2"
                >
                  Aller aux paramètres
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}

        {categories.length > 0 && (
          <div className="card p-5 animate-fade-in">
            <h2 className="text-sm font-semibold text-stone-700 mb-3">Liens rapides</h2>
            <div className="space-y-2">
              <a
                href="/dashboard/transactions"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-stone-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-800">Voir tout l&apos;historique</p>
                  <p className="text-xs text-stone-400">Consultez et filtrez toutes vos opérations</p>
                </div>
              </a>
              {commercialMode && (
                <>
                  <a
                    href="/dashboard/products"
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-800">Gérer mes produits</p>
                      <p className="text-xs text-stone-400">Ajoutez ou modifiez votre catalogue</p>
                    </div>
                  </a>
                  <a
                    href="/dashboard/sales"
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-800">Enregistrer une vente</p>
                      <p className="text-xs text-stone-400">Suivez votre chiffre d&apos;affaires</p>
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
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-5 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <PiggyBank className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-semibold text-stone-700">En résumé</h2>
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
                <div className="overflow-hidden rounded-xl border border-emerald-200 bg-white mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-emerald-100">
                        <th className="text-left px-4 py-2.5 font-semibold text-emerald-800"></th>
                        <th className="text-right px-4 py-2.5 font-semibold text-emerald-800">Perso</th>
                        {showActivity && <th className="text-right px-4 py-2.5 font-semibold text-amber-800">Activité</th>}
                        <th className="text-right px-4 py-2.5 font-semibold text-stone-800">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      <tr>
                        <td className="px-4 py-2.5 text-stone-600">Revenus</td>
                        <td className="text-right px-4 py-2.5 font-medium text-teal-600">{formatCurrency(monthPersonal?.income || 0)}</td>
                        {showActivity && <td className="text-right px-4 py-2.5 font-medium text-amber-600">{formatCurrency(monthActivity?.income || 0)}</td>}
                        <td className="text-right px-4 py-2.5 font-semibold text-stone-800">{formatCurrency(totalIncome)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-stone-600">Dépenses</td>
                        <td className="text-right px-4 py-2.5 font-medium text-amber-600">{formatCurrency(monthPersonal?.expense || 0)}</td>
                        {showActivity && <td className="text-right px-4 py-2.5 font-medium text-red-500">{formatCurrency(monthActivity?.expense || 0)}</td>}
                        <td className="text-right px-4 py-2.5 font-semibold text-stone-800">{formatCurrency(totalExpense)}</td>
                      </tr>
                      <tr className="bg-emerald-50">
                        <td className="px-4 py-2.5 text-stone-700 font-medium">Résultat</td>
                        <td className="text-right px-4 py-2.5 font-bold text-emerald-700">{formatCurrency(Math.max(0, monthPersonal?.savings || 0))}</td>
                        {showActivity && <td className="text-right px-4 py-2.5 font-bold text-amber-700">{formatCurrency(Math.max(0, monthActivity?.savings || 0))}</td>}
                        <td className="text-right px-4 py-2.5 font-bold text-emerald-700">{formatCurrency(totalSaved)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-stone-600">Taux d'épargne</td>
                        <td className="text-right px-4 py-2.5 font-medium text-stone-700">
                          {monthPersonal?.income ? `${personalRate.toFixed(0)}%` : "-"}
                        </td>
                        {showActivity && <td className="text-right px-4 py-2.5 font-medium text-stone-700">
                          {monthActivity?.income ? `${activityRate.toFixed(0)}%` : "-"}
                        </td>}
                        <td className="text-right px-4 py-2.5 font-semibold text-stone-800">{savingsRate.toFixed(0)}%</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-stone-600">Disponible</td>
                        <td className="text-right px-4 py-2.5 font-medium text-stone-700">{formatCurrency(monthPersonal?.balance || 0)}</td>
                        {showActivity && <td className="text-right px-4 py-2.5 font-medium text-stone-700">{formatCurrency(monthActivity?.balance || 0)}</td>}
                        <td className="text-right px-4 py-2.5 font-bold text-emerald-700">{formatCurrency(totalBalance)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Phrase explicative détaillée */}
                <div className="text-sm text-stone-700 leading-relaxed space-y-3">
                  {showPersonal && showActivity ? (
                    <>
                      <div className="bg-white rounded-xl p-4 border border-stone-100 space-y-2">
                        <h4 className="font-semibold text-stone-800 text-xs uppercase tracking-wider">💰 Personnel</h4>
                        <p className="text-stone-600">
                          Sur le plan personnel, vous avez reçu <strong className="text-teal-600">{formatCurrency(monthPersonal!.income)}</strong> et dépensé <strong className="text-amber-600">{formatCurrency(monthPersonal!.expense)}</strong> ce mois-ci.
                          Votre capital de départ était de <strong className="text-stone-800">{formatCurrency(monthPersonal!.initialBalance)}</strong>, ce qui porte votre solde personnel à <strong className="text-emerald-600">{formatCurrency(monthPersonal!.balance)}</strong>.
                          Votre taux d&apos;épargne personnel est de <strong className="text-stone-800">{personalRate.toFixed(0)}%</strong>
                          {personalRate < 5 ? <span className="text-amber-600"> — attention, vous dépensez presque tous vos revenus personnels</span> : personalRate >= 20 ? <span className="text-emerald-600"> — bravo, vous épargnez plus de 20% !</span> : <span> — un bon équilibre</span>}.
                        </p>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-stone-100 space-y-2">
                        <h4 className="font-semibold text-stone-800 text-xs uppercase tracking-wider">🏪 Activité</h4>
                        <p className="text-stone-600">
                          Côté activité, vous avez généré <strong className="text-teal-600">{formatCurrency(monthActivity!.income)}</strong> de chiffre d&apos;affaires pour <strong className="text-amber-600">{formatCurrency(monthActivity!.expense)}</strong> de dépenses liées à votre commerce.
                          Votre bénéfice d&apos;activité est de <strong className="text-emerald-600">{formatCurrency(Math.max(0, monthActivity!.savings))}</strong>
                          {monthActivity!.income > 0 ? <span>, soit une marge de <strong className="text-amber-600">{activityRate.toFixed(0)}%</strong></span> : null}.
                          Capital d&apos;activité de départ : <strong className="text-stone-800">{formatCurrency(monthActivity!.initialBalance)}</strong>, solde activité actuel : <strong className="text-emerald-600">{formatCurrency(monthActivity!.balance)}</strong>.
                        </p>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 space-y-1">
                        <h4 className="font-semibold text-emerald-800 text-xs uppercase tracking-wider">📊 Synthèse globale</h4>
                        <p className="text-stone-700">
                          Au total (personnel + activité), vous avez gagné <strong>{formatCurrency(totalIncome)}</strong>, dépensé <strong>{formatCurrency(totalExpense)}</strong>, et mis de côté <strong>{formatCurrency(totalSaved)}</strong> soit un taux d&apos;épargne global de <strong>{savingsRate.toFixed(0)}%</strong>.
                          Vos deux budgets combinés vous laissent <strong className="text-emerald-700">{formatCurrency(totalBalance)}</strong> de disponible.
                        </p>
                      </div>
                    </>
                  ) : showPersonal ? (
                    <>
                      <div className="bg-white rounded-xl p-4 border border-stone-100 space-y-2">
                        <h4 className="font-semibold text-stone-800 text-xs uppercase tracking-wider">💰 Personnel</h4>
                        <p className="text-stone-600">
                          Ce mois-ci, vous avez reçu <strong className="text-teal-600">{formatCurrency(monthPersonal!.income)}</strong> et dépensé <strong className="text-amber-600">{formatCurrency(monthPersonal!.expense)}</strong>.
                          Vous partiez de <strong className="text-stone-800">{formatCurrency(monthPersonal!.initialBalance)}</strong>, il vous reste donc <strong className="text-emerald-600">{formatCurrency(monthPersonal!.balance)}</strong>.
                          Vous avez épargné <strong>{formatCurrency(Math.max(0, monthPersonal!.savings))}</strong> soit <strong>{personalRate.toFixed(0)}%</strong> de vos revenus
                          {personalRate < 5 ? <span className="text-amber-600"> — faites attention, vous dépensez la quasi-totalité de ce que vous gagnez</span> : personalRate >= 20 ? <span className="text-emerald-600"> — bravo, une excellente maîtrise de vos finances !</span> : <span> — un rythme soutenable</span>}.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-white rounded-xl p-4 border border-stone-100 space-y-2">
                        <h4 className="font-semibold text-stone-800 text-xs uppercase tracking-wider">🏪 Activité</h4>
                        <p className="text-stone-600">
                          Votre activité a généré <strong className="text-teal-600">{formatCurrency(monthActivity!.income)}</strong> de ventes pour <strong className="text-amber-600">{formatCurrency(monthActivity!.expense)}</strong> de dépenses professionnelles.
                          Le bénéfice net de votre activité est de <strong className="text-emerald-600">{formatCurrency(Math.max(0, monthActivity!.savings))}</strong>
                          {monthActivity!.income > 0 ? <span>, soit une marge bénéficiaire de <strong className="text-amber-600">{activityRate.toFixed(0)}%</strong></span> : null}.
                          Capital de départ : <strong className="text-stone-800">{formatCurrency(monthActivity!.initialBalance)}</strong>, solde actuel : <strong className="text-emerald-600">{formatCurrency(monthActivity!.balance)}</strong>.
                        </p>
                      </div>
                    </>
                  )}
                  {biggestExpense && (
                    <div className="flex items-start gap-2 p-3 bg-stone-50 rounded-xl">
                      <TrendingDown className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-stone-600">
                        Votre plus grosse dépense toutes catégories confondues : <strong className="text-stone-800">{biggestExpense.name} ({formatCurrency(Math.abs(biggestExpense.amount))})</strong>
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
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-stone-900">
                Nouvelle transaction
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                ✕
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
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    Personnel
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTx({ ...newTx, scope: "activity" })}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                      newTx.scope === "activity"
                        ? "bg-amber-500 text-white shadow-sm"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
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
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  Dépense
                </button>
                <button
                  type="button"
                  onClick={() => setNewTx({ ...newTx, type: "income" })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    newTx.type === "income"
                      ? "bg-teal-500 text-white shadow-sm"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  Revenu
                </button>
              </div>

              <div>
                <label className="block text-sm text-stone-600 mb-1">Montant</label>
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
                <label className="block text-sm text-stone-600 mb-1">Description</label>
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
                <label className="block text-sm text-stone-600 mb-1">Catégorie</label>
                <select
                  value={newTx.categoryId}
                  onChange={(e) => setNewTx({ ...newTx, categoryId: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">Sélectionner...</option>
                  {categories
                    .filter((c) => c.type === newTx.type)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              {txError && (
                <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">
                  {txError}
                </p>
              )}

              <button type="submit" className="btn-primary w-full py-3">
                Ajouter
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
