"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Plus, ShoppingBag } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type Sale = {
  id: number;
  quantity: number;
  totalAmount: number;
  profit: number;
  date: string;
  product: { name: string; salePrice: number };
};

type Product = {
  id: number;
  name: string;
  salePrice: number;
  stock: number;
};

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ productId: "", quantity: "1" });
  const [error, setError] = useState("");

  async function loadSales() {
    setLoading(true);
    try {
      const [salesRes, prodRes] = await Promise.all([
        fetch("/api/sales?limit=100"),
        fetch("/api/products"),
      ]);
      const salesData = await salesRes.json();
      const prodData = await prodRes.json();
      setSales(salesData.sales || []);
      setProducts(prodData.products || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSales();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/sales", {
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
      setForm({ productId: "", quantity: "1" });
      loadSales();
    } catch {
      setError("Erreur");
    }
  }

  const totalRevenue = sales.reduce((s, sale) => s + sale.totalAmount, 0);
  const totalProfit = sales.reduce((s, sale) => s + sale.profit, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Ventes</h1>
          <p className="text-stone-500 text-sm mt-0.5">{sales.length} vente{sales.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          Nouvelle vente
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="stat-label">Chiffre d'affaires</p>
          <p className="stat-value text-emerald-600">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="card p-5">
          <p className="stat-label">Bénéfice total</p>
          <p className="stat-value text-teal-600">{formatCurrency(totalProfit)}</p>
        </div>
        <div className="card p-5">
          <p className="stat-label">Marge moyenne</p>
          <p className="stat-value text-stone-800">
            {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0"}%
          </p>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Aucune vente enregistrée</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {sales.map((sale, i) => (
              <div key={sale.id} className="flex items-center justify-between p-4 hover:bg-stone-50 transition-colors animate-slide-in" style={{ animationDelay: `${i * 30}ms` }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-800">{sale.product?.name}</p>
                    <p className="text-xs text-stone-400">{sale.quantity} unité{sale.quantity !== 1 ? "s" : ""} · {formatDate(sale.date)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-stone-800">{formatCurrency(sale.totalAmount)}</p>
                  <p className="text-xs text-emerald-600">+{formatCurrency(sale.profit)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-stone-900">Nouvelle vente</h3>
              <button onClick={() => setShowModal(false)} className="text-stone-400 hover:text-stone-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-stone-600 mb-1">Produit</label>
                <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} className="input-field" required>
                  <option value="">Sélectionner...</option>
                  {products.filter(p => p.stock > 0).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatCurrency(p.salePrice)} ({p.stock} dispo)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-stone-600 mb-1">Quantité</label>
                <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="input-field" min="1" required />
              </div>
              {form.productId && (() => {
                const p = products.find(x => x.id === parseInt(form.productId));
                if (!p) return null;
                const qty = parseInt(form.quantity) || 1;
                return (
                  <div className="bg-teal-50 p-3 rounded-xl text-sm space-y-1">
                    <p className="text-teal-700">
                      Prix unitaire : <strong>{formatCurrency(p.salePrice)}</strong>
                    </p>
                    <p className="text-teal-700">
                      Total : <strong>{formatCurrency(p.salePrice * qty)}</strong>
                    </p>
                  </div>
                );
              })()}
              {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</p>}
              <button type="submit" className="btn-primary w-full py-3">Enregistrer la vente</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
