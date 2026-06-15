"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "../../layout";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowsUpDown, faArrowTrendUp, faArrowTrendDown, faPlus, faTrash, faFilter, faArrowLeft, faArrowRight, faBriefcase, faUser, faXmark, faPen, faSearch, faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency, formatDate } from "@/lib/utils";
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

const CATEGORY_COLORS = [
  '#4A90D9', '#9B59B6', '#E74C6F', '#1ABC9C',
  '#E67E22', '#3498DB', '#8E44AD', '#16A085',
];

export default function TransactionsPage() {
  const { user } = useDashboard();
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
  const [limits, setLimits] = useState<{
    isPremium: boolean;
    incomeCount: number;
    expenseCount: number;
    maxFreeIncome: number;
    maxFreeExpense: number;
  } | null>(null);

  const [confirmDeleteTx, setConfirmDeleteTx] = useState<number | null>(null);

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
      setLimits(limitsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

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
      categoryId: String(tx.category.id),
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
    } catch { /* ignore */ }
  }

  function handleSort(field: string) {
    if (sort === field) { setSortOrder(sortOrder === "desc" ? "asc" : "desc"); }
    else { setSort(field); setSortOrder("desc"); }
    setPage(0);
  }

  function handleFilterChange(f: string) { setFilter(f); setPage(0); }
  function handleScopeChange(s: string) { setScopeFilter(s); setPage(0); }
  function handlePeriodChange(p: string) { setPeriod(p); setPage(0); }

  function getCategoryColor(categoryId: number): string {
    return CATEGORY_COLORS[(categoryId - 1) % CATEGORY_COLORS.length];
  }

  const totalPages = Math.ceil(total / limit);
  const totalIncome = (summary.personal?.income || 0) + (summary.activity?.income || 0);
  const totalExpense = (summary.personal?.expense || 0) + (summary.activity?.expense || 0);
  const netBalance = totalIncome - totalExpense;

  const categoryOptions = categories
    .filter((c: any) => c.type === formData.type)
    .map((c: any) => ({ value: String(c.id), label: c.name }));

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

      {/* Type / Scope Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {["all", "income", "expense"].map((f) => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f ? "bg-ochre-light text-forest" : "text-muted hover:bg-border"}`}
          >
            {f === "all" ? "Tout" : f === "income" ? "Revenus" : "Dépenses"}
          </button>
        ))}
        <span className="w-px h-5 bg-border mx-1" />
        {["all", "personal", "activity"].map((s) => (
          <button
            key={s}
            onClick={() => handleScopeChange(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${scopeFilter === s ? (s === "activity" ? "bg-ochre-light text-ochre" : "bg-ochre-light text-forest") : "text-muted hover:bg-border"}`}
          >
            {s === "all" ? "Tous" : s === "personal" ? "Personnel" : "Activité"}
          </button>
        ))}
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
          <div className="flex items-center gap-2">
            <input type="date" value={customStart} onChange={(e) => { setCustomStart(e.target.value); setPage(0); }} className="input-field text-xs py-1.5 px-2 w-32" />
            <span className="text-xs text-muted">au</span>
            <input type="date" value={customEnd} onChange={(e) => { setCustomEnd(e.target.value); setPage(0); }} className="input-field text-xs py-1.5 px-2 w-32" />
          </div>
        )}
      </div>

      {/* Search & Sort */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="input-field pl-9 pr-3 py-2 text-sm" placeholder="Rechercher..." />
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
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-forest border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <FontAwesomeIcon icon={faArrowsUpDown} className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Aucune transaction trouvée</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {transactions.map((tx, i) => (
              <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-sand transition-colors animate-slide-in" style={{ animationDelay: `${i * 30}ms` }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getCategoryColor(tx.category?.id || 0) }} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{tx.description}</p>
                    <p className="text-xs text-muted">
                      {tx.category?.name} · {formatDate(tx.date)}
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

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-ink">{editTx ? "Modifier la transaction" : "Nouvelle transaction"}</h3>
              <button onClick={closeModal} className="text-muted hover:text-muted">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                <button type="button" onClick={() => setFormData({ ...formData, scope: "personal" })} className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${formData.scope === "personal" ? "bg-forest text-white shadow-sm" : "bg-border text-muted hover:bg-sand"}`}>Personnel</button>
                <button type="button" onClick={() => setFormData({ ...formData, scope: "activity" })} className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${formData.scope === "activity" ? "bg-ochre text-white shadow-sm" : "bg-border text-muted hover:bg-sand"}`}>Activité</button>
              </div>
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
      <button onClick={openAddModal} className="fixed bottom-20 right-4 z-40 lg:hidden w-14 h-14 bg-forest text-white rounded-full shadow-lg flex items-center justify-center hover:bg-forest-light transition-colors animate-fade-in">
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
