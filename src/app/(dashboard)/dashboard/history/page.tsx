"use client";

import { useState, useEffect, useMemo } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowTrendUp, faArrowTrendDown, faDownload, faSearch, faFilePdf, faCalendarDays, faXmark, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency, formatDate } from "@/lib/utils";
import { useDashboard } from "@/app/(dashboard)/layout";
import { CATEGORY_COLORS } from "@/lib/colors";
import CustomSelect from "@/components/ui/CustomSelect";
import DatePicker from "@/components/ui/DatePicker";

type Transaction = {
  id: number;
  type: string;
  amount: number;
  description: string;
  date: string;
  scope: string;
  category: { id: number; name: string; icon: string };
};

type Category = {
  id: number;
  name: string;
  icon: string;
  type: string;
};

export default function HistoryPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { currency: _currency } = useDashboard();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  const [period, setPeriod] = useState("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  function getPeriodDates() {
    const now = new Date();
    switch (period) {
      case "week": {
        const d = new Date(now);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        const end = new Date(d);
        end.setDate(end.getDate() + 6);
        return { start: d.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
      }
      case "month":
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
        };
      case "quarter": {
        const q = Math.floor(now.getMonth() / 3);
        return {
          start: new Date(now.getFullYear(), q * 3, 1).toISOString().split('T')[0],
          end: new Date(now.getFullYear(), q * 3 + 3, 0).toISOString().split('T')[0],
        };
      }
      case "year":
        return {
          start: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0],
          end: new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0],
        };
      case "custom":
        return { start: customStart, end: customEnd };
      default:
        return { start: "", end: "" };
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      const { start, end } = getPeriodDates();
      const params = new URLSearchParams({ start, end, limit: "500" });
      const [txRes, catRes] = await Promise.all([
        fetch(`/api/transactions?${params}`),
        fetch("/api/categories"),
      ]);
      const txData = await txRes.json();
      const catData = await catRes.json();
      setTransactions(txData.transactions || []);
      setCategories(catData.categories || []);
    } catch {
      setLoadError("Impossible de charger l'historique.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = "Historique — Akwetche";
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (period !== "custom" || (customStart && customEnd)) {
      loadData();
    }
  }, [period, customStart, customEnd]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function resetFilters() {
    setPeriod("month");
    setCustomStart("");
    setCustomEnd("");
    setTypeFilter("all");
    setCategoryFilter("all");
    setSearchInput("");
    setSearch("");
  }

  const totalIncome = useMemo(() => transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0), [transactions]);
  const totalExpense = useMemo(() => transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0), [transactions]);
  const netBalance = totalIncome - totalExpense;
  const totalCount = transactions.length;

  const filteredTransactions = useMemo(() => {
    let result = [...transactions];
    if (typeFilter !== "all") {
      result = result.filter(tx => tx.type === typeFilter);
    }
    if (categoryFilter !== "all") {
      result = result.filter(tx => String(tx.category?.id ?? "") === categoryFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(tx =>
        tx.description.toLowerCase().includes(q) ||
        (tx.category?.name || "").toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return result;
  }, [transactions, typeFilter, categoryFilter, search]);

  const groupedTransactions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const map = new Map<string, Transaction[]>();
    for (const tx of filteredTransactions) {
      const key = new Date(tx.date).toISOString().split('T')[0];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(tx);
    }

    const sortedKeys = Array.from(map.keys()).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    return sortedKeys.map(key => {
      const txDate = new Date(key + "T00:00:00");
      let label: string;
      if (txDate.getTime() === today.getTime()) {
        label = "Aujourd'hui";
      } else if (txDate.getTime() === yesterday.getTime()) {
        label = "Hier";
      } else {
        label = formatDate(txDate);
      }
      return { date: key, label, transactions: map.get(key)! };
    });
  }, [filteredTransactions]);

  const barData = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const tx of transactions) {
      const key = new Date(tx.date).toISOString().split('T')[0];
      if (!map.has(key)) map.set(key, { income: 0, expense: 0 });
      const entry = map.get(key)!;
      if (tx.type === "income") entry.income += tx.amount;
      else entry.expense += tx.amount;
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, ...vals }));
  }, [transactions]);

  const maxBarValue = Math.max(...barData.map(d => d.income + d.expense), 1);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { amount: number }>();
    for (const tx of transactions) {
      if (tx.type === "expense") {
        const name = tx.category?.name || "Autre";
        if (!map.has(name)) map.set(name, { amount: 0 });
        map.get(name)!.amount += tx.amount;
      }
    }
    return Array.from(map.entries())
      .map(([name, data], i) => ({
        name,
        amount: data.amount,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const totalExpenseCat = categoryBreakdown.reduce((sum, c) => sum + c.amount, 0);

  const categoryOptions = [
    { value: "all", label: "Toutes les catégories" },
    ...categories.map(c => ({ value: String(c.id), label: c.name })),
  ];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function getCategoryColor(categoryId: number): string {
    return CATEGORY_COLORS[(categoryId - 1) % CATEGORY_COLORS.length];
  }

  function exportCSV() {
    const headers = ["Date", "Type", "Catégorie", "Description", "Montant"];
    const rows = filteredTransactions.map(tx => [
      new Date(tx.date).toLocaleDateString("fr-FR"),
      tx.type === "income" ? "Revenu" : "Dépense",
      tx.category?.name || "",
      tx.description,
      String(tx.amount),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Historique & Analyse</h1>
          <p className="text-muted text-sm mt-0.5">Consultez l&apos;évolution de vos finances</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn-ghost flex items-center gap-2 text-sm">
            <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
            CSV
          </button>
          <button onClick={() => window.print()} className="btn-ghost flex items-center gap-2 text-sm">
            <FontAwesomeIcon icon={faFilePdf} className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {loadError && (
      <div className="alert-inline neg">
      <FontAwesomeIcon icon={faTriangleExclamation} className="w-5 h-5 shrink-0 mt-0.5" />
      <p className="text-sm flex-1">{loadError}</p>
      <button onClick={() => setLoadError(null)} className="opacity-50 hover:opacity-100 shrink-0 transition-opacity"><FontAwesomeIcon icon={faXmark} className="w-4 h-4" /></button>
      </div>
      )}

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-label">Filtres</p>
          <button onClick={resetFilters} className="btn-ghost text-xs flex items-center gap-1">
            <FontAwesomeIcon icon={faXmark} className="w-3 h-3" />
            Réinitialiser
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-label mb-1.5 block">Période</label>
            <CustomSelect
              options={[
                { value: "week", label: "Semaine" },
                { value: "month", label: "Mois" },
                { value: "quarter", label: "Trimestre" },
                { value: "year", label: "Année" },
                { value: "custom", label: "Personnalisé" },
              ]}
              value={period}
              onChange={setPeriod}
            />
          </div>
          <div>
            <label className="text-label mb-1.5 block">Type</label>
            <CustomSelect
              options={[
                { value: "all", label: "Tous" },
                { value: "income", label: "Revenus" },
                { value: "expense", label: "Dépenses" },
              ]}
              value={typeFilter}
              onChange={setTypeFilter}
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="text-label mb-1.5 block">Catégorie</label>
            <CustomSelect
              options={categoryOptions}
              value={categoryFilter}
              onChange={setCategoryFilter}
            />
          </div>
          {period === "custom" && (
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-label mb-1.5 block">
                    <FontAwesomeIcon icon={faCalendarDays} className="w-3 h-3 mr-1" />
                    Du
                  </label>
                  <DatePicker value={customStart} onChange={setCustomStart} className="input-field w-full" placeholder="Date de début" />
                </div>
                <div className="flex-1">
                  <label className="text-label mb-1.5 block">Au</label>
                  <DatePicker value={customEnd} onChange={setCustomEnd} className="input-field w-full" placeholder="Date de fin" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card-inset">
          <p className="text-label">Revenus</p>
          <p className="text-amount text-lg" style={{ color: 'var(--color-pos)' }}>{formatCurrency(totalIncome)}</p>
        </div>
        <div className="card-inset">
          <p className="text-label">Dépenses</p>
          <p className="text-amount text-lg" style={{ color: 'var(--color-neg)' }}>{formatCurrency(totalExpense)}</p>
        </div>
        <div className="card-inset">
          <p className="text-label">Transactions</p>
          <p className="text-amount text-lg">{totalCount}</p>
        </div>
        <div className="card-inset">
          <p className="text-label">Solde</p>
          <p className="text-amount text-lg" style={{ color: netBalance >= 0 ? 'var(--color-pos)' : 'var(--color-neg)' }}>
            {netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance)}
          </p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="bar-dot" style={{ background: 'var(--color-pos)' }} />
            <span className="text-muted">Revenus</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="bar-dot" style={{ background: 'var(--color-neg)' }} />
            <span className="text-muted">Dépenses</span>
          </div>
        </div>
        {barData.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">Aucune donnée pour cette période</p>
        ) : (
          <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex items-end gap-1.5 min-w-[500px] h-32 sm:h-44">
              {barData.map((d) => {
                const incomeH = (d.income / maxBarValue) * 100;
                const expenseH = (d.expense / maxBarValue) * 100;
                const dateLabel = new Date(d.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-[32px]">
                    <div className="w-full flex items-end justify-center gap-[2px]" style={{ height: "130px" }}>
                      {d.income > 0 && (
                        <div
                          className="w-[38%] rounded-t-sm transition-all duration-300"
                          style={{ height: `${Math.max(incomeH, 2)}%`, backgroundColor: 'var(--color-pos)' }}
                          title={`Revenu: ${formatCurrency(d.income)}`}
                        />
                      )}
                      {d.expense > 0 && (
                        <div
                          className="w-[38%] rounded-t-sm transition-all duration-300"
                          style={{ height: `${Math.max(expenseH, 2)}%`, backgroundColor: 'var(--color-neg)' }}
                          title={`Dépense: ${formatCurrency(d.expense)}`}
                        />
                      )}
                    </div>
                    <span className="text-[10px] text-muted whitespace-nowrap">{dateLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {categoryBreakdown.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-ink mb-1">Dépenses par catégorie</h2>
          <p className="text-xs text-muted mb-4">Répartition des dépenses sur la période</p>
          <div className="space-y-3">
            {(() => {
              const roundedPcts = (() => {
                if (totalExpenseCat <= 0 || categoryBreakdown.length === 0) return categoryBreakdown.map(() => 0);
                const raw = categoryBreakdown.map(c => (c.amount / totalExpenseCat) * 100);
                const floored = raw.map(r => Math.floor(r));
                const remaining = 100 - floored.reduce((a, b) => a + b, 0);
                const fracs = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
                for (let k = 0; k < remaining && k < fracs.length; k++) floored[fracs[k].i]++;
                return floored;
              })();
              return categoryBreakdown.map((cat, i) => {
                const pct = roundedPcts[i];
                return (
                  <div key={cat.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-ink flex items-center gap-1.5">
                        <span className="bar-dot" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </span>
                      <span className="text-muted">{formatCurrency(cat.amount)} ({pct}%)</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      <div className="card">
        <div className="p-4 border-b border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <h2 className="text-sm font-semibold text-ink">Transactions</h2>
            <span className="text-xs text-muted sm:hidden">{filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="relative w-full sm:w-64">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Rechercher une transaction..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input-field py-2 text-sm w-full" style={{ paddingLeft: "2.25rem", paddingRight: "2.25rem" }}
            />
            {searchInput && (
              <button onClick={() => setSearchInput("")} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-muted hover:text-ink rounded-full hover:bg-[var(--color-surface-raised)] transition-colors">
                <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <span className="text-xs text-muted hidden sm:block">{filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""}</span>
        </div>
        {loading ? (
          <div className="p-4 space-y-3 animate-pulse">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton w-8 h-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2"><div className="skeleton h-4 w-3/4" /><div className="skeleton h-3 w-1/3" /></div>
                <div className="skeleton h-5 w-16 shrink-0" />
              </div>
            ))}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <FontAwesomeIcon icon={faSearch} className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Aucune transaction trouvée</p>
            <p className="text-xs mt-1">Essayez de modifier les filtres ou d&apos;ajouter des transactions</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {groupedTransactions.map((group) => {
              const groupTotal = group.transactions.reduce((sum, tx) => sum + (tx.type === "income" ? tx.amount : -tx.amount), 0);
              return (
                <div key={group.date}>
                  <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2.5" style={{ background: 'var(--color-surface-raised)' }}>
                    <span className="text-label">{group.label}</span>
                    <span className={`text-xs font-medium ${groupTotal >= 0 ? 'text-[var(--color-pos)]' : 'text-[var(--color-neg)]'}`}>
                      {groupTotal >= 0 ? "+" : ""}{formatCurrency(groupTotal)}
                    </span>
                  </div>
                  <div className="divide-y divide-[var(--color-border)]/50">
                    {group.transactions.map((tx) => (
                      <div key={tx.id} className="card-compact flex items-center justify-between hover:shadow-sm transition-shadow" style={{ borderRadius: 0 }}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: tx.type === "income" ? 'var(--color-pos-bg)' : 'var(--color-neg-bg)' }}>
                            <FontAwesomeIcon icon={tx.type === "income" ? faArrowTrendUp : faArrowTrendDown} className="w-3.5 h-3.5" style={{ color: tx.type === "income" ? 'var(--color-pos)' : 'var(--color-neg)' }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink truncate">{tx.description}</p>
                            <p className="text-xs text-muted">{tx.category?.name}</p>
                          </div>
                        </div>
                        <span className="text-amount text-sm" style={{ color: tx.type === "income" ? 'var(--color-pos)' : 'var(--color-neg)' }}>
                          {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
