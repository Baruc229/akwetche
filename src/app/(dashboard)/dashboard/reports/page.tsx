"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, PiggyBank, ShoppingBag, Wallet, ArrowUpRight, Package, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

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
    setLoading(true);
    fetch(`/api/reports?type=${period}`)
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
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
      <span className={`inline-flex items-center gap-1 text-xs font-medium ${isGood ? "text-emerald-600" : "text-red-500"}`}>
        {isGood ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Bilans</h1>
        <p className="text-stone-500 text-sm mt-0.5">Ce qui s&apos;est passé, en clair</p>
      </div>

      <div className="flex items-center gap-2">
        {periods.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              period === p.value
                ? "bg-emerald-100 text-emerald-700"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {data && (
        <>
          {/* Résumé humain */}
          <div className="card p-6 bg-gradient-to-br from-emerald-50 to-teal-50 animate-fade-in">
            <h2 className="text-sm font-semibold text-stone-700 mb-4">{periodLabel}</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-white rounded-xl">
                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm text-stone-500">Vous avez reçu</p>
                  <p className="text-lg font-bold text-teal-700">{formatCurrency(data.current.income)}</p>
                  <EvolutionBadge value={data.evolution.income} positiveIsGood={true} />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white rounded-xl">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-stone-500">Vous avez dépensé</p>
                  <p className="text-lg font-bold text-amber-700">{formatCurrency(data.current.expense)}</p>
                  <EvolutionBadge value={data.evolution.expense} positiveIsGood={false} />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white rounded-xl">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <PiggyBank className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-stone-500">Il vous reste</p>
                  <p className="text-lg font-bold text-emerald-700">{formatCurrency(Math.max(0, data.current.savings))}</p>
                  <EvolutionBadge value={data.evolution.savings} positiveIsGood={true} />
                </div>
              </div>
            </div>
            {Object.keys(data.current.topCategories).length > 0 && (
              <div className="mt-3 p-3 bg-white rounded-xl">
                <p className="text-sm text-stone-500">
                  Votre plus grosse dépense : <span className="font-semibold text-stone-800">{getTopExpenseLabel(data.current.topCategories)}</span>
                </p>
              </div>
            )}
          </div>

          {/* Détail des dépenses */}
          {Object.keys(data.current.topCategories).length > 0 && (
            <div className="card p-5 animate-fade-in">
              <h2 className="text-sm font-semibold text-stone-700 mb-1">Où est passé votre argent ?</h2>
              <p className="text-xs text-stone-400 mb-4">Répartition par catégorie</p>
              <div className="space-y-3">
                {Object.entries(data.current.topCategories)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, amount]) => {
                    const total = data.current.expense || 1;
                    const pct = (amount / total) * 100;
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-stone-700">{cat}</span>
                          <span className="text-stone-500">{formatCurrency(amount)} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
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
              <Wallet className="w-5 h-5 text-emerald-600" />
              <h2 className="text-sm font-semibold text-stone-700">Situation financière</h2>
            </div>
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">Personnel</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="bg-stone-50 rounded-xl p-3">
                  <p className="text-stone-500">Capital de départ</p>
                  <p className="font-semibold text-stone-800">{formatCurrency(data.initialBalance)}</p>
                </div>
                <div className="bg-teal-50 rounded-xl p-3">
                  <p className="text-teal-600">Reçu</p>
                  <p className="font-semibold text-teal-700">+{formatCurrency(data.personal.current.income)}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-amber-600">Dépensé</p>
                  <p className="font-semibold text-amber-700">-{formatCurrency(data.personal.current.expense)}</p>
                </div>
                <div className={`rounded-xl p-3 ${data.personal.current.savings >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
                  <p className={data.personal.current.savings >= 0 ? "text-emerald-600" : "text-red-600"}>Solde</p>
                  <p className={`font-semibold ${data.personal.current.savings >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {formatCurrency(data.initialBalance + data.personal.current.income - data.personal.current.expense)}
                  </p>
                </div>
              </div>
            </div>
            {/* Activité */}
            {data.initialBalanceActivity > 0 || data.activity.current.income > 0 || data.activity.current.expense > 0 ? (
              <div>
                <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">Activité</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="bg-stone-50 rounded-xl p-3">
                    <p className="text-stone-500">Capital de départ</p>
                    <p className="font-semibold text-stone-800">{formatCurrency(data.initialBalanceActivity)}</p>
                  </div>
                  <div className="bg-teal-50 rounded-xl p-3">
                    <p className="text-teal-600">Reçu</p>
                    <p className="font-semibold text-teal-700">+{formatCurrency(data.activity.current.income)}</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3">
                    <p className="text-amber-600">Dépensé</p>
                    <p className="font-semibold text-amber-700">-{formatCurrency(data.activity.current.expense)}</p>
                  </div>
                  <div className={`rounded-xl p-3 ${data.activity.current.savings >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
                    <p className={data.activity.current.savings >= 0 ? "text-emerald-600" : "text-red-600"}>Solde</p>
                    <p className={`font-semibold ${data.activity.current.savings >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {formatCurrency(data.initialBalanceActivity + data.activity.current.income - data.activity.current.expense)}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Activité commerciale — version humaine */}
          {data.commercial.productCount > 0 && (
            <div className="card p-5 animate-fade-in border-l-4 border-l-amber-400">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4 text-amber-600" />
                </div>
                <h2 className="text-sm font-semibold text-stone-700">Votre activité</h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                  <span className="text-sm text-stone-600">Chiffre d&apos;affaires</span>
                  <span className="text-sm font-bold text-teal-600">{formatCurrency(data.commercial.revenue)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                  <span className="text-sm text-stone-600">Bénéfice</span>
                  <span className="text-sm font-bold text-emerald-600">{formatCurrency(data.commercial.profit)}</span>
                </div>
                {data.commercial.productCount > 0 && (
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                    <span className="text-sm text-stone-600">Stock</span>
                    <span className="text-sm font-bold text-stone-800">
                      {data.commercial.productCount} produit{data.commercial.productCount !== 1 ? "s" : ""}
                      {data.commercial.outOfStock > 0 && (
                        <span className="text-red-500 text-xs ml-1">({data.commercial.outOfStock} en rupture)</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
              {data.commercial.mostSold.length > 0 && (
                <div className="mt-4 pt-3 border-t border-stone-100">
                  <p className="text-xs text-stone-500 mb-2">Produits les plus vendus</p>
                  <div className="space-y-1.5">
                    {data.commercial.mostSold.slice(0, 3).map((p) => (
                      <div key={p.name} className="flex items-center justify-between text-sm">
                        <span className="text-stone-600">{p.name}</span>
                        <span className="font-medium text-stone-800">{p.quantity} vendu{p.quantity !== 1 ? "s" : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data.commercial.mostProfitable.length > 0 && (
                <div className="mt-3 pt-3 border-t border-stone-100">
                  <p className="text-xs text-stone-500 mb-2">Produits les plus rentables</p>
                  <div className="space-y-1.5">
                    {data.commercial.mostProfitable.slice(0, 3).map((p) => (
                      <div key={p.name} className="flex items-center justify-between text-sm">
                        <span className="text-stone-600">{p.name}</span>
                        <span className="font-medium text-emerald-600">{formatCurrency(p.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lien vers historique */}
          <div className="flex justify-center">
            <a
              href="/dashboard/transactions"
              className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Voir le détail des transactions
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </>
      )}
    </div>
  );
}
