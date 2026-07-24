"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps, @typescript-eslint/no-explicit-any */

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDashboard } from "../../layout";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowsUpDown, faArrowTrendUp, faArrowTrendDown, faPlus, faTrash, faFilter, faArrowLeft, faArrowRight, faBriefcase, faUser, faXmark, faPen, faSearch, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency, formatDate, toDisplayCurrency, toStorageCurrency } from "@/lib/utils";
import type { Transaction as TransactionType } from "@/types";
import { CATEGORY_COLORS } from "@/lib/colors";
import ConfirmModal from "@/components/ConfirmModal";
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

type ScopeSummary = {
  income: number;
  expense: number;
  savings: number;
  balance: number;
};

export default function TransactionsPage() {
  const { user, commercialMode, currency } = useDashboard();
  const router = useRouter();
  const searchParams = useSearchParams();

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
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState({
    type: "expense",
    amount: "",
    description: "",
    categoryId: "",
    date: new Date().toISOString().split('T')[0],
    scope: "personal",
  });
  const [txError, setTxError] = useState("");

  // Reconvertir le montant affiché dans le formulaire quand la devise change
  const prevCurrencyRef = useRef(currency);
  useEffect(() => {
    const prev = prevCurrencyRef.current;
    if (showModal && prev !== currency) {
      if (editTx) {
        // Mode édition : valeur de base connue
        setFormData(f => ({ ...f, amount: formatAmountDisplay(String(toDisplayCurrency(editTx.amount, currency))) }));
      } else if (formData.amount) {
        // Mode ajout : convertir depuis l'ancienne devise
        const baseVal = toStorageCurrency(parseFloat(parseAmountInput(formData.amount)) || 0, prev);
        setFormData(f => ({ ...f, amount: formatAmountDisplay(String(toDisplayCurrency(baseVal, currency))) }));
      }
      prevCurrencyRef.current = currency;
    }
  }, [currency, showModal]);

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

  useEffect(() => {
    if (searchParams.get("action") === "create") {
      openAddModal();
      router.replace("/dashboard/transactions");
    }
  }, [searchParams]);

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

  function formatAmountDisplay(raw: string): string {
    const digits = raw.replace(/[^\d]/g, "");
    if (!digits) return "";
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  function parseAmountInput(raw: string): string {
    return raw.replace(/[^\d]/g, "");
  }

  function openAddModal() {
    setEditTx(null);
    setFormData({ type: "expense", amount: "", description: "", categoryId: "", date: new Date().toISOString().split('T')[0], scope: "personal" });
    setTxError("");
    setShowModal(true);
  }

  function openEditModal(tx: Transaction) {
    setEditTx(tx);
    setFormData({
      type: tx.type,
      amount: formatAmountDisplay(String(toDisplayCurrency(tx.amount, currency))),
      description: tx.description,
      categoryId: String(tx.category?.id ?? ""),
      date: tx.date ? new Date(tx.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      scope: tx.scope,
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

    if (!formData.amount || Number(parseAmountInput(formData.amount)) <= 0) { setTxError("Le montant doit être supérieur à 0"); return; }
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
      const body: Record<string, unknown> = { type: formData.type, amount: toStorageCurrency(Number(parseAmountInput(formData.amount)), currency), description: formData.description, categoryId: Number(formData.categoryId), date: formData.date, scope: formData.scope };

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
        <div className="card-inset flex items-center gap-3 transition-shadow hover:shadow-sm">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--color-pos-bg)' }}>
            <FontAwesomeIcon icon={faArrowTrendUp} className="w-5 h-5" style={{ color: 'var(--color-pos)' }} />
          </div>
          <div>
            <p className="text-label">Revenus mensuels</p>
            <p className="text-amount text-lg" style={{ color: 'var(--color-pos)' }}>{formatCurrency(totalIncome)}</p>
          </div>
        </div>
        <div className="card-inset flex items-center gap-3 transition-shadow hover:shadow-sm">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--color-neg-bg)' }}>
            <FontAwesomeIcon icon={faArrowTrendDown} className="w-5 h-5" style={{ color: 'var(--color-neg)' }} />
          </div>
          <div>
            <p className="text-label">Dépenses mensuelles</p>
            <p className="text-amount text-lg" style={{ color: 'var(--color-neg)' }}>{formatCurrency(totalExpense)}</p>
          </div>
        </div>
        <div className="card-inset flex items-center gap-3 transition-shadow hover:shadow-sm">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: netBalance >= 0 ? 'var(--color-pos-bg)' : 'var(--color-neg-bg)' }}>
            <FontAwesomeIcon icon={faArrowsUpDown} className="w-5 h-5" style={{ color: netBalance >= 0 ? 'var(--color-pos)' : 'var(--color-neg)' }} />
          </div>
          <div>
            <p className="text-label">Solde net</p>
            <p className="text-amount text-lg" style={{ color: netBalance >= 0 ? 'var(--color-pos)' : 'var(--color-neg)' }}>
              {netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance)}
            </p>
          </div>
        </div>
      </div>

      {/* Period Filter */}
      <div className="flex items-center gap-1 flex-wrap p-1 rounded-xl" style={{ background: 'var(--color-surface-raised)' }}>
        {["month", "lastMonth", "custom"].map((p) => (
          <button
            key={p}
            onClick={() => handlePeriodChange(p)}
            className={`px-3 py-1.5 rounded-[10px] text-xs font-medium transition-all ${period === p ? "bg-[var(--color-surface)] text-ink shadow-sm" : "text-muted hover:text-ink"}`}
          >
            {p === "month" ? "Ce mois" : p === "lastMonth" ? "Mois dernier" : "Personnalisé"}
          </button>
        ))}
        {period === "custom" && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto ml-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 w-full sm:w-auto">
              <div className="w-full sm:w-auto">
                <label className="text-label mb-0.5 sm:hidden">Date de début</label>
                <DatePicker
                  value={customStart}
                  onChange={(val) => { setCustomStart(val); setPage(0); }}
                  placeholder="Date de début"
                  className="text-xs"
                />
              </div>
              <span className="hidden sm:inline text-xs text-muted text-center">au</span>
              <div className="w-full sm:w-auto">
                <label className="text-label mb-0.5 sm:hidden">Date de fin</label>
                <DatePicker
                  value={customEnd}
                  onChange={(val) => { setCustomEnd(val); setPage(0); }}
                  placeholder="Date de fin"
                  min={customStart || undefined}
                  className="text-xs"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile filter button */}
      <button onClick={() => setShowMobileFilters(true)} className="sm:hidden flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-muted hover:text-ink transition-colors" style={{ background: 'var(--color-surface-raised)' }}>
        <FontAwesomeIcon icon={faFilter} className="w-3.5 h-3.5" />
        Filtres & Tri
      </button>

      {/* Search & Sort (desktop only) */}
      <div className="hidden sm:flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="input-field py-2 text-sm" style={{ paddingLeft: "2.25rem", paddingRight: "2.25rem" }} placeholder="Rechercher..." />
          {searchInput && (
            <button onClick={() => setSearchInput("")} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-muted hover:text-ink rounded-full hover:bg-[var(--color-surface-raised)] transition-colors">
              <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <span className="text-xs text-muted">Trier par:</span>
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--color-surface-raised)' }}>
          {["date", "amount", "category"].map((s) => (
            <button
              key={s}
              onClick={() => handleSort(s)}
              className={`px-3 py-1.5 rounded-[10px] text-xs font-medium transition-all flex items-center gap-1 ${sort === s ? "bg-[var(--color-surface)] text-ink shadow-sm" : "text-muted hover:text-ink"}`}
            >
              {s === "date" ? "Date" : s === "amount" ? "Montant" : "Catégorie"}
              {sort === s && <FontAwesomeIcon icon={faArrowsUpDown} className={`w-3 h-3 transition-transform ${sortOrder === "asc" ? "rotate-180" : ""}`} />}
            </button>
          ))}
        </div>
      </div>

      {/* Erreur chargement */}
      {loadError && (
      <div className="alert-inline neg">
      <FontAwesomeIcon icon={faTriangleExclamation} className="w-5 h-5 shrink-0 mt-0.5" />
      <p className="text-sm flex-1">{loadError}</p>
      <button onClick={() => setLoadError(null)} className="opacity-50 hover:opacity-100 shrink-0 transition-opacity"><FontAwesomeIcon icon={faXmark} className="w-4 h-4" /></button>
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
          <div className="divide-y divide-[var(--color-border)] animate-pulse">
            <div className="flex items-center gap-3 p-4"><div className="skeleton w-10 h-10 rounded-xl" /><div className="flex-1 space-y-2"><div className="skeleton h-4 w-3/4" /><div className="skeleton h-3 w-1/2" /></div><div className="skeleton h-5 w-20" /></div>
            <div className="flex items-center gap-3 p-4"><div className="skeleton w-10 h-10 rounded-xl" /><div className="flex-1 space-y-2"><div className="skeleton h-4 w-2/3" /><div className="skeleton h-3 w-1/3" /></div><div className="skeleton h-5 w-16" /></div>
            <div className="flex items-center gap-3 p-4"><div className="skeleton w-10 h-10 rounded-xl" /><div className="flex-1 space-y-2"><div className="skeleton h-4 w-3/4" /><div className="skeleton h-3 w-1/2" /></div><div className="skeleton h-5 w-24" /></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <FontAwesomeIcon icon={faArrowsUpDown} className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Aucune transaction trouvée</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {groupedTransactions.map(group => (
              <div key={group.date}>
                <div className="flex items-center justify-between px-4 py-2.5" style={{ background: 'var(--color-surface-raised)' }}>
                  <span className="text-label">{group.label}</span>
                  <span className={`text-xs font-medium ${group.total >= 0 ? 'text-[var(--color-pos)]' : 'text-[var(--color-neg)]'}`}>
                    {group.total >= 0 ? '+' : ''}{formatCurrency(group.total)}
                  </span>
                </div>
                <div className="divide-y divide-[var(--color-border)]/50">
                  {group.transactions.map((tx, i) => (
                    <div key={tx.id} className="card-compact hover:shadow-sm transition-shadow animate-slide-in" style={{ animationDelay: `${i * 30}ms`, borderRadius: 0 }}>
                      {/* Mobile: stacked layout */}
                      <div className="md:hidden">
                        <div className="flex items-start gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: tx.type === "income" ? 'var(--color-pos-bg)' : 'var(--color-neg-bg)' }}>
                            <FontAwesomeIcon icon={getIconByKey(tx.category?.icon)} className="w-3.5 h-3.5" style={{ color: tx.type === "income" ? 'var(--color-pos)' : 'var(--color-neg)' }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-ink whitespace-normal break-words flex-1">{tx.description}</p>
                              <span className="text-amount text-sm" style={{ color: tx.type === "income" ? 'var(--color-pos)' : 'var(--color-neg)' }}>
                                {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted mt-0.5">
                              <span>{tx.category?.name || "Non catégorisé"}</span>
                              {tx.scope === "activity" && <span className="inline-flex items-center gap-0.5 font-medium" style={{ color: 'var(--color-gold)' }}><FontAwesomeIcon icon={faBriefcase} className="w-2.5 h-2.5" /> activité</span>}
                              {tx.scope === "personal" && <span className="inline-flex items-center gap-0.5 font-medium" style={{ color: 'var(--color-brand)' }}><FontAwesomeIcon icon={faUser} className="w-2.5 h-2.5" /> personnel</span>}
                            </div>
                            <div className="flex items-center gap-1 mt-1.5">
                              <button onClick={() => openEditModal(tx)} className="btn-ghost p-1.5" title="Modifier">
                                <FontAwesomeIcon icon={faPen} className="w-3 h-3" />
                              </button>
                              <button onClick={() => setConfirmDeleteTx(tx.id)} className="btn-ghost p-1.5 hover:text-[var(--color-neg)]" title="Supprimer">
                                <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Desktop: inline layout */}
                      <div className="hidden md:flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: tx.type === "income" ? 'var(--color-pos-bg)' : 'var(--color-neg-bg)' }}>
                            <FontAwesomeIcon icon={getIconByKey(tx.category?.icon)} className="w-3.5 h-3.5" style={{ color: tx.type === "income" ? 'var(--color-pos)' : 'var(--color-neg)' }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink truncate">{tx.description}</p>
                            <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
                              <span>{tx.category?.name || "Non catégorisé"}</span>
                              <span>·</span>
                              <span>{formatDate(tx.date)}</span>
                              {tx.scope === "activity" && <span className="inline-flex items-center gap-0.5 font-medium" style={{ color: 'var(--color-gold)' }}><FontAwesomeIcon icon={faBriefcase} className="w-3 h-3" /> activité</span>}
                              {tx.scope === "personal" && <span className="inline-flex items-center gap-0.5 font-medium" style={{ color: 'var(--color-brand)' }}><FontAwesomeIcon icon={faUser} className="w-3 h-3" /> personnel</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-amount text-sm" style={{ color: tx.type === "income" ? 'var(--color-pos)' : 'var(--color-neg)' }}>
                            {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                          </span>
                          <button onClick={() => openEditModal(tx)} className="btn-ghost p-1.5" title="Modifier">
                            <FontAwesomeIcon icon={faPen} className="w-3 h-3" />
                          </button>
                          <button onClick={() => setConfirmDeleteTx(tx.id)} className="btn-ghost p-1.5 hover:text-[var(--color-neg)]" title="Supprimer">
                            <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
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
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="btn-ghost text-sm disabled:opacity-30">
            <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
          </button>
          <span className="text-sm text-muted">Page {page + 1} sur {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="btn-ghost text-sm disabled:opacity-30">
            <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mobile — full page */}
      {showModal && (
        <div className="fixed inset-0 z-50 md:hidden bg-[var(--color-bg)] animate-slide-up flex flex-col">
          <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3.5 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
            <button onClick={closeModal} className="w-9 h-9 flex items-center justify-center text-muted hover:text-ink rounded-lg hover:bg-[var(--color-surface-raised)] transition-colors">
              <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 rotate-180" />
            </button>
            <h3 className="text-base font-semibold text-ink">{editTx ? "Modifier" : "Nouvelle transaction"}</h3>
          </div>
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {commercialMode && (
              <div className="flex gap-2">
                <button type="button" onClick={() => setFormData({ ...formData, scope: "personal" })} className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${formData.scope === "personal" ? "bg-[var(--color-brand)] text-white shadow-sm" : "bg-[var(--color-border)] text-muted hover:bg-[var(--color-surface-raised)]"}`}>Personnel</button>
                <button type="button" onClick={() => setFormData({ ...formData, scope: "activity" })} className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${formData.scope === "activity" ? "bg-[var(--color-gold)] text-white shadow-sm" : "bg-[var(--color-border)] text-muted hover:bg-[var(--color-surface-raised)]"}`}>Activité</button>
              </div>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => setFormData({ ...formData, type: "expense", categoryId: "" })} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${formData.type === "expense" ? "bg-[var(--color-neg)] text-white shadow-sm" : "bg-[var(--color-border)] text-muted hover:bg-[var(--color-surface-raised)]"}`}>Dépense</button>
                <button type="button" onClick={() => setFormData({ ...formData, type: "income", categoryId: "" })} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${formData.type === "income" ? "bg-[var(--color-pos)] text-white shadow-sm" : "bg-[var(--color-border)] text-muted hover:bg-[var(--color-surface-raised)]"}`}>Revenu</button>
              </div>
              <div>
                <label className="field-label">Montant</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm font-semibold pointer-events-none">{currency === "XOF" ? "FCFA" : "EUR"}</span>
                  <input type="text" inputMode="numeric" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: formatAmountDisplay(e.target.value) })} className="input-field pl-16" placeholder="ex: 5 000" autoComplete="off" required />
                </div>
              </div>
              <div>
                <label className="field-label">Description</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input-field" placeholder="ex: Achat alimentation" required />
              </div>
              <div>
                <label className="field-label">Catégorie</label>
                <CustomSelect options={categoryOptions} value={formData.categoryId} onChange={(v) => setFormData({ ...formData, categoryId: v })} placeholder="Sélectionner..." />
              </div>
              <div>
                <label className="field-label">Date</label>
                <DatePicker value={formData.date} onChange={(val) => setFormData({ ...formData, date: val })} className="input-field" />
              </div>
              {!editTx && limits && !limits.isPremium && user?.role === "user" && (
                <div className="card-inset" style={{ background: 'var(--color-warn-bg)' }}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium" style={{ color: 'var(--color-warn)' }}>{formData.type === "income" ? "Revenus" : "Dépenses"} ce mois</span>
                    <span className="font-semibold" style={{ color: 'var(--color-warn)' }}>{formData.type === "income" ? limits.incomeCount : limits.expenseCount}/{formData.type === "income" ? limits.maxFreeIncome : limits.maxFreeExpense}</span>
                  </div>
                  {(formData.type === "income" && limits.incomeCount >= limits.maxFreeIncome) || (formData.type === "expense" && limits.expenseCount >= limits.maxFreeExpense) ? (
                    <p className="text-xs" style={{ color: 'var(--color-neg)' }}>Limite mensuelle atteinte. Passez à Premium.</p>
                  ) : (
                    <p className="text-xs" style={{ color: 'var(--color-warn)' }}>{Math.max(0, (formData.type === "income" ? limits.maxFreeIncome : limits.maxFreeExpense) - (formData.type === "income" ? limits.incomeCount : limits.expenseCount))} transaction(s) restante(s)</p>
                  )}
                </div>
              )}
            </div>
            <div className="shrink-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] p-5">
              {txError && <div className="alert-inline neg mb-3"><FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 shrink-0 mt-0.5" /><p>{txError}</p></div>}
              {(() => {
                const atLimit = !editTx && limits && !limits.isPremium && user?.role === "user" && ((formData.type === "income" && limits.incomeCount >= limits.maxFreeIncome) || (formData.type === "expense" && limits.expenseCount >= limits.maxFreeExpense));
                return <button type="submit" disabled={!!atLimit} className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed">{editTx ? "Enregistrer" : "Ajouter"}</button>;
              })()}
            </div>
          </form>
        </div>
      )}
      {/* Desktop modal */}
      {showModal && (
        <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4 bg-black/40 animate-fade-in" onClick={closeModal}>
          <div className="bg-[var(--color-surface)] rounded-2xl w-full max-w-md shadow-xl animate-scale-in max-h-[90vh] flex flex-col overflow-hidden border border-[var(--color-border)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-0">
              <h3 className="text-lg font-semibold text-ink">{editTx ? "Modifier la transaction" : "Nouvelle transaction"}</h3>
              <button onClick={closeModal} className="text-muted hover:text-ink">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {commercialMode && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => setFormData({ ...formData, scope: "personal" })} className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${formData.scope === "personal" ? "bg-[var(--color-brand)] text-white shadow-sm" : "bg-[var(--color-border)] text-muted hover:bg-[var(--color-surface-raised)]"}`}>Personnel</button>
                  <button type="button" onClick={() => setFormData({ ...formData, scope: "activity" })} className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${formData.scope === "activity" ? "bg-[var(--color-gold)] text-white shadow-sm" : "bg-[var(--color-border)] text-muted hover:bg-[var(--color-surface-raised)]"}`}>Activité</button>
                </div>
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setFormData({ ...formData, type: "expense", categoryId: "" })} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${formData.type === "expense" ? "bg-[var(--color-neg)] text-white shadow-sm" : "bg-[var(--color-border)] text-muted hover:bg-[var(--color-surface-raised)]"}`}>Dépense</button>
                  <button type="button" onClick={() => setFormData({ ...formData, type: "income", categoryId: "" })} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${formData.type === "income" ? "bg-[var(--color-pos)] text-white shadow-sm" : "bg-[var(--color-border)] text-muted hover:bg-[var(--color-surface-raised)]"}`}>Revenu</button>
                </div>
                <div>
                  <label className="field-label">Montant</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm font-semibold pointer-events-none">{currency === "XOF" ? "FCFA" : "EUR"}</span>
                    <input type="text" inputMode="numeric" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: formatAmountDisplay(e.target.value) })} className="input-field pl-16" placeholder="ex: 5 000" autoComplete="off" required />
                  </div>
                </div>
                <div>
                  <label className="field-label">Description</label>
                  <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input-field" placeholder="ex: Achat alimentation" required />
                </div>
                <div>
                  <label className="field-label">Catégorie</label>
                  <CustomSelect options={categoryOptions} value={formData.categoryId} onChange={(v) => setFormData({ ...formData, categoryId: v })} placeholder="Sélectionner..." />
                </div>
                <div>
                  <label className="field-label">Date</label>
                  <DatePicker value={formData.date} onChange={(val) => setFormData({ ...formData, date: val })} className="input-field" />
                </div>
                {!editTx && limits && !limits.isPremium && user?.role === "user" && (
                  <div className="card-inset" style={{ background: 'var(--color-warn-bg)' }}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium" style={{ color: 'var(--color-warn)' }}>{formData.type === "income" ? "Revenus" : "Dépenses"} ce mois</span>
                      <span className="font-semibold" style={{ color: 'var(--color-warn)' }}>{formData.type === "income" ? limits.incomeCount : limits.expenseCount}/{formData.type === "income" ? limits.maxFreeIncome : limits.maxFreeExpense}</span>
                    </div>
                    {(formData.type === "income" && limits.incomeCount >= limits.maxFreeIncome) || (formData.type === "expense" && limits.expenseCount >= limits.maxFreeExpense) ? (
                      <p className="text-xs" style={{ color: 'var(--color-neg)' }}>Limite mensuelle atteinte. Passez à Premium.</p>
                    ) : (
                      <p className="text-xs" style={{ color: 'var(--color-warn)' }}>{Math.max(0, (formData.type === "income" ? limits.maxFreeIncome : limits.maxFreeExpense) - (formData.type === "income" ? limits.incomeCount : limits.expenseCount))} transaction(s) restante(s)</p>
                    )}
                  </div>
                )}
              </div>
              <div className="shrink-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] p-5">
                {txError && <div className="alert-inline neg mb-3"><FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 shrink-0 mt-0.5" /><p>{txError}</p></div>}
                {(() => {
                  const atLimit = !editTx && limits && !limits.isPremium && user?.role === "user" && ((formData.type === "income" && limits.incomeCount >= limits.maxFreeIncome) || (formData.type === "expense" && limits.expenseCount >= limits.maxFreeExpense));
                  return <button type="submit" disabled={!!atLimit} className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed">{editTx ? "Enregistrer" : "Ajouter"}</button>;
                })()}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile filter bottom sheet */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 sm:hidden flex flex-col justify-end bg-black/40 animate-fade-in" onClick={() => setShowMobileFilters(false)}>
          <div className="bg-[var(--color-surface)] rounded-t-2xl shadow-xl animate-slide-up max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-5 py-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-ink">Filtres & Tri</h3>
              <button onClick={() => setShowMobileFilters(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-surface-raised)] text-muted">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              {/* Search */}
              <div>
                <label className="field-label">Recherche</label>
                <div className="relative">
                  <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="input-field py-2.5 text-sm" style={{ paddingLeft: "2.25rem", paddingRight: "2.25rem" }} placeholder="Rechercher..." />
                  {searchInput && (
                    <button onClick={() => setSearchInput("")} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-muted hover:text-ink rounded-full">
                      <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Sort */}
              <div>
                <label className="field-label">Trier par</label>
                <div className="flex gap-2">
                  {[{v:"date",l:"Date"},{v:"amount",l:"Montant"},{v:"category",l:"Catégorie"}].map((s) => (
                    <button key={s.v} onClick={() => handleSort(s.v)} className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${sort === s.v ? "bg-[var(--color-brand)] text-white shadow-sm" : "bg-[var(--color-border)] text-muted"}`}>
                      {s.l}
                    </button>
                  ))}
                </div>
                <button onClick={() => setSortOrder(o => o === "asc" ? "desc" : "asc")} className="mt-2 flex items-center gap-1.5 text-xs text-muted hover:text-ink">
                  <FontAwesomeIcon icon={faArrowsUpDown} className={`w-3 h-3 transition-transform ${sortOrder === "asc" ? "rotate-180" : ""}`} />
                  {sortOrder === "asc" ? "Croissant" : "Décroissant"}
                </button>
              </div>

              {/* Type filter */}
              <div>
                <label className="field-label">Type</label>
                <div className="flex gap-2">
                  {[{v:"all",l:"Tous"},{v:"expense",l:"Dépenses"},{v:"income",l:"Revenus"}].map((f) => (
                    <button key={f.v} onClick={() => { setFilter(f.v); setPage(0); }} className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${filter === f.v ? "bg-[var(--color-brand)] text-white shadow-sm" : "bg-[var(--color-border)] text-muted"}`}>
                      {f.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scope filter */}
              {commercialMode && (
                <div>
                  <label className="field-label">Portée</label>
                  <div className="flex gap-2">
                    {[{v:"all",l:"Toutes"},{v:"personal",l:"Personnel"},{v:"activity",l:"Activité"}].map((s) => (
                      <button key={s.v} onClick={() => { setScopeFilter(s.v); setPage(0); }} className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${scopeFilter === s.v ? "bg-[var(--color-brand)] text-white shadow-sm" : "bg-[var(--color-border)] text-muted"}`}>
                        {s.l}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] px-5 py-4">
              <button onClick={() => setShowMobileFilters(false)} className="btn-primary w-full py-3">Appliquer</button>
            </div>
          </div>
        </div>
      )}

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
