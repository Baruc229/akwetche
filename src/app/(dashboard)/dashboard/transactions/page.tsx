"use client";

import { useState, useEffect } from "react";
import {
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Filter,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  User,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import ConfirmModal from "@/components/ConfirmModal";

type Transaction = {
  id: number;
  type: string;
  amount: number;
  description: string;
  date: string;
  scope: string;
  category: { name: string; icon: string };
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [newTx, setNewTx] = useState({
    type: "expense",
    amount: "",
    description: "",
    categoryId: "",
    scope: "personal",
  });
  const [txError, setTxError] = useState("");
  const [confirmDeleteTx, setConfirmDeleteTx] = useState<number | null>(null);
  const limit = 20;

  async function loadTransactions() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(page * limit),
      });
      if (filter !== "all") params.set("type", filter);
      if (scopeFilter !== "all") params.set("scope", scopeFilter);

      const [txRes, catRes] = await Promise.all([
        fetch(`/api/transactions?${params}`),
        fetch("/api/categories"),
      ]);
      const txData = await txRes.json();
      const catData = await catRes.json();
      setTransactions(txData.transactions || []);
      setTotal(txData.total || 0);
      setCategories(catData.categories || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, [page, filter, scopeFilter]);

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
      loadTransactions();
    } catch {
      setTxError("Erreur");
    }
  }

  async function handleDelete(id: number) {
    setConfirmDeleteTx(null);
    await fetch("/api/transactions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadTransactions();
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Transactions</h1>
          <p className="text-stone-500 text-sm mt-0.5">
            {total} transaction{total !== 1 ? "s" : ""} au total
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {["all", "income", "expense"].map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setPage(0);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f
                ? "bg-emerald-100 text-emerald-700"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {f === "all" ? "Tout" : f === "income" ? "Revenus" : "Dépenses"}
          </button>
        ))}
        <span className="w-px h-5 bg-stone-200 mx-1" />
        {["all", "personal", "activity"].map((s) => (
          <button
            key={s}
            onClick={() => {
              setScopeFilter(s);
              setPage(0);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              scopeFilter === s
                ? s === "activity"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
                : "text-stone-500 hover:bg-stone-100"
            }`}
          >
            {s === "all" ? "Tous" : s === "personal" ? "Personnel" : "Activité"}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <ArrowUpDown className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Aucune transaction trouvée</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {transactions.map((tx, i) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 hover:bg-stone-50 transition-colors animate-slide-in"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      tx.type === "income" ? "bg-teal-100" : "bg-amber-100"
                    }`}
                  >
                    {tx.type === "income" ? (
                      <TrendingUp className="w-5 h-5 text-teal-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-800">
                      {tx.description}
                    </p>
                    <p className="text-xs text-stone-400">
                      {tx.category?.name} · {formatDate(tx.date)}
                      {tx.scope === "activity" && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 text-amber-500 font-medium">
                          <Briefcase className="w-3 h-3" /> activité
                        </span>
                      )}
                      {tx.scope === "personal" && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 text-emerald-500 font-medium">
                          <User className="w-3 h-3" /> personnel
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-semibold ${
                      tx.type === "income" ? "text-teal-600" : "text-amber-600"
                    }`}
                  >
                    {tx.type === "income" ? "+" : "-"}
                    {formatCurrency(tx.amount)}
                  </span>
                  <button
                    onClick={() => setConfirmDeleteTx(tx.id)}
                    className="text-stone-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="btn-secondary text-sm disabled:opacity-30"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-stone-500">
            Page {page + 1} sur {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="btn-secondary text-sm disabled:opacity-30"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

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
                <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{txError}</p>
              )}
              <button type="submit" className="btn-primary w-full py-3">
                Ajouter
              </button>
            </form>
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
