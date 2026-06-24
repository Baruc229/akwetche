"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "../layout";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faCircleExclamation, faCrown, faArrowRight, faXmark, faLock } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/lib/colors";
import CustomSelect from "@/components/ui/CustomSelect";
import OnboardingModal from "@/components/OnboardingModal";
import HeroCard from "@/components/dashboard/HeroCard";
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
      <div className="space-y-3 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-44 bg-[#E0D8CC] rounded-lg" />
            <div className="h-4 w-32 bg-[#E0D8CC]/60 rounded-lg" />
          </div>
        </div>
        <div className="bg-[#1C3A2F]/20 rounded-[20px] p-6 space-y-3">
          <div className="h-4 w-32 bg-white/20 rounded-lg" />
          <div className="h-10 w-48 bg-white/20 rounded-lg" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-12 bg-white/10 rounded-xl" />
            <div className="h-12 bg-white/10 rounded-xl" />
          </div>
        </div>
        <div className="bg-white rounded-[18px] p-5 space-y-3">
          <div className="h-4 w-40 bg-[#F2EDE4] rounded-lg" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-[#F2EDE4] rounded-lg" />
            <div className="h-4 w-3/4 bg-[#F2EDE4] rounded-lg" />
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
  const totalSavings = Math.max(0, (personalSummary?.savings || 0) + (activitySummary?.savings || 0));

  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const dayOfMonth = new Date().getDate();
  const daysLeft = daysInMonth - dayOfMonth;
  const dailyAvgExpense = dayOfMonth > 0 ? (totalExpense / dayOfMonth) : 0;
  const projectedRemaining = totalBalance - (dailyAvgExpense * daysLeft);

  const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

  return (
    <div className="space-y-3 pb-24 sm:pb-0">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-[family-name:var(--font-dm-sans)] font-bold text-[#1A1A1A]">
              Bonjour, {user?.name?.split(" ")[0] || "utilisateur"}
            </h1>
            {limits?.isPremium && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[#F7F0D6] text-[#C9A84C] px-2 py-0.5 rounded-full font-[family-name:var(--font-inter)]">
                <FontAwesomeIcon icon={faCrown} className="w-3 h-3" />
                Premium
              </span>
            )}
          </div>
          <p className="text-sm text-[#9BA89D] mt-0.5 font-[family-name:var(--font-inter)]">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="hidden sm:inline-flex items-center gap-2 bg-[#1C3A2F] text-white px-4 py-2.5 rounded-xl text-sm font-medium font-[family-name:var(--font-inter)] hover:bg-[#1C3A2F]/90 transition-colors self-start sm:self-auto"
        >
          <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
          Nouvelle transaction
        </button>
      </div>

      {/* Erreur chargement */}
      {loadError && (
        <div className="flex items-start gap-3 bg-[#FCECEA] border border-[#B94A3E]/20 rounded-[18px] p-4">
          <FontAwesomeIcon icon={faCircleExclamation} className="w-5 h-5 text-[#B94A3E] shrink-0 mt-0.5" />
          <p className="text-sm text-[#B94A3E] flex-1 font-[family-name:var(--font-inter)]">{loadError}</p>
          <button onClick={() => setLoadError(null)} className="text-[#B94A3E]/50 hover:text-[#B94A3E] shrink-0">
            <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bannière configuration catégories */}
      {categories.length === 0 && (
        <div className="bg-[#F7F0D6] border border-[#C9A84C]/20 rounded-[18px] p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/15 flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={faCircleExclamation} className="w-5 h-5 text-[#C9A84C]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#1A1A1A] font-[family-name:var(--font-inter)]">
                Configurez vos catégories
              </p>
              <p className="text-sm text-[#9BA89D] mt-1 font-[family-name:var(--font-inter)]">
                Avant d&apos;ajouter des transactions, créez des catégories de dépenses et revenus dans les paramètres.
              </p>
              <a
                href="/dashboard/settings"
                className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-[#C9A84C] hover:text-[#C9A84C]/80 transition-colors font-[family-name:var(--font-inter)]"
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
        <div className="bg-white rounded-[18px] border border-[#E0D8CC] p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F7F0D6] flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={faCrown} className="w-5 h-5 text-[#C9A84C]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#1A1A1A] font-[family-name:var(--font-inter)]">
                Plan gratuit — {limits.maxFreeIncome} revenus et {limits.maxFreeExpense} dépenses max
              </p>
              <p className="text-sm text-[#9BA89D] mt-1 font-[family-name:var(--font-inter)]">
                Passez à Premium pour profiter de catégories illimitées, du mode commercial, et exporter vos rapports.
              </p>
              <button
                onClick={handleSubscribe}
                className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-[#C9A84C] hover:text-[#C9A84C]/80 transition-colors font-[family-name:var(--font-inter)]"
              >
                Passer à Premium
                <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Card */}
      <HeroCard
        totalBalance={totalBalance}
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        savingsRate={savingsRate}
      />

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

      {/* Modal Nouvelle transaction */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-[18px] p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-[family-name:var(--font-dm-sans)] font-bold text-[#1A1A1A]">
                Nouvelle transaction
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#9BA89D] hover:text-[#1A1A1A]">
                <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              {commercialMode && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTx({ ...newTx, scope: "personal" })}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all font-[family-name:var(--font-inter)] ${
                      newTx.scope === "personal"
                        ? "bg-[#1C3A2F] text-white"
                        : "bg-[#E0D8CC] text-[#9BA89D] hover:bg-[#F2EDE4]"
                    }`}
                  >
                    Personnel
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTx({ ...newTx, scope: "activity" })}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all font-[family-name:var(--font-inter)] ${
                      newTx.scope === "activity"
                        ? "bg-[#C9A84C] text-white"
                        : "bg-[#E0D8CC] text-[#9BA89D] hover:bg-[#F2EDE4]"
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
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all font-[family-name:var(--font-inter)] ${
                    newTx.type === "expense"
                      ? "bg-[#B94A3E] text-white"
                      : "bg-[#E0D8CC] text-[#9BA89D] hover:bg-[#F2EDE4]"
                  }`}
                >
                  Dépense
                </button>
                <button
                  type="button"
                  onClick={() => setNewTx({ ...newTx, type: "income" })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all font-[family-name:var(--font-inter)] ${
                    newTx.type === "income"
                      ? "bg-[#3A8C68] text-white"
                      : "bg-[#E0D8CC] text-[#9BA89D] hover:bg-[#F2EDE4]"
                  }`}
                >
                  Revenu
                </button>
              </div>

              <div>
                <label className="block text-sm text-[#9BA89D] mb-1 font-[family-name:var(--font-inter)]">Montant</label>
                <input
                  type="number"
                  value={newTx.amount}
                  onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                  className="w-full px-4 py-3 border border-[#E0D8CC] rounded-xl bg-white outline-none text-sm focus:border-[#1C3A2F] transition-colors font-[family-name:var(--font-inter)]"
                  placeholder="Ex: 5000"
                  required
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm text-[#9BA89D] mb-1 font-[family-name:var(--font-inter)]">Description</label>
                <input
                  type="text"
                  value={newTx.description}
                  onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                  className="w-full px-4 py-3 border border-[#E0D8CC] rounded-xl bg-white outline-none text-sm focus:border-[#1C3A2F] transition-colors font-[family-name:var(--font-inter)]"
                  placeholder="Ex: Achat alimentation"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-[#9BA89D] mb-1 font-[family-name:var(--font-inter)]">Catégorie</label>
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
                <div className="p-3 bg-[#F7F0D6] rounded-xl">
                  <div className="flex items-center justify-between text-xs mb-1 font-[family-name:var(--font-inter)]">
                    <span className="font-medium text-[#C9A84C]">
                      {newTx.type === "income" ? "Revenus" : "Dépenses"} ce mois
                    </span>
                    <span className="font-semibold text-[#C9A84C]">
                      {newTx.type === "income" ? limits.incomeCount : limits.expenseCount}/{newTx.type === "income" ? limits.maxFreeIncome : limits.maxFreeExpense}
                    </span>
                  </div>
                  {(newTx.type === "income" && limits.incomeCount >= limits.maxFreeIncome) ||
                  (newTx.type === "expense" && limits.expenseCount >= limits.maxFreeExpense) ? (
                    <p className="text-xs text-[#B94A3E] font-[family-name:var(--font-inter)]">Limite mensuelle atteinte. Passez à Premium.</p>
                  ) : (
                    <p className="text-xs text-[#C9A84C] font-[family-name:var(--font-inter)]">
                      {Math.max(0, (newTx.type === "income" ? limits.maxFreeIncome : limits.maxFreeExpense) - (newTx.type === "income" ? limits.incomeCount : limits.expenseCount))} transaction(s) restante(s)
                    </p>
                  )}
                </div>
              )}

              {txError && (
                <p className="text-[#B94A3E] text-sm bg-[#FCECEA] p-3 rounded-xl font-[family-name:var(--font-inter)]">
                  {txError}
                </p>
              )}

              {(() => {
                const atLimit = limits && !limits.isPremium && user?.role === "user" && (
                  (newTx.type === "income" && limits.incomeCount >= limits.maxFreeIncome) ||
                  (newTx.type === "expense" && limits.expenseCount >= limits.maxFreeExpense)
                );
                return (
                  <button type="submit" disabled={!!atLimit} className="w-full py-3 bg-[#1C3A2F] text-white rounded-xl font-medium text-sm font-[family-name:var(--font-inter)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1C3A2F]/90 transition-colors">
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
        className="sm:hidden fixed bottom-24 right-5 z-50 bg-[#1C3A2F] text-white w-14 h-14 flex items-center justify-center shadow-[0_4px_20px_rgba(28,58,47,0.3)] active:scale-95 transition-transform"
        style={{ borderRadius: "16px" }}
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
