"use client";

import { useState, useEffect, useMemo } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowTrendUp, faArrowTrendDown, faDownload, faSearch, faFilePdf, faCalendarDays, faXmark } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency, formatDate } from "@/lib/utils";
import CustomSelect from "@/components/ui/CustomSelect";

const CATEGORY_COLORS = ['#4A90D9', '#9B59B6', '#E74C6F', '#1ABC9C', '#E67E22', '#3498DB', '#8E44AD', '#16A085'];

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  const [period, setPeriod] = useState("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

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
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (period !== "custom" || (customStart && customEnd)) {
      loadData();
    }
  }, [period, customStart, customEnd]);

  function resetFilters() {
    setPeriod("month");
    setCustomStart("");
    setCustomEnd("");
    setTypeFilter("all");
    setCategoryFilter("all");
  }

  const filteredTransactions = useMemo(() => {
    let result = [...transactions];
    if (typeFilter !== "all") {
      result = result.filter(tx => tx.type === typeFilter);
    }
    if (categoryFilter !== "all") {
      result = result.filter(tx => String(tx.category.id) === categoryFilter);
    }
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return result;
  }, [transactions, typeFilter, categoryFilter]);

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
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-sm">
            <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
            CSV
          </button>
          <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2 text-sm">
            <FontAwesomeIcon icon={faFilePdf} className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted uppercase tracking-wider">Filtres</p>
          <button onClick={resetFilters} className="text-xs text-muted hover:text-forest flex items-center gap-1 transition-colors">
            <FontAwesomeIcon icon={faXmark} className="w-3 h-3" />
            Réinitialiser
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-muted mb-1.5">Période</label>
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
            <label className="block text-xs text-muted mb-1.5">Type</label>
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
          <div>
            <label className="block text-xs text-muted mb-1.5">Catégorie</label>
            <CustomSelect
              options={categoryOptions}
              value={categoryFilter}
              onChange={setCategoryFilter}
            />
          </div>
          {period === "custom" && (
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs text-muted mb-1.5">
                  <FontAwesomeIcon icon={faCalendarDays} className="w-3 h-3 mr-1" />
                  Du
                </label>
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="input-field text-xs py-2 px-2 w-full" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-muted mb-1.5">Au</label>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="input-field text-xs py-2 px-2 w-full" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm inline-block bg-[#1ABC9C]" />
            <span className="text-muted">Revenus</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm inline-block bg-[#E74C6F]" />
            <span className="text-muted">Dépenses</span>
          </div>
        </div>
        {barData.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">Aucune donnée pour cette période</p>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="flex items-end gap-1.5 min-w-[500px] h-44">
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
                          style={{ height: `${Math.max(incomeH, 2)}%`, backgroundColor: "#1ABC9C" }}
                          title={`Revenu: ${formatCurrency(d.income)}`}
                        />
                      )}
                      {d.expense > 0 && (
                        <div
                          className="w-[38%] rounded-t-sm transition-all duration-300"
                          style={{ height: `${Math.max(expenseH, 2)}%`, backgroundColor: "#E74C6F" }}
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
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-ink mb-1">Dépenses par catégorie</h2>
          <p className="text-xs text-muted mb-4">Répartition des dépenses sur la période</p>
          <div className="space-y-3">
            {categoryBreakdown.map((cat) => {
              const pct = totalExpenseCat > 0 ? (cat.amount / totalExpenseCat) * 100 : 0;
              return (
                <div key={cat.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-ink flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </span>
                    <span className="text-muted">{formatCurrency(cat.amount)} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2.5 bg-border rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Transactions</h2>
          <span className="text-xs text-muted">{filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""}</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-forest border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <FontAwesomeIcon icon={faSearch} className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Aucune transaction trouvée</p>
            <p className="text-xs mt-1">Essayez de modifier les filtres ou d&apos;ajouter des transactions</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {groupedTransactions.map((group) => {
              const groupTotal = group.transactions.reduce((sum, tx) => sum + (tx.type === "income" ? tx.amount : -tx.amount), 0);
              return (
                <div key={group.date}>
                  <div className="flex items-center justify-between px-4 py-2.5 bg-sand/50">
                    <span className="text-xs font-semibold text-ink">{group.label}</span>
                    <span className={`text-xs font-medium ${groupTotal >= 0 ? "text-forest-light" : "text-ochre"}`}>
                      {groupTotal >= 0 ? "+" : ""}{formatCurrency(groupTotal)}
                    </span>
                  </div>
                  <div className="divide-y divide-border/50">
                    {group.transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between px-4 py-3 hover:bg-sand transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getCategoryColor(tx.category?.id || 0) }} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink truncate">{tx.description}</p>
                            <p className="text-xs text-muted">{tx.category?.name}</p>
                          </div>
                        </div>
                        <span className={`text-sm font-semibold shrink-0 ${tx.type === "income" ? "text-forest-light" : "text-ochre"}`}>
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
