"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "../../layout";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faXmark, faTrash, faPen, faStar, faBagShopping, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency, formatDate, convertAmount } from "@/lib/utils";
import CustomSelect from "@/components/ui/CustomSelect";
import PremiumLock from "@/components/subscription/PremiumLock";

type Sale = {
  id: number;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  profit: number;
  date: string;
  product: { id: number; name: string; salePrice: number; purchasePrice: number };
};

type Product = {
  id: number;
  name: string;
  salePrice: number;
  purchasePrice: number;
  stock: number;
};

type Period = "month" | "lastMonth" | "custom";

function getMonthBounds(offset = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  d.setHours(0, 0, 0, 0);
  const start = new Date(d);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  const end = new Date(d);
  return { start, end };
}

function isSaleInRange(sale: Sale, start: Date, end: Date) {
  const d = new Date(sale.date);
  return d >= start && d <= end;
}

export default function SalesPage() {
  const { user, currency, baseCurrency } = useDashboard();
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [premiumLocked, setPremiumLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [formProductId, setFormProductId] = useState("");
  const [formQuantity, setFormQuantity] = useState("1");
  const [formUnitPrice, setFormUnitPrice] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [period, setPeriod] = useState<Period>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [pendingCustomStart, setPendingCustomStart] = useState("");
  const [pendingCustomEnd, setPendingCustomEnd] = useState("");
  const [customDateError, setCustomDateError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null);
  const [deleteMsg, setDeleteMsg] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  function openNewModal() {
    setEditingSale(null);
    setFormProductId("");
    setFormQuantity("1");
    setFormUnitPrice("");
    setFormError("");
    setShowModal(true);
  }

  function openEditModal(sale: Sale) {
    setEditingSale(sale);
    setFormProductId(String(sale.product.id));
    setFormQuantity(String(sale.quantity));
    setFormUnitPrice(String(convertAmount(sale.unitPrice, baseCurrency, currency)));
    setFormError("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingSale(null);
    setFormError("");
  }

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [salesRes, prodRes] = await Promise.all([
        fetch("/api/sales?limit=1000"),
        fetch("/api/products"),
      ]);
      if (!salesRes.ok) throw new Error("Erreur chargement ventes");
      const salesData = await salesRes.json();
      const prodData = await prodRes.json();
      setSales(salesData.sales || []);
      setProducts(prodData.products || []);
    } catch {
      setError("Impossible de charger les ventes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = "Ventes — Akwetche";
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "user") { setPremiumLocked(false); loadData(); return; }
    if (user.subscription?.status === "active" || user.plan === "premium") { setPremiumLocked(false); loadData(); return; }
    if (user.subscription?.status === "expired") { setPremiumLocked(true); return; }
    router.replace("/dashboard");
  }, [user]);

  const periodBounds = useMemo(() => {
    if (period === "month") return getMonthBounds(0);
    if (period === "lastMonth") return getMonthBounds(-1);
    return {
      start: customStart ? new Date(customStart) : new Date(0),
      end: customEnd ? new Date(customEnd) : new Date(864e13),
    };
  }, [period, customStart, customEnd]);

  const filteredSales = useMemo(() => {
    const { start, end } = periodBounds;
    return sales.filter((s) => isSaleInRange(s, start, end));
  }, [sales, periodBounds]);

  const summary = useMemo(() => {
    const revenue = filteredSales.reduce((s, x) => s + x.totalAmount, 0);
    const margin = filteredSales.reduce((s, x) => s + x.profit, 0);
    const count = filteredSales.length;
    const avgBasket = count > 0 ? revenue / count : 0;

    const productData: Record<number, { name: string; qty: number; total: number }> = {};
    for (const s of filteredSales) {
      if (!productData[s.product.id]) productData[s.product.id] = { name: s.product.name, qty: 0, total: 0 };
      productData[s.product.id].qty += s.quantity;
      productData[s.product.id].total += s.totalAmount;
    }
    let topProduct = "";
    let topQty = 0;
    let topTotal = 0;
    for (const key of Object.keys(productData)) {
      const p = productData[Number(key)];
      if (p.qty > topQty) { topQty = p.qty; topProduct = p.name; topTotal = p.total; }
    }

    return { revenue, margin, count, avgBasket, topProduct, topTotal, topQty };
  }, [filteredSales]);

  const selectedProduct = products.find((p) => p.id === parseInt(formProductId));
  const qtyNum = parseInt(formQuantity) || 0;
  const priceNum = parseFloat(formUnitPrice) || convertAmount(selectedProduct?.salePrice || 0, baseCurrency, currency);
  const totalDisplay = qtyNum * priceNum;
  const marginDisplay = selectedProduct ? (priceNum - convertAmount(selectedProduct.purchasePrice, baseCurrency, currency)) * qtyNum : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    const qty = parseInt(formQuantity);
    if (!editingSale && !formProductId) { setFormError("Veuillez sélectionner un produit"); return; }
    if (!qty || qty < 1) { setFormError("Quantité invalide"); return; }
    if (!priceNum || priceNum <= 0) { setFormError("Prix unitaire invalide"); return; }

    setSaving(true);
    try {
      const method = editingSale ? "PATCH" : "POST";
      const amountInBase = convertAmount(priceNum, currency, baseCurrency);
      const body = editingSale
        ? JSON.stringify({ id: editingSale.id, quantity: formQuantity, unitPrice: amountInBase })
        : JSON.stringify({ productId: formProductId, quantity: formQuantity, unitPrice: amountInBase, currency: baseCurrency });

      const res = await fetch("/api/sales", {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || "Erreur"); setSaving(false); return; }

      closeModal();
      loadData();
    } catch {
      setFormError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(sale: Sale) {
    setDeleting(true);
    try {
      const res = await fetch("/api/sales", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sale.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteMsg(data.error || "La suppression via l'API n'est pas encore disponible");
        setDeleting(false);
        return;
      }
      setSales((prev) => prev.filter((s) => s.id !== sale.id));
      setDeleteTarget(null);
      setDeleteMsg("");
    } catch {
      setDeleteMsg("Erreur réseau");
    } finally {
      setDeleting(false);
    }
  }

  const periodOptions = [
    { value: "month", label: "Ce mois" },
    { value: "lastMonth", label: "Mois dernier" },
    { value: "custom", label: "Personnalisé" },
  ];

  if (premiumLocked) return <PremiumLock />;

  function renderForm() {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[11.5px] font-sans font-medium text-text-3 mb-1.5">Produit</label>
          <CustomSelect
            options={products.map((p) => ({
              value: String(p.id),
              label: `${p.name} — ${formatCurrency(p.salePrice, currency)} (${p.stock} dispo)`,
            }))}
            value={formProductId}
            onChange={(v) => {
              setFormProductId(v);
              const p = products.find((x) => x.id === parseInt(v));
              if (p && !formUnitPrice) setFormUnitPrice(String(convertAmount(p.salePrice, baseCurrency, currency)));
            }}
            placeholder="Sélectionner un produit"
          />
        </div>
        <div>
          <label className="block text-[11.5px] font-sans font-medium text-text-3 mb-1.5">Quantité</label>
          <input
            type="number"
            value={formQuantity}
            onChange={(e) => setFormQuantity(e.target.value)}
            className="w-full bg-bg-card border-[1.5px] border-border rounded-xl px-[14px] py-3 text-sm text-text-1 outline-none focus:border-green focus:shadow-[0_0_0_3px_rgba(28,58,47,0.10)]"
            min="1"
            required
          />
        </div>
        <div>
          <label className="block text-[11.5px] font-sans font-medium text-text-3 mb-1.5">Prix unitaire</label>
          <div className="relative">
            <input
              type="number"
              value={formUnitPrice}
              onChange={(e) => setFormUnitPrice(e.target.value)}
              className="w-full bg-bg-card border-[1.5px] border-border rounded-xl pl-[38px] pr-[14px] py-3 text-sm text-text-1 outline-none focus:border-green focus:shadow-[0_0_0_3px_rgba(28,58,47,0.10)]"
              step="0.01"
              min="0"
              required
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-3 pointer-events-none">
              {currency === "EUR" ? "€" : "F"}
            </span>
          </div>
        </div>
        {formProductId && qtyNum > 0 && priceNum > 0 && (
          <div className="bg-bg rounded-xl p-3 text-sm">
            <div className="flex items-center justify-between text-text-3 mb-1">
              <span>Total</span>
              <span className="font-display font-bold text-lg text-text-1">{formatCurrency(totalDisplay, currency)}</span>
            </div>
            <div className="flex items-center justify-between text-text-3">
              <span>Marge estimée</span>
              <span className={`font-semibold ${marginDisplay >= 0 ? "text-teal" : "text-red"}`}>
                {marginDisplay >= 0 ? "+" : ""}{formatCurrency(marginDisplay, currency)}
              </span>
            </div>
            {qtyNum > (selectedProduct?.stock || 0) && (
              <p className="text-red text-xs mt-2 flex items-center gap-1">
                <FontAwesomeIcon icon={faTriangleExclamation} className="w-3 h-3" />
                Stock insuffisant ({selectedProduct?.stock} disponible{selectedProduct?.stock !== 1 ? "s" : ""})
              </p>
            )}
          </div>
        )}
        {formError && <p className="text-red text-sm bg-red-pale p-3 rounded-xl">{formError}</p>}
        <button type="submit" disabled={saving} className="w-full bg-green text-white font-sans font-semibold text-sm py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
          {saving ? "Enregistrement..." : editingSale ? "Modifier la vente" : "Enregistrer"}
        </button>
      </form>
    );
  }

  function renderSaleCard(sale: Sale) {
    const marginRate = sale.totalAmount > 0 ? (sale.profit / sale.totalAmount) * 100 : 0;
    return (
      <div key={sale.id} className="bg-bg-card rounded-[14px] border border-border p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold text-[15px] text-text-1 truncate">{sale.product.name}</p>
            <p className="text-[11.5px] text-text-3 mt-0.5">{formatDate(sale.date)}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0 pl-3">
            <button
              onClick={() => openEditModal(sale)}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-green/30 text-green hover:bg-green/5 transition-colors"
              title="Modifier"
            >
              <FontAwesomeIcon icon={faPen} className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setDeleteTarget(sale); setDeleteMsg(""); }}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-red/30 text-red hover:bg-red-pale transition-colors"
              title="Supprimer"
            >
              <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {/* Metrics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className="bg-bg rounded-xl p-[10px]">
            <p className="text-[9px] font-bold uppercase tracking-widest text-text-3">Qté</p>
            <p className="font-display font-bold text-[15px] text-text-1 mt-0.5">{sale.quantity}</p>
          </div>
          <div className="bg-bg rounded-xl p-[10px]">
            <p className="text-[9px] font-bold uppercase tracking-widest text-text-3">Prix unit.</p>
            <p className="font-display font-bold text-[15px] text-text-1 mt-0.5">{formatCurrency(sale.unitPrice, currency)}</p>
          </div>
          <div className="col-span-2 sm:col-span-1 mx-auto sm:mx-0 w-full bg-gold-pale rounded-xl p-[10px]">
            <p className="text-[9px] font-bold uppercase tracking-widest text-gold/70">Total</p>
            <p className="font-display font-bold text-[15px] text-gold mt-0.5">{formatCurrency(sale.totalAmount, currency)}</p>
          </div>
        </div>
        {/* Margin band */}
        <div className="mt-3 pt-3 border-t border-border">
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${sale.profit >= 0 ? "bg-teal/10 text-teal" : "bg-red-pale text-red"}`}>
            {sale.profit >= 0 ? "+" : ""}{formatCurrency(sale.profit, currency)} de marge · {marginRate.toFixed(0)}%
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-text-1">Ventes</h1>
          <p className="text-text-3 text-sm mt-0.5">{filteredSales.length} vente{filteredSales.length !== 1 ? "s" : ""} · ce mois</p>
        </div>
        <button
          onClick={openNewModal}
          className="inline-flex items-center gap-2 bg-green text-white font-sans font-bold text-[13px] px-[14px] py-[9px] rounded-xl hover:opacity-90 transition-opacity active:scale-95 shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Nouvelle vente
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-pale border border-red/20 rounded-2xl p-4">
          <FontAwesomeIcon icon={faTriangleExclamation} className="w-5 h-5 text-red shrink-0 mt-0.5" />
          <p className="text-sm text-red flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red/60 hover:text-red shrink-0"><FontAwesomeIcon icon={faXmark} className="w-4 h-4" /></button>
        </div>
      )}

      {/* KPI Card */}
      <div className="bg-bg-card rounded-[18px] border border-border p-[18px]">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gold-pale rounded-xl p-3">
            <p className="text-[9.5px] font-bold uppercase tracking-widest text-gold/70">CA du mois</p>
            <p className="font-display font-bold text-[22px] text-gold mt-0.5">{formatCurrency(summary.revenue, currency)}</p>
          </div>
          <div className="bg-bg rounded-xl p-3">
            <p className="text-[9.5px] font-bold uppercase tracking-widest text-text-3">Nb de ventes</p>
            <p className="font-display font-bold text-[22px] text-green mt-0.5">{summary.count}</p>
          </div>
          <div className="bg-teal/10 rounded-xl p-3">
            <p className="text-[9.5px] font-bold uppercase tracking-widest text-teal/70">Marge totale</p>
            <p className="font-display font-bold text-[22px] text-teal mt-0.5">{formatCurrency(summary.margin, currency)}</p>
          </div>
          <div className="bg-bg rounded-xl p-3">
            <p className="text-[9.5px] font-bold uppercase tracking-widest text-text-3">Panier moyen</p>
            <p className="font-display font-bold text-[22px] text-text-1 mt-0.5">{formatCurrency(summary.avgBasket, currency)}</p>
          </div>
        </div>

        {/* Top product */}
        {summary.topProduct && (
          <div className="mt-3 bg-bg rounded-xl p-[14px]">
            <p className="text-[9px] font-bold uppercase tracking-widest text-text-3 flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#C9A84C" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              Produit le plus vendu
            </p>
            <div className="flex items-center justify-between mt-1">
              <p className="font-display font-bold text-base text-text-1 truncate min-w-0">{summary.topProduct}</p>
              <p className="font-display font-bold text-[15px] text-gold shrink-0 ml-3">{formatCurrency(summary.topTotal, currency)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Period pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        {periodOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setPeriod(opt.value as Period);
              if (opt.value === "custom") {
                setPendingCustomStart(customStart);
                setPendingCustomEnd(customEnd);
                setCustomDateError("");
              }
            }}
            className={`px-4 py-[7px] rounded-xl text-[12.5px] font-medium transition-all ${
              period === opt.value
                ? "bg-green text-white font-semibold"
                : "bg-transparent text-text-3 hover:text-text-1"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {period === "custom" && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-2 flex-1">
            <input
              type="date"
              value={pendingCustomStart}
              onChange={(e) => { setPendingCustomStart(e.target.value); setCustomDateError(""); }}
              className="flex-1 min-w-0 bg-bg-card border border-border rounded-xl px-3 py-[7px] text-xs text-text-1 outline-none focus:border-green"
            />
            <span className="text-text-3 text-xs shrink-0">→</span>
            <input
              type="date"
              value={pendingCustomEnd}
              onChange={(e) => { setPendingCustomEnd(e.target.value); setCustomDateError(""); }}
              className="flex-1 min-w-0 bg-bg-card border border-border rounded-xl px-3 py-[7px] text-xs text-text-1 outline-none focus:border-green"
            />
          </div>
          <button
            onClick={() => {
              if (!pendingCustomStart || !pendingCustomEnd) { setCustomDateError("Sélectionnez les dates"); return; }
              if (new Date(pendingCustomEnd) < new Date(pendingCustomStart)) { setCustomDateError("Date de fin antérieure"); return; }
              setCustomStart(pendingCustomStart);
              setCustomEnd(pendingCustomEnd);
              setCustomDateError("");
            }}
            className="bg-green text-white text-xs font-semibold px-3 py-[7px] rounded-xl hover:opacity-90 shrink-0 sm:self-auto"
          >
            Appliquer
          </button>
        </div>
      )}
      {customDateError && <p className="text-red text-xs">{customDateError}</p>}

      {/* Sales list */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-bg-card rounded-[14px] border border-border p-4 space-y-3">
              <div className="flex items-center justify-between"><div className="space-y-1.5"><div className="h-4 w-36 bg-stone/30 rounded-lg" /><div className="h-3 w-20 bg-stone/20 rounded-lg" /></div><div className="flex gap-1"><div className="w-8 h-8 bg-stone/20 rounded-xl" /><div className="w-8 h-8 bg-stone/20 rounded-xl" /></div></div>
              <div className="grid grid-cols-3 gap-2"><div className="h-12 bg-stone/20 rounded-xl" /><div className="h-12 bg-stone/20 rounded-xl" /><div className="h-12 bg-stone/20 rounded-xl" /></div>
            </div>
          ))}
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="bg-bg-card rounded-[18px] border border-border p-8 text-center">
          <FontAwesomeIcon icon={faBagShopping} className="w-10 h-10 text-text-3 mx-auto mb-3" />
          <p className="text-sm text-text-3">Aucune vente pour cette période</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSales.map(renderSaleCard)}
        </div>
      )}

      {/* Bottom sheet (mobile) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={closeModal}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in" />
          <div className="relative bg-white rounded-t-[20px] sm:rounded-2xl w-full sm:max-w-md shadow-xl animate-slide-up sm:animate-scale-in max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-5 py-4 border-b border-border rounded-t-[20px] sm:rounded-t-2xl">
              <h3 className="font-display font-semibold text-base text-text-1">{editingSale ? "Modifier la vente" : "Nouvelle vente"}</h3>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center text-text-3 hover:text-text-1 rounded-lg hover:bg-sand transition-colors">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              {renderForm()}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => { setDeleteTarget(null); setDeleteMsg(""); }}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in" />
          <div className="relative bg-white rounded-t-[20px] w-full max-w-lg shadow-xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-5 pb-2">
              <h3 className="font-display font-bold text-base text-red">Supprimer la vente</h3>
              <p className="text-[13px] text-text-3 mt-1.5 leading-relaxed">
                {deleteTarget.quantity} × {deleteTarget.product.name} — {formatCurrency(deleteTarget.totalAmount, currency)}
              </p>
            </div>
            <div className="p-5 pt-3 space-y-2">
              <button onClick={() => handleDelete(deleteTarget)} disabled={deleting} className="w-full bg-red text-white font-semibold text-sm py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
                {deleting ? "Suppression..." : "Oui, supprimer"}
              </button>
              <button onClick={() => { setDeleteTarget(null); setDeleteMsg(""); }} className="w-full bg-bg text-text-3 font-medium text-sm py-3 rounded-xl border border-border hover:bg-border/30 transition-colors">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red text-white px-5 py-3 rounded-xl shadow-lg text-sm max-w-md text-center">
          {deleteMsg}
          <button onClick={() => setDeleteMsg("")} className="ml-3 text-white/80 hover:text-white">
            <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
