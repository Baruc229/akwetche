"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "../../layout";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBox, faPlus, faTriangleExclamation, faBoxArchive, faArrowsUpDown, faXmark } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency, formatDate } from "@/lib/utils";

type Movement = {
 id: number;
 type: string;
 quantity: number;
 description: string;
 date: string;
 product: { name: string };
};

type Product = {
 id: number;
 name: string;
 stock: number;
 purchasePrice: number;
};

export default function StockPage() {
 const { user } = useDashboard();
 const router = useRouter();
 const [movements, setMovements] = useState<Movement[]>([]);
 const [products, setProducts] = useState<Product[]>([]);
 const [totalStockValue, setTotalStockValue] = useState(0);
 const [outOfStock, setOutOfStock] = useState<Product[]>([]);
 const [loading, setLoading] = useState(true);
 const [showModal, setShowModal] = useState(false);
 const [form, setForm] = useState({ productId: "", type: "in", quantity: "1", description: "" });
 const [error, setError] = useState("");

 async function loadData() {
 setLoading(true);
 try {
 const [stockRes, prodRes] = await Promise.all([
 fetch("/api/stock"),
 fetch("/api/products"),
 ]);
 const stockData = await stockRes.json();
 const prodData = await prodRes.json();
 setMovements(stockData.movements || []);
 setTotalStockValue(stockData.totalStockValue || 0);
 setOutOfStock(stockData.outOfStock || []);
 setProducts(prodData.products || []);
 } catch (e) {
 console.error(e);
 } finally {
 setLoading(false);
 }
 }

 useEffect(() => {
 if (user && user.role === "user" && user.subscription?.status !== "active" && user.plan !== "premium") {
 router.replace("/dashboard");
 return;
 }
 loadData();
 }, [user]);

 async function handleSubmit(e: React.FormEvent) {
 e.preventDefault();
 setError("");
 try {
 const res = await fetch("/api/stock", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify(form),
 });
 const data = await res.json();
 if (!res.ok) {
 setError(data.error || "Erreur");
 return;
 }
 setShowModal(false);
 setForm({ productId: "", type: "in", quantity: "1", description: "" });
 loadData();
 } catch {
 setError("Erreur");
 }
 }

 if (loading) {
 return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" /></div>;
 }

 return (
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-ink">Gestion du stock</h1>
 <p className="text-muted text-sm mt-0.5">{products.length} produit{products.length !== 1 ? "s" : ""}</p>
 </div>
 <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
 <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
 Mouvement de stock
 </button>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div className="card p-5">
 <p className="stat-label">Valeur totale du stock</p>
 <p className="stat-value text-forest">{formatCurrency(totalStockValue)}</p>
 </div>
 <div className="card p-5">
 <p className="stat-label">Produits en stock</p>
 <p className="stat-value text-ink">{products.filter(p => p.stock > 0).length}</p>
 </div>
 <div className="card p-5">
 <p className="stat-label">Produits en rupture</p>
 <p className={`stat-value ${outOfStock.length > 0 ? "text-red-500" : "text-ink"}`}>{outOfStock.length}</p>
 </div>
 </div>

 {outOfStock.length > 0 && (
 <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
 <FontAwesomeIcon icon={faTriangleExclamation} className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
 <div>
 <p className="text-sm font-medium text-red-800">Produits en rupture de stock</p>
 <p className="text-sm text-red-700 mt-1">{outOfStock.map(p => p.name).join(", ")}</p>
 </div>
 </div>
 )}

 <div className="card">
 <h2 className="text-sm font-semibold text-ink p-4 pb-0">Historique des mouvements</h2>
 {movements.length === 0 ? (
 <div className="text-center py-12 text-muted">
 <FontAwesomeIcon icon={faBoxArchive} className="w-10 h-10 mx-auto mb-3 opacity-50" />
 <p className="text-sm">Aucun mouvement</p>
 </div>
 ) : (
 <div className="divide-y divide-border mt-3">
 {movements.map((m, i) => (
 <div key={m.id} className="flex items-center justify-between p-4 hover:bg-sand transition-colors animate-slide-in" style={{ animationDelay: `${i * 30}ms` }}>
 <div className="flex items-center gap-3">
 <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.type === "in" ? "bg-ochre-light" : "bg-ochre-light"}`}>
 <FontAwesomeIcon icon={faArrowsUpDown} className={`w-5 h-5 ${m.type === "in" ? "text-forest" : "text-ochre"}`} />
 </div>
 <div>
 <p className="text-sm font-medium text-ink">{m.product?.name}</p>
 <p className="text-xs text-muted">{m.description || (m.type === "in" ? "Entrée" : "Sortie")} · {formatDate(m.date)}</p>
 </div>
 </div>
 <span className={`text-sm font-semibold ${m.type === "in" ? "text-forest" : "text-ochre"}`}>
 {m.type === "in" ? "+" : "-"}{m.quantity}
 </span>
 </div>
 ))}
 </div>
 )}
 </div>

 {showModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
 <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-scale-in">
 <div className="flex items-center justify-between mb-5">
 <h3 className="text-lg font-semibold text-ink">Mouvement de stock</h3>
 <button onClick={() => setShowModal(false)} className="text-muted hover:text-muted"><FontAwesomeIcon icon={faXmark} className="w-4 h-4" /></button>
 </div>
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label className="block text-sm text-muted mb-1">Produit</label>
 <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} className="input-field" required>
 <option value="">Sélectionner...</option>
 {products.map((p) => (
 <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
 ))}
 </select>
 </div>
 <div className="flex gap-2">
 <button type="button" onClick={() => setForm({ ...form, type: "in" })} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${form.type === "in" ? "bg-forest text-white shadow-sm" : "bg-border text-muted hover:bg-sand"}`}>Entrée</button>
 <button type="button" onClick={() => setForm({ ...form, type: "out" })} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${form.type === "out" ? "bg-ochre text-white shadow-sm" : "bg-border text-muted hover:bg-sand"}`}>Sortie</button>
 </div>
 <div>
 <label className="block text-sm text-muted mb-1">Quantité</label>
 <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="input-field" min="1" required />
 </div>
 <div>
 <label className="block text-sm text-muted mb-1">Description (optionnelle)</label>
 <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" />
 </div>
 {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</p>}
 <button type="submit" className="btn-primary w-full py-3">Enregistrer</button>
 </form>
 </div>
 </div>
 )}
 </div>
 );
}
