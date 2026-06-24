"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "../../layout";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowsUpDown, faArrowTrendUp, faArrowTrendDown, faPlus, faTrash, faFilter, faArrowLeft, faArrowRight, faBriefcase, faUser, faXmark, faPen, faSearch, faCalendarDays, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency, formatDate } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/lib/colors";
import ConfirmModal from "@/components/ConfirmModal";
import CustomSelect from "@/components/ui/CustomSelect";

type Transaction = {
  id: number;
  type: string;
  amount: number;
  description: string;
  date: string;
  scope: string;
  category: { id: number; name: string; icon: string };
};

type ScopeSummary = {
  income: number;
  expense: number;
  savings: number;
  balance: number;
};

export default function TransactionsPage() {
  const { user, commercialMode } = useDashboard();
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState<{ personal: ScopeSummary; activity: ScopeSummary }>({
    personal: { income: 0, expense: 0, savings: 0, balance: 0 },
    activity: { income: 0, expense: 0, savings: 0, balance: 0 },
  });

  const [page, setPage] = useState(0);
  const limit = 20;

  const [filter, setFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [period, setPeriod] = useState("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");

  const [showModal, setShowModal] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState({
    type: "expense",
    amount: "",
    description: "",
    categoryId: "",
    date: new Date().toISOString().split('T')[0],
    scope: "personal",
    note: "",
  });
  const [txError, setTxError] = useState("");

  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategoryIds, setActiveCategoryIds] = useState<number[]>([]);
  const [limits, setLimits] = useState<{
    isPremium: boolean;
    incomeCount: number;
    expenseCount: number;
    maxFreeIncome: number;
    maxFreeExpense: number;
  } | null>(null);

  const [confirmDeleteTx, setConfirmDeleteTx] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function getPeriodDates() {
    const now = new Date();
    if (period === "month") {
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
      };
    }
    if (period === "lastMonth") {
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0],
        end: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0],
      };
    }
    return { start: customStart, end: customEnd };
  }

  async function loadSummary() {
    try {
      const res = await fetch("/api/transactions/summary?period=month");
      const data = await res.json();
      if (data) setSummary(data);
    } catch { /* ignore */ }
  }

  async function loadTransactions() {
    setLoading(true);
    try {
      const { start, end } = getPeriodDates();
      const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit), start, end, sort, order: sortOrder });
      if (filter !== "all") params.set("type", filter);
      if (scopeFilter !== "all") params.set("scope", scopeFilter);
      if (search) params.set("search", search);

      const [txRes, catRes, limitsRes] = await Promise.all([
        fetch(`/api/transactions?${params}`),
        fetch("/api/categories"),
        fetch("/api/user/limits"),
      ]);
      const txData = await txRes.json();
      const catData = await catRes.json();
      const limitsData = await limitsRes.json();
      setTransactions(txData.transactions || []);
      setTotal(txData.total || 0);
      setCategories(catData.categories || []);
      setActiveCategoryIds(catData.activeCategoryIds || []);
      setLimits(limitsData);
    } catch (e) {
      setLoadError("Impossible de charger les transactions.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = "Transactions — Akwetche";
  }, []);

  useEffect(() => {
    loadTransactions();
    loadSummary();
  }, [page, filter, scopeFilter, period, customStart, customEnd, search, sort, sortOrder]);

  function openAddModal() {
    setEditTx(null);
    setFormData({ type: "expense", amount: "", description: "", categoryId: "", date: new Date().toISOString().split('T')[0], scope: "personal", note: "" });
    setTxError("");
    setShowModal(true);
  }

  function openEditModal(tx: Transaction) {
    setEditTx(tx);
    setFormData({
      type: tx.type,
      amount: String(tx.amount),
      description: tx.description,
      categoryId: String(tx.category?.id ?? ""),
      date: tx.date ? new Date(tx.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      scope: tx.scope,
      note: "",
    });
    setTxError("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditTx(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTxError("");

    if (!formData.amount || Number(formData.amount) <= 0) { setTxError("Le montant doit être supérieur à 0"); return; }
    if (!formData.description.trim()) { setTxError("La description est requise"); return; }
    if (!formData.categoryId) { setTxError("La catégorie est requise"); return; }
    if (!formData.date) { setTxError("La date est requise"); return; }

    if (!editTx && limits && !limits.isPremium && user?.role === "user") {
      const atLimit = formData.type === "income" ? limits.incomeCount >= limits.maxFreeIncome : limits.expenseCount >= limits.maxFreeExpense;
      if (atLimit) {
        setTxError(`Limite mensuelle gratuite atteinte (${limits.maxFreeIncome} revenus / ${limits.maxFreeExpense} dépenses max). Passez à Premium pour continuer.`);
        return;
      }
    }

    try {
      const url = editTx ? `/api/transactions/${editTx.id}` : "/api/transactions";
      const method = editTx ? "PUT" : "POST";
      const body: Record<string, unknown> = { type: formData.type, amount: Number(formData.amount), description: formData.description, categoryId: Number(formData.categoryId), date: formData.date, scope: formData.scope };
      if (formData.note) body.note = formData.note;

      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setTxError(data.error || "Erreur"); return; }
      closeModal();
      loadTransactions();
      loadSummary();
    } catch {
      setTxError("Erreur réseau");
    }
  }

  async function handleDelete(id: number) {
    setConfirmDeleteTx(null);
    try {
      await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      loadTransactions();
      loadSummary();
    } catch { setLoadError("Erreur lors de la suppression."); }
  }

  function handleSort(field: string) {
    if (sort === field) { setSortOrder(sortOrder === "desc" ? "asc" : "desc"); }
    else { setSort(field); setSortOrder("desc"); }
    setPage(0);
  }

  function handlePeriodChange(p: string) { setPeriod(p); setPage(0); }

  function getCategoryColor(categoryId: number): string {
    return CATEGORY_COLORS[(categoryId - 1) % CATEGORY_COLORS.length];
  }

  const totalPages = Math.ceil(total / limit);
  const totalIncome = (summary.personal?.income || 0) + (summary.activity?.income || 0);
  const totalExpense = (summary.personal?.expense || 0) + (summary.activity?.expense || 0);
  const netBalance = totalIncome - totalExpense;

  const categoryOptions = (() => {
    const isPrem = limits?.isPremium || false;
    const ofType = categories.filter((c: any) => c.type === formData.type).sort((a: any, b: any) => a.id - b.id);
    if (isPrem) return ofType.map((c: any) => ({ value: String(c.id), label: c.name }));
    const active = ofType.filter((c: any) => activeCategoryIds.includes(c.id));
    const locked = ofType.filter((c: any) => !activeCategoryIds.includes(c.id));
    if (locked.length === 0) return active.map((c: any) => ({ value: String(c.id), label: c.name }));
    return [
      ...active.map((c: any) => ({ value: String(c.id), label: c.name })),
      { value: "__sep__", label: "Nécessitent Premium", separator: true },
      ...locked.map((c: any) => ({ value: String(c.id), label: c.name, disabled: true, disabledReason: "Premium requis" })),
    ];
  })();

  const tabs = [
    { label: "Tout", filter: "all" as const, scope: "all" as const },
    { label: "Revenus", filter: "income" as const, scope: "all" as const },
    { label: "Dépenses", filter: "expense" as const, scope: "all" as const },
    ...(commercialMode ? [
      { label: "Personnel", filter: "all" as const, scope: "personal" as const },
      { label: "Activité", filter: "all" as const, scope: "activity" as const },
    ] : []),
  ];

  function handleTabClick(tab: { label: string; filter: string; scope: string }) {
    setFilter(tab.filter);
    setScopeFilter(tab.scope);
    setPage(0);
  }

  const groupedTransactions = useMemo(() => {
    const groups: { date: string; label: string; total: number; transactions: Transaction[] }[] = [];
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const grouped = transactions.reduce((acc: Record<string, Transaction[]>, tx) => {
      const dateKey = tx.date ? tx.date.split('T')[0] : '';
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(tx);
      return acc;
    }, {});

    for (const [date, txs] of Object.entries(grouped)) {
      let label = formatDate(date);
      if (date === today) label = "Aujourd'hui";
      else if (date === yesterday) label = "Hier";

      const total = txs.reduce((sum, tx) => sum + (tx.type === 'income' ? tx.amount : -tx.amount), 0);
      groups.push({ date, label, total, transactions: txs });
    }

    groups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return groups;
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ochre-light flex items-center justify-center">
              <FontAwesomeIcon icon={faArrowTrendUp} className="w-5 h-5 text-forest-light" />
            </div>
            <div>
              <p className="text-xs text-muted">Revenus mensuels</p>
              <p className="text-lg font-bold text-forest-light">{formatCurrency(totalIncome)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ochre-light flex items-center justify-center">
              <FontAwesomeIcon icon={faArrowTrendDown} className="w-5 h-5 text-ochre" />
            </div>
            <div>
              <p className="text-xs text-muted">Dépenses mensuelles</p>
              <p className="text-lg font-bold text-ochre">{formatCurrency(totalExpense)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ochre-light flex items-center justify-center">
              <FontAwesomeIcon icon={faArrowsUpDown} className="w-5 h-5" style={{ color: netBalance >= 0 ? '#1ABC9C' : '#E74C6F' }} />
            </div>
            <div>
              <p className="text-xs text-muted">Solde net</p>
              <p className={`text-lg font-bold ${netBalance >= 0 ? 'text-forest-light' : 'text-red-500'}`}>
                {netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs (type + scope) */}
      <div className="overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center gap-1.5 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.label}
              onClick={() => handleTabClick(tab)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab.filter === filter && tab.scope === scopeFilter ? "bg-ochre-light text-forest" : "text-muted hover:bg-border"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Period Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {["month", "lastMonth", "custom"].map((p) => (
          <button
            key={p}
            onClick={() => handlePeriodChange(p)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${period === p ? "bg-ochre-light text-forest" : "text-muted hover:bg-border"}`}
          >
            {p === "month" ? "Ce mois" : p === "lastMonth" ? "Mois dernier" : "Personnalisé"}
          </button>
        ))}
        {period === "custom" && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 w-full sm:w-auto">
              <div className="relative w-full sm:w-auto">
                <label className="block text-xs text-muted mb-0.5 sm:hidden">Date de début</label>
                <FontAwesomeIcon icon={faCalendarDays} className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none sm:top-1/2" />
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => { setCustomStart(e.target.value); setPage(0); }}
                  className="input-field text-xs py-1.5 pl-8 pr-2 w-full sm:w-32"
                />
              </div>
              <span className="hidden sm:inline text-xs text-muted text-center">au</span>
              <div className="relative w-full sm:w-auto">
                <label className="block text-xs text-muted mb-0.5 sm:hidden">Date de fin</label>
                <FontAwesomeIcon icon={faCalendarDays} className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none sm:top-1/2" />
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => { setCustomEnd(e.target.value); setPage(0); }}
                  className="input-field text-xs py-1.5 pl-8 pr-2 w-full sm:w-32"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search & Sort (desktop only) */}
      <div className="hidden sm:flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="input-field pl-9 pr-9 py-2 text-sm" placeholder="Rechercher..." />
          {searchInput && (
            <button onClick={() => setSearchInput("")} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-muted hover:text-ink rounded-full hover:bg-sand transition-colors">
              <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <span className="text-xs text-muted">Trier par:</span>
        {["date", "amount", "category"].map((s) => (
          <button
            key={s}
            onClick={() => handleSort(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1 ${sort === s ? "bg-ochre-light text-forest" : "text-muted hover:bg-border"}`}
          >
            {s === "date" ? "Date" : s === "amount" ? "Montant" : "Catégorie"}
            {sort === s && <FontAwesomeIcon icon={faArrowsUpDown} className={`w-3 h-3 transition-transform ${sortOrder === "asc" ? "rotate-180" : ""}`} />}
          </button>
        ))}
      </div>

      {/* Erreur chargement */}
      {loadError && (
      <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 animate-fade-in">
      <FontAwesomeIcon icon={faTriangleExclamation} className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
      <p className="text-sm text-red-700 flex-1">{loadError}</p>
      <button onClick={() => setLoadError(null)} className="text-red-400 hover:text-red-600 shrink-0"><FontAwesomeIcon icon={faXmark} className="w-4 h-4" /></button>
      </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Transactions</h1>
          <p className="text-muted text-sm mt-0.5">{total} transaction{total !== 1 ? "s" : ""} au total</p>
        </div>
        <button onClick={openAddModal} className="btn-primary flex items-center gap-2 text-sm hidden sm:flex">
          <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {/* Transaction List */}
      <div className="card">
        {loading ? (
          <div className="divide-y divide-border animate-pulse">
            <div className="flex items-center gap-3 p-4"><div className="w-10 h-10 bg-stone/30 rounded-xl" /><div className="flex-1 space-y-2"><div className="h-4 w-3/4 bg-stone/30 rounded-lg" /><div className="h-3 w-1/2 bg-stone/20 rounded-lg" /></div><div className="h-5 w-20 bg-stone/20 rounded-lg" /></div>
            <div className="flex items-center gap-3 p-4"><div className="w-10 h-10 bg-stone/30 rounded-xl" /><div className="flex-1 space-y-2"><div className="h-4 w-2/3 bg-stone/30 rounded-lg" /><div className="h-3 w-1/3 bg-stone/20 rounded-lg" /></div><div className="h-5 w-16 bg-stone/20 rounded-lg" /></div>
            <div className="flex items-center gap-3 p-4"><div className="w-10 h-10 bg-stone/30 rounded-xl" /><div className="flex-1 space-y-2"><div className="h-4 w-3/4 bg-stone/30 rounded-lg" /><div className="h-3 w-1/2 bg-stone/20 rounded-lg" /></div><div className="h-5 w-24 bg-stone/20 rounded-lg" /></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <FontAwesomeIcon icon={faArrowsUpDown} className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Aucune transaction trouvée</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {groupedTransactions.map(group => (
              <div key={group.date}>
                <div className="flex items-center justify-between px-4 py-2.5 bg-sand/50">
                  <span className="text-xs font-semibold text-ink">{group.label}</span>
                  <span className={`text-xs font-medium ${group.total >= 0 ? 'text-forest-light' : 'text-ochre'}`}>
                    {group.total >= 0 ? '+' : ''}{formatCurrency(group.total)}
                  </span>
                </div>
                <div className="divide-y divide-border/50">
                  {group.transactions.map((tx, i) => (
                    <div key={tx.id} className="p-4 hover:bg-sand transition-colors animate-slide-in" style={{ animationDelay: `${i * 30}ms` }}>
                      {/* Mobile: stacked layout */}
                      <div className="md:hidden">
                        <div className="flex items-start gap-2">
                          <div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: getCategoryColor(tx.category?.id || 0) }} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-ink whitespace-normal break-words">{tx.description}</p>
                            <p className="text-xs text-muted mt-0.5">
                              {tx.category?.name || "Non catégorisé"}
                              {tx.scope === "activity" && <span className="ml-1 inline-flex items-center gap-0.5 text-ochre font-medium"><FontAwesomeIcon icon={faBriefcase} className="w-2.5 h-2.5" /> activité</span>}
                              {tx.scope === "personal" && <span className="ml-1 inline-flex items-center gap-0.5 text-forest font-medium"><FontAwesomeIcon icon={faUser} className="w-2.5 h-2.5" /> personnel</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-sm font-semibold ${tx.type === "income" ? "text-forest-light" : "text-ochre"}`}>
                            {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                          </span>
                          <span className="text-xs text-muted">{formatDate(tx.date)}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 pt-2 border-t border-border/50">
                          <button onClick={() => openEditModal(tx)} className="text-xs font-medium text-muted hover:text-forest transition-colors flex items-center gap-1">
                            <FontAwesomeIcon icon={faPen} className="w-3 h-3" /> Modifier
                          </button>
                          <button onClick={() => setConfirmDeleteTx(tx.id)} className="text-xs font-medium text-muted hover:text-red-500 transition-colors flex items-center gap-1">
                            <FontAwesomeIcon icon={faTrash} className="w-3 h-3" /> Supprimer
                          </button>
                        </div>
                      </div>
                      {/* Desktop: inline layout */}
                      <div className="hidden md:flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getCategoryColor(tx.category?.id || 0) }} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink truncate">{tx.description}</p>
                            <p className="text-xs text-muted">
                              {tx.category?.name || "Non catégorisé"} · {formatDate(tx.date)}
                              {tx.scope === "activity" && <span className="ml-1.5 inline-flex items-center gap-0.5 text-ochre font-medium"><FontAwesomeIcon icon={faBriefcase} className="w-3 h-3" /> activité</span>}
                              {tx.scope === "personal" && <span className="ml-1.5 inline-flex items-center gap-0.5 text-forest font-medium"><FontAwesomeIcon icon={faUser} className="w-3 h-3" /> personnel</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-sm font-semibold ${tx.type === "income" ? "text-forest-light" : "text-ochre"}`}>
                            {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                          </span>
                          <button onClick={() => openEditModal(tx)} className="text-muted hover:text-forest transition-colors p-1" title="Modifier">
                            <FontAwesomeIcon icon={faPen} className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setConfirmDeleteTx(tx.id)} className="text-muted hover:text-red-500 transition-colors p-1" title="Supprimer">
                            <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="btn-secondary text-sm disabled:opacity-30">
            <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
          </button>
          <span className="text-sm text-muted">Page {page + 1} sur {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="btn-secondary text-sm disabled:opacity-30">
            <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mobile drawer */}
      {showModal && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={closeModal}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in" />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto animate-slide-up shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-ink">{editTx ? "Modifier" : "Nouvelle transaction"}</h3>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center text-muted hover:text-ink rounded-lg hover:bg-sand transition-colors">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                {commercialMode && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => setFormData({ ...formData, scope: "personal" })} className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${formData.scope === "personal" ? "bg-forest text-white shadow-sm" : "bg-border text-muted hover:bg-sand"}`}>Personnel</button>
                  <button type="button" onClick={() => setFormData({ ...formData, scope: "activity" })} className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${formData.scope === "activity" ? "bg-ochre text-white shadow-sm" : "bg-border text-muted hover:bg-sand"}`}>Activité</button>
                </div>
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setFormData({ ...formData, type: "expense", categoryId: "" })} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${formData.type === "expense" ? "bg-ochre text-white shadow-sm" : "bg-border text-muted hover:bg-sand"}`}>Dépense</button>
                  <button type="button" onClick={() => setFormData({ ...formData, type: "income", categoryId: "" })} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${formData.type === "income" ? "bg-forest-light text-white shadow-sm" : "bg-border text-muted hover:bg-sand"}`}>Revenu</button>
                </div>
                <div>
                  <label className="field-label">Montant</label>
                  <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="input-field" placeholder="Ex: 5000" required min="1" />
                </div>
                <div>
                  <label className="field-label">Description</label>
                  <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input-field" placeholder="Ex: Achat alimentation" required />
                </div>
                <div>
                  <label className="field-label">Catégorie</label>
                  <CustomSelect options={categoryOptions} value={formData.categoryId} onChange={(v) => setFormData({ ...formData, categoryId: v })} placeholder="Sélectionner..." />
                </div>
                <div>
                  <label className="field-label">Date</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="field-label">Note (optionnelle)</label>
                  <textarea value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} className="input-field resize-none" rows={2} placeholder="Ajouter une note..." />
                </div>
                {!editTx && limits && !limits.isPremium && user?.role === "user" && (
                  <div className="p-3 bg-ochre-light rounded-xl">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-ochre">{formData.type === "income" ? "Revenus" : "Dépenses"} ce mois</span>
                      <span className="font-semibold text-ochre">{formData.type === "income" ? limits.incomeCount : limits.expenseCount}/{formData.type === "income" ? limits.maxFreeIncome : limits.maxFreeExpense}</span>
                    </div>
                    {(formData.type === "income" && limits.incomeCount >= limits.maxFreeIncome) || (formData.type === "expense" && limits.expenseCount >= limits.maxFreeExpense) ? (
                      <p className="text-xs text-red-600">Limite mensuelle atteinte. Passez à Premium.</p>
                    ) : (
                      <p className="text-xs text-ochre">{Math.max(0, (formData.type === "income" ? limits.maxFreeIncome : limits.maxFreeExpense) - (formData.type === "income" ? limits.incomeCount : limits.expenseCount))} transaction(s) restante(s)</p>
                    )}
                  </div>
                )}
                {txError && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{txError}</p>}
                {(() => {
                  const atLimit = !editTx && limits && !limits.isPremium && user?.role === "user" && ((formData.type === "income" && limits.incomeCount >= limits.maxFreeIncome) || (formData.type === "expense" && limits.expenseCount >= limits.maxFreeExpense));
                  return <button type="submit" disabled={!!atLimit} className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed">{editTx ? "Enregistrer" : "Ajouter"}</button>;
                })()}
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Desktop modal */}
      {showModal && (
        <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4 bg-black/40 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-ink">{editTx ? "Modifier la transaction" : "Nouvelle transaction"}</h3>
              <button onClick={closeModal} className="text-muted hover:text-muted">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {commercialMode && (
              <div className="flex gap-2">
                <button type="button" onClick={() => setFormData({ ...formData, scope: "personal" })} className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${formData.scope === "personal" ? "bg-forest text-white shadow-sm" : "bg-border text-muted hover:bg-sand"}`}>Personnel</button>
                <button type="button" onClick={() => setFormData({ ...formData, scope: "activity" })} className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${formData.scope === "activity" ? "bg-ochre text-white shadow-sm" : "bg-border text-muted hover:bg-sand"}`}>Activité</button>
              </div>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => setFormData({ ...formData, type: "expense", categoryId: "" })} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${formData.type === "expense" ? "bg-ochre text-white shadow-sm" : "bg-border text-muted hover:bg-sand"}`}>Dépense</button>
                <button type="button" onClick={() => setFormData({ ...formData, type: "income", categoryId: "" })} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${formData.type === "income" ? "bg-forest-light text-white shadow-sm" : "bg-border text-muted hover:bg-sand"}`}>Revenu</button>
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Montant</label>
                <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="input-field" placeholder="Ex: 5000" required min="1" />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Description</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input-field" placeholder="Ex: Achat alimentation" required />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Catégorie</label>
                <CustomSelect options={categoryOptions} value={formData.categoryId} onChange={(v) => setFormData({ ...formData, categoryId: v })} placeholder="Sélectionner..." />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Date</label>
                <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Note (optionnelle)</label>
                <textarea value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} className="input-field resize-none" rows={2} placeholder="Ajouter une note..." />
              </div>
              {!editTx && limits && !limits.isPremium && user?.role === "user" && (
                <div className="p-3 bg-ochre-light rounded-xl">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-ochre">{formData.type === "income" ? "Revenus" : "Dépenses"} ce mois</span>
                    <span className="font-semibold text-ochre">{formData.type === "income" ? limits.incomeCount : limits.expenseCount}/{formData.type === "income" ? limits.maxFreeIncome : limits.maxFreeExpense}</span>
                  </div>
                  {(formData.type === "income" && limits.incomeCount >= limits.maxFreeIncome) || (formData.type === "expense" && limits.expenseCount >= limits.maxFreeExpense) ? (
                    <p className="text-xs text-red-600">Limite mensuelle atteinte. Passez à Premium.</p>
                  ) : (
                    <p className="text-xs text-ochre">{Math.max(0, (formData.type === "income" ? limits.maxFreeIncome : limits.maxFreeExpense) - (formData.type === "income" ? limits.incomeCount : limits.expenseCount))} transaction(s) restante(s)</p>
                  )}
                </div>
              )}
              {txError && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{txError}</p>}
              {(() => {
                const atLimit = !editTx && limits && !limits.isPremium && user?.role === "user" && ((formData.type === "income" && limits.incomeCount >= limits.maxFreeIncome) || (formData.type === "expense" && limits.expenseCount >= limits.maxFreeExpense));
                return <button type="submit" disabled={!!atLimit} className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed">{editTx ? "Enregistrer" : "Ajouter"}</button>;
              })()}
            </form>
          </div>
        </div>
      )}

      {/* FAB mobile */}
      <button onClick={openAddModal} aria-label="Nouvelle transaction" className="fixed bottom-20 right-4 z-40 lg:hidden w-14 h-14 bg-forest text-white rounded-full shadow-lg flex items-center justify-center hover:bg-forest-light transition-colors animate-fade-in">
        <FontAwesomeIcon icon={faPlus} className="w-6 h-6" />
      </button>

      <ConfirmModal
        open={confirmDeleteTx !== null}
        title="Supprimer cette transaction ?"
        message="Cette transaction sera définitivement supprimée et ne pourra pas être récupérée."
        confirmLabel="Oui, supprimer"
        cancelLabel="Annuler"
        variant="danger"
        onConfirm={() => handleDelete(confirmDeleteTx!)}
        onCancel={() => setConfirmDeleteTx(null)}
      />
    </div>
  );
}
