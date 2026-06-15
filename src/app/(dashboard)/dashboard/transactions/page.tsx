"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "../../layout";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowsUpDown, faArrowTrendUp, faArrowTrendDown, faPlus, faTrash, faFilter, faArrowLeft, faArrowRight, faBriefcase, faUser, faXmark } from '@fortawesome/free-solid-svg-icons';
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
 const { user } = useDashboard();
 const router = useRouter();
 const [transactions, setTransactions] = useState<Transaction[]>([]);
 const [total, setTotal] = useState(0);
 const [loading, setLoading] = useState(true);
 const [page, setPage] = useState(0);
 const [filter, setFilter] = useState("all");
 const [scopeFilter, setScopeFilter] = useState("all");
 const [showModal, setShowModal] = useState(false);
 const [categories, setCategories] = useState<any[]>([]);
 const [limits, setLimits] = useState<{
 isPremium: boolean;
 incomeCount: number;
 expenseCount: number;
 maxFreeIncome: number;
 maxFreeExpense: number;
 } | null>(null);
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
 }, [page, filter, scopeFilter]);

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
 <h1 className="text-2xl font-bold text-ink">Transactions</h1>
 <p className="text-muted text-sm mt-0.5">
 {total} transaction{total !== 1 ? "s" : ""} au total
 </p>
 </div>
 <button
 onClick={() => setShowModal(true)}
 className="btn-primary flex items-center gap-2 text-sm"
 >
 <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
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
 ? "bg-ochre-light text-forest"
 : "text-muted hover:bg-border"
 }`}
 >
 {f === "all" ? "Tout" : f === "income" ? "Revenus" : "Dépenses"}
 </button>
 ))}
 <span className="w-px h-5 bg-border mx-1" />
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
 ? "bg-ochre-light text-ochre"
 : "bg-ochre-light text-forest"
 : "text-muted hover:bg-border"
 }`}
 >
 {s === "all" ? "Tous" : s === "personal" ? "Personnel" : "Activité"}
 </button>
 ))}
 </div>

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
 <div
 key={tx.id}
 className="flex items-center justify-between p-4 hover:bg-sand transition-colors animate-slide-in"
 style={{ animationDelay: `${i * 30}ms` }}
 >
 <div className="flex items-center gap-3">
 <div
 className={`w-10 h-10 rounded-xl flex items-center justify-center ${
 tx.type === "income" ? "bg-ochre-light" : "bg-ochre-light"
 }`}
 >
 {tx.type === "income" ? (
 <FontAwesomeIcon icon={faArrowTrendUp} className="w-5 h-5 text-forest-light" />
 ) : (
 <FontAwesomeIcon icon={faArrowTrendDown} className="w-5 h-5 text-ochre" />
 )}
 </div>
 <div>
 <p className="text-sm font-medium text-ink">
 {tx.description}
 </p>
 <p className="text-xs text-muted">
 {tx.category?.name} · {formatDate(tx.date)}
 {tx.scope === "activity" && (
 <span className="ml-1.5 inline-flex items-center gap-0.5 text-ochre font-medium">
 <FontAwesomeIcon icon={faBriefcase} className="w-3 h-3" /> activité
 </span>
 )}
 {tx.scope === "personal" && (
 <span className="ml-1.5 inline-flex items-center gap-0.5 text-forest font-medium">
 <FontAwesomeIcon icon={faUser} className="w-3 h-3" /> personnel
 </span>
 )}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <span
 className={`text-sm font-semibold ${
 tx.type === "income" ? "text-forest-light" : "text-ochre"
 }`}
 >
 {tx.type === "income" ? "+" : "-"}
 {formatCurrency(tx.amount)}
 </span>
 <button
 onClick={() => setConfirmDeleteTx(tx.id)}
 className="text-muted hover:text-red-500 transition-colors"
 >
 <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
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
 <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
 </button>
 <span className="text-sm text-muted">
 Page {page + 1} sur {totalPages}
 </span>
 <button
 onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
 disabled={page >= totalPages - 1}
 className="btn-secondary text-sm disabled:opacity-30"
 >
 <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" />
 </button>
 </div>
 )}

 {showModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
 <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-scale-in">
 <div className="flex items-center justify-between mb-5">
 <h3 className="text-lg font-semibold text-ink">
 Nouvelle transaction
 </h3>
 <button
 onClick={() => setShowModal(false)}
                className="text-muted hover:text-muted"
              >
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
 </div>
 <form onSubmit={handleAddTransaction} className="space-y-4">
 <div className="flex gap-2">
 <button
 type="button"
 onClick={() => setNewTx({ ...newTx, scope: "personal" })}
 className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
 newTx.scope === "personal"
 ? "bg-forest text-white shadow-sm"
 : "bg-border text-muted hover:bg-sand"
 }`}
 >
 Personnel
 </button>
 <button
 type="button"
 onClick={() => setNewTx({ ...newTx, scope: "activity" })}
 className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
 newTx.scope === "activity"
 ? "bg-ochre text-white shadow-sm"
 : "bg-border text-muted hover:bg-sand"
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
 ? "bg-ochre text-white shadow-sm"
 : "bg-border text-muted hover:bg-sand"
 }`}
 >
 Dépense
 </button>
 <button
 type="button"
 onClick={() => setNewTx({ ...newTx, type: "income" })}
 className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
 newTx.type === "income"
 ? "bg-forest-light text-white shadow-sm"
 : "bg-border text-muted hover:bg-sand"
 }`}
 >
 Revenu
 </button>
 </div>
 <div>
 <label className="block text-sm text-muted mb-1">Montant</label>
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
 <label className="block text-sm text-muted mb-1">Description</label>
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
 <label className="block text-sm text-muted mb-1">Catégorie</label>
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
 {limits && !limits.isPremium && user?.role === "user" && (
 <div className="p-3 bg-ochre-light rounded-xl">
 <div className="flex items-center justify-between text-xs mb-1">
 <span className="font-medium text-ochre">
 {newTx.type === "income" ? "Revenus" : "Dépenses"} ce mois
 </span>
 <span className="font-semibold text-ochre">
 {newTx.type === "income" ? limits.incomeCount : limits.expenseCount}/{newTx.type === "income" ? limits.maxFreeIncome : limits.maxFreeExpense}
 </span>
 </div>
 {(newTx.type === "income" && limits.incomeCount >= limits.maxFreeIncome) ||
 (newTx.type === "expense" && limits.expenseCount >= limits.maxFreeExpense) ? (
 <p className="text-xs text-red-600">Limite mensuelle atteinte. Passez à Premium.</p>
 ) : (
 <p className="text-xs text-ochre">
 {Math.max(0, (newTx.type === "income" ? limits.maxFreeIncome : limits.maxFreeExpense) - (newTx.type === "income" ? limits.incomeCount : limits.expenseCount))} transaction(s) restante(s)
 </p>
 )}
 </div>
 )}
 {txError && (
 <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{txError}</p>
 )}
 {(() => {
 const atLimit = limits && !limits.isPremium && user?.role === "user" && (
 (newTx.type === "income" && limits.incomeCount >= limits.maxFreeIncome) ||
 (newTx.type === "expense" && limits.expenseCount >= limits.maxFreeExpense)
 );
 return (
 <button type="submit" disabled={!!atLimit} className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed">
 Ajouter
 </button>
 );
 })()}
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
