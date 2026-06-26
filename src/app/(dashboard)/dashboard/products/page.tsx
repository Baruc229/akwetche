"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "../../layout";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen, faTrash, faXmark, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency, convertAmount, detectBaseCurrency } from "@/lib/utils";
import ConfirmModal from "@/components/ConfirmModal";
import PremiumLock from "@/components/subscription/PremiumLock";

type Product = {
  id: number;
  name: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  description?: string;
};

type SortKey = "name" | "salePrice" | "margin" | "stock";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name", label: "Nom" },
  { value: "salePrice", label: "Prix vente" },
  { value: "margin", label: "Marge" },
  { value: "stock", label: "Stock" },
];

const CARD_COLORS = ["bg-gold-pale", "bg-teal/10", "bg-red-pale", "bg-[#E8F4FD]", "bg-[#F0EBF8]"];

function getCardColor(name: string, index: number) {
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return CARD_COLORS[hash % CARD_COLORS.length];
}

function StockBar({ stock }: { stock: number }) {
  let color: string, label: string;
  if (stock === 0) {
    color = "bg-red";
    label = "Stock critique — réapprovisionner";
  } else if (stock <= 5) {
    color = "bg-gold";
    label = "Stock faible — surveiller";
  } else {
    color = "bg-teal";
    label = "Stock correct";
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-3 shrink-0">Stock</span>
        <span className={`text-xs font-bold font-display ${color.replace("bg-", "text-")} truncate text-right`}>
          {stock}
        </span>
      </div>
      <div className="h-[5px] bg-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-300`} style={{ width: `${stock > 0 ? 100 : 0}%` }} />
      </div>
      <p className={`text-[10.5px] font-semibold mt-1 ${color.replace("bg-", "text-")} truncate`}>
        {label}
      </p>
    </div>
  );
}

export default function ProductsPage() {
  const { user, currency } = useDashboard();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [premiumLocked, setPremiumLocked] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    purchasePrice: "",
    salePrice: "",
    stock: "",
  });
  const [error, setError] = useState("");
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortOpen, setSortOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function loadProducts() {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data.products || []);
    } catch (e) {
      setLoadError("Impossible de charger les produits.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = "Produits — Akwetche";
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "user") { setPremiumLocked(false); loadProducts(); return; }
    if (user.subscription?.status === "active" || user.plan === "premium") { setPremiumLocked(false); loadProducts(); return; }
    if (user.subscription?.status === "expired") { setPremiumLocked(true); return; }
    router.replace("/dashboard");
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function openCreate() {
    setEditProduct(null);
    setForm({ name: "", description: "", purchasePrice: "", salePrice: "", stock: "" });
    setError("");
    setShowModal(true);
  }

  function openEdit(product: Product) {
    setEditProduct(product);
    const baseCur = detectBaseCurrency();
    const displayPurchasePrice = baseCur && baseCur !== currency
      ? convertAmount(product.purchasePrice, baseCur, currency)
      : product.purchasePrice;
    const displaySalePrice = baseCur && baseCur !== currency
      ? convertAmount(product.salePrice, baseCur, currency)
      : product.salePrice;
    setForm({
      name: product.name,
      description: product.description || "",
      purchasePrice: String(displayPurchasePrice),
      salePrice: String(displaySalePrice),
      stock: String(product.stock),
    });
    setError("");
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Le nom du produit est requis");
      return;
    }

    const baseCur = detectBaseCurrency();
    const purchasePrice = baseCur && baseCur !== currency
      ? convertAmount(parseFloat(form.purchasePrice || "0"), currency, baseCur)
      : form.purchasePrice;
    const salePrice = baseCur && baseCur !== currency
      ? convertAmount(parseFloat(form.salePrice || "0"), currency, baseCur)
      : form.salePrice;

    const method = editProduct ? "PUT" : "POST";
    const body: Record<string, unknown> = editProduct
      ? { id: editProduct.id, name: form.name, purchasePrice: String(purchasePrice), salePrice: String(salePrice) }
      : { name: form.name, purchasePrice: String(purchasePrice), salePrice: String(salePrice), stock: form.stock };

    try {
      const res = await fetch("/api/products", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        return;
      }
      setShowModal(false);
      loadProducts();
    } catch {
      setError("Erreur");
    }
  }

  async function handleDelete(id: number) {
    setConfirmDeleteProduct(null);
    await fetch("/api/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadProducts();
  }

  const purchasePriceNum = parseFloat(form.purchasePrice) || 0;
  const salePriceNum = parseFloat(form.salePrice) || 0;
  const liveMargin = salePriceNum - purchasePriceNum;
  const liveMarginRate = salePriceNum > 0 ? ((liveMargin / salePriceNum) * 100) : 0;

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    switch (sortKey) {
      case "name": return a.name.localeCompare(b.name);
      case "salePrice": return b.salePrice - a.salePrice;
      case "margin": {
        const mA = a.salePrice - a.purchasePrice;
        const mB = b.salePrice - b.purchasePrice;
        return mB - mA;
      }
      case "stock": return a.stock - b.stock;
      default: return 0;
    }
  });

  const sortLabel = SORT_OPTIONS.find(o => o.value === sortKey)?.label || "Nom";

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2"><div className="h-7 w-28 bg-stone/30 rounded-lg" /><div className="h-4 w-36 bg-stone/20 rounded-lg" /></div>
          <div className="h-10 w-28 bg-stone/30 rounded-xl" />
        </div>
        <div className="h-11 w-full bg-stone/20 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-[18px] border border-border p-[18px] space-y-4">
              <div className="flex items-center gap-3"><div className="w-11 h-11 bg-stone/30 rounded-xl" /><div className="space-y-2"><div className="h-4 w-24 bg-stone/30 rounded-lg" /><div className="h-3 w-16 bg-stone/20 rounded-lg" /></div></div>
              <div className="grid grid-cols-3 gap-2"><div className="h-14 bg-stone/20 rounded-xl" /><div className="h-14 bg-stone/20 rounded-xl" /><div className="h-14 bg-stone/20 rounded-xl" /></div>
              <div className="space-y-2"><div className="h-3 w-full bg-stone/20 rounded-full" /><div className="h-3 w-3/4 bg-stone/20 rounded-lg" /></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (premiumLocked) return <PremiumLock />;

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink">Produits</h1>
          <p className="text-text-3 text-sm mt-0.5">
            {products.length} produit{products.length !== 1 ? "s" : ""} · catalogue actif
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-green text-white font-sans font-bold text-[13px] px-4 py-[10px] rounded-xl hover:opacity-90 transition-opacity active:scale-95"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Ajouter
        </button>
      </div>

      {loadError && (
        <div className="flex items-start gap-3 bg-red-pale border border-red/20 rounded-2xl p-4 animate-fade-in">
          <FontAwesomeIcon icon={faTriangleExclamation} className="w-5 h-5 text-red shrink-0 mt-0.5" />
          <p className="text-sm text-red flex-1">{loadError}</p>
          <button onClick={() => setLoadError(null)} className="text-red/50 hover:text-red shrink-0"><FontAwesomeIcon icon={faXmark} className="w-4 h-4" /></button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher un produit…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-bg-card border-[1.5px] border-border rounded-xl py-[9px] pl-[38px] pr-3 text-sm text-text-1 outline-none transition-[border-color] focus:border-green placeholder:text-text-3"
          />
          {searchInput && (
            <button onClick={() => { setSearchInput(""); setSearch(""); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-text-3 hover:text-text-1 rounded-full hover:bg-border/50 transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <button
            onClick={() => setSortOpen(!sortOpen)}
            className="flex items-center gap-2 bg-bg-card border-[1.5px] border-border rounded-xl px-3 py-[9px] w-[125px] text-sm text-ink font-medium hover:bg-border/20 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="20" y2="12" />
              <line x1="12" y1="18" x2="20" y2="18" />
            </svg>
            <span className="flex-1 text-left truncate">{sortLabel}</span>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${sortOpen ? "rotate-180" : ""}`}>
              <path d="M1 1.5l4 4 4-4" />
            </svg>
          </button>
          {sortOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 w-[140px] bg-white border border-border rounded-xl shadow-lg py-1 animate-fade-in">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSortKey(opt.value); setSortOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${sortKey === opt.value ? "text-green font-semibold bg-green/5" : "text-ink hover:bg-sand"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Products */}
      {products.length === 0 && !search ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-bg-card rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-border">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-3">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <h3 className="font-display font-bold text-base text-ink">Aucun produit pour l&apos;instant</h3>
          <p className="text-text-3 text-sm mt-1.5 max-w-[240px]">
            Ajoutez votre premier produit pour suivre vos stocks et marges.
          </p>
          <button
            onClick={openCreate}
            className="mt-5 inline-flex items-center gap-2 bg-green text-white font-sans font-bold text-[13px] px-5 py-[10px] rounded-xl hover:opacity-90 transition-opacity"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Ajouter un produit
          </button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-text-3 text-sm">Aucun produit trouvé pour &quot;{search}&quot;</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {sorted.map((p, idx) => {
              const margin = p.salePrice - p.purchasePrice;
            const marginRate = p.salePrice > 0 ? (margin / p.salePrice) * 100 : 0;
            const cardBg = getCardColor(p.name, idx);
            const initial = p.name.charAt(0).toUpperCase();

            let marginCellBg: string, marginText: string;
            if (margin < 0) {
              marginCellBg = "bg-red-pale";
              marginText = "text-red";
            } else if (marginRate < 30) {
              marginCellBg = "bg-gold-pale";
              marginText = "text-gold";
            } else {
              marginCellBg = "bg-teal/10";
              marginText = "text-teal";
            }

            return (
              <div key={p.id} className="bg-bg-card rounded-[18px] border border-border p-[18px] animate-fade-in">
                {/* Card header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-11 h-11 rounded-xl ${cardBg} flex items-center justify-center shrink-0`}>
                      <span className="font-display font-extrabold text-lg text-green">{initial}</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display font-bold text-[17px] text-text-1 leading-tight truncate">{p.name}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-[6px] shrink-0 ml-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center border border-[rgba(28,58,47,0.2)] text-green hover:bg-green/5 transition-colors shrink-0"
                      title="Éditer"
                    >
                      <FontAwesomeIcon icon={faPen} className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteProduct(p.id)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center border border-[rgba(185,74,62,0.2)] text-red hover:bg-red-pale transition-colors shrink-0"
                      title="Supprimer"
                    >
                      <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Metrics grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-[6px] mb-4">
                  <div className="bg-bg border border-border rounded-xl p-[8px] sm:p-[10px] min-w-0 overflow-hidden">
                    <p className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-wide text-text-3 mb-0.5">Prix achat</p>
                    <p className="font-display font-bold text-[11px] sm:text-[14px] text-text-1 truncate">{formatCurrency(p.purchasePrice, currency)}</p>
                  </div>
                  <div className="bg-bg border border-border rounded-xl p-[8px] sm:p-[10px] min-w-0 overflow-hidden">
                    <p className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-wide text-text-3 mb-0.5">Prix vente</p>
                    <p className="font-display font-bold text-[11px] sm:text-[14px] text-text-1 truncate">{formatCurrency(p.salePrice, currency)}</p>
                  </div>
                  <div className={`col-span-2 sm:col-span-1 mx-auto sm:mx-0 w-full bg-bg border border-border rounded-xl p-[8px] sm:p-[10px] min-w-0 overflow-hidden ${marginCellBg}`}>
                    <p className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-wide text-text-3 mb-0.5">Marge</p>
                    <p className={`font-display font-bold text-[11px] sm:text-[14px] ${marginText} truncate`}>
                      {margin >= 0 ? "+" : ""}{formatCurrency(margin, currency)}
                    </p>
                    <p className={`text-[9px] sm:text-[10px] ${marginText} opacity-80 truncate`}>{marginRate.toFixed(0)}%</p>
                  </div>
                </div>

                {/* Stock bar */}
                <StockBar stock={p.stock} />
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom sheet form (mobile) */}
      {showModal && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setShowModal(false)}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in" />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto animate-slide-up shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-ink font-display">{editProduct ? "Modifier" : "Nouveau"} produit</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center text-muted hover:text-ink rounded-lg hover:bg-sand transition-colors">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11.5px] font-sans font-medium text-text-3 mb-1.5">Nom du produit *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-bg-card border-[1.5px] border-border rounded-xl px-[14px] py-3 text-sm text-text-1 outline-none transition-[border-color] focus:border-green focus:shadow-[0_0_0_3px_rgba(28,58,47,0.10)] placeholder:text-text-3"
                    placeholder="Ex: Sac à main"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11.5px] font-sans font-medium text-text-3 mb-1.5">Prix d&apos;achat</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={form.purchasePrice}
                        onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                        className="w-full bg-bg-card border-[1.5px] border-border rounded-xl pl-[34px] pr-[14px] py-3 text-sm text-text-1 outline-none transition-[border-color] focus:border-green focus:shadow-[0_0_0_3px_rgba(28,58,47,0.10)] placeholder:text-text-3"
                        min="0"
                        step="0.01"
                        placeholder="0"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-3 pointer-events-none">
                        {currency === "EUR" ? "€" : "F"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-sans font-medium text-text-3 mb-1.5">Prix de vente</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={form.salePrice}
                        onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                        className="w-full bg-bg-card border-[1.5px] border-border rounded-xl pl-[34px] pr-[14px] py-3 text-sm text-text-1 outline-none transition-[border-color] focus:border-green focus:shadow-[0_0_0_3px_rgba(28,58,47,0.10)] placeholder:text-text-3"
                        min="0"
                        step="0.01"
                        placeholder="0"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-3 pointer-events-none">
                        {currency === "EUR" ? "€" : "F"}
                      </span>
                    </div>
                  </div>
                </div>
                {!editProduct && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11.5px] font-sans font-medium text-text-3 mb-1.5">Stock initial</label>
                      <input
                        type="number"
                        value={form.stock}
                        onChange={(e) => setForm({ ...form, stock: e.target.value })}
                        className="w-full bg-bg-card border-[1.5px] border-border rounded-xl px-[14px] py-3 text-sm text-text-1 outline-none transition-[border-color] focus:border-green focus:shadow-[0_0_0_3px_rgba(28,58,47,0.10)] placeholder:text-text-3"
                        min="0"
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}
                {salePriceNum > 0 && (
                  <div className="flex items-center gap-2 bg-teal/10 rounded-xl px-4 py-3 text-sm">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal shrink-0">
                      <line x1="12" y1="19" x2="12" y2="5" />
                      <polyline points="5 12 12 5 19 12" />
                    </svg>
                    <span className="text-teal font-medium">
                      Bénéfice unitaire : <strong>{formatCurrency(liveMargin, currency, currency)}</strong> (<strong>{liveMarginRate.toFixed(0)}%</strong>)
                    </span>
                  </div>
                )}
                {error && (
                  <div className="flex items-center gap-2 bg-red-pale border border-red/20 rounded-xl px-4 py-3 text-sm">
                    <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 text-red shrink-0" />
                    <p className="text-red">{error}</p>
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full bg-green text-white font-sans font-semibold text-sm py-3 rounded-xl hover:opacity-90 transition-opacity"
                >
                  {editProduct ? "Enregistrer" : "Créer le produit"}
                </button>
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
              <h3 className="text-lg font-semibold text-ink font-display">
                {editProduct ? "Modifier" : "Nouveau"} produit
              </h3>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-muted">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11.5px] font-sans font-medium text-text-3 mb-1.5">Nom du produit *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-bg-card border-[1.5px] border-border rounded-xl px-[14px] py-3 text-sm text-text-1 outline-none transition-[border-color] focus:border-green focus:shadow-[0_0_0_3px_rgba(28,58,47,0.10)] placeholder:text-text-3"
                  placeholder="Ex: Sac à main"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-sans font-medium text-text-3 mb-1.5">Prix d&apos;achat</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={form.purchasePrice}
                      onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                      className="w-full bg-bg-card border-[1.5px] border-border rounded-xl pl-[34px] pr-[14px] py-3 text-sm text-text-1 outline-none transition-[border-color] focus:border-green focus:shadow-[0_0_0_3px_rgba(28,58,47,0.10)] placeholder:text-text-3"
                      min="0"
                      step="0.01"
                      placeholder="0"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-3 pointer-events-none">
                      {currency === "EUR" ? "€" : "F"}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11.5px] font-sans font-medium text-text-3 mb-1.5">Prix de vente</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={form.salePrice}
                      onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                      className="w-full bg-bg-card border-[1.5px] border-border rounded-xl pl-[34px] pr-[14px] py-3 text-sm text-text-1 outline-none transition-[border-color] focus:border-green focus:shadow-[0_0_0_3px_rgba(28,58,47,0.10)] placeholder:text-text-3"
                      min="0"
                      step="0.01"
                      placeholder="0"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-3 pointer-events-none">
                      {currency === "EUR" ? "€" : "F"}
                    </span>
                  </div>
                </div>
              </div>
              {!editProduct && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11.5px] font-sans font-medium text-text-3 mb-1.5">Stock initial</label>
                    <input
                      type="number"
                      value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: e.target.value })}
                      className="w-full bg-bg-card border-[1.5px] border-border rounded-xl px-[14px] py-3 text-sm text-text-1 outline-none transition-[border-color] focus:border-green focus:shadow-[0_0_0_3px_rgba(28,58,47,0.10)] placeholder:text-text-3"
                      min="0"
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
              {salePriceNum > 0 && (
                <div className="flex items-center gap-2 bg-teal/10 rounded-xl px-4 py-3 text-sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal shrink-0">
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                  <span className="text-teal font-medium">
                    Bénéfice unitaire : <strong>{formatCurrency(liveMargin, currency, currency)}</strong> (<strong>{liveMarginRate.toFixed(0)}%</strong>)
                  </span>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 bg-red-pale border border-red/20 rounded-xl px-4 py-3 text-sm">
                  <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 text-red shrink-0" />
                  <p className="text-red">{error}</p>
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-green text-white font-sans font-semibold text-sm py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                {editProduct ? "Enregistrer" : "Créer le produit"}
              </button>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmDeleteProduct !== null}
        title="Supprimer ce produit ?"
        message="Ce produit sera définitivement supprimé ainsi que les mouvements de stock et ventes associés. Cette action est irréversible."
        confirmLabel="Oui, supprimer"
        cancelLabel="Annuler"
        variant="danger"
        onConfirm={() => handleDelete(confirmDeleteProduct!)}
        onCancel={() => setConfirmDeleteProduct(null)}
      />
    </div>
  );
}
