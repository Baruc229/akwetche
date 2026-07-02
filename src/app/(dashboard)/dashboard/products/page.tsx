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

const CARD_COLORS = ["bg-[var(--color-gold-light)]", "bg-[var(--color-pos-bg)]", "bg-[var(--color-neg-bg)]", "bg-[var(--color-brand-subtle)]", "bg-[var(--color-surface-raised)]"];

function getCardColor(name: string, index: number) {
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return CARD_COLORS[hash % CARD_COLORS.length];
}

function StockBar({ stock }: { stock: number }) {
  const threshold = 5;
  let barBg: string, dotBg: string, label: string;
  if (stock === 0) {
    barBg = "var(--color-bar-neg)";
    dotBg = "var(--color-neg)";
    label = "Stock critique";
  } else if (stock <= threshold) {
    barBg = "var(--color-bar-warn)";
    dotBg = "var(--color-warn)";
    label = "Stock faible";
  } else {
    barBg = "var(--color-bar-pos)";
    dotBg = "var(--color-pos)";
    label = "Stock correct";
  }

  return (
    <div className="bar-row">
      <div className="bar-head">
        <span className="bar-label">
          <span className="bar-dot" style={{ background: dotBg }} />
          {label}
        </span>
        <span className="bar-value">{stock}</span>
      </div>
      <div className="bar-track lg">
        <div className="bar-fill" style={{ width: `${stock > 0 ? 100 : 0}%`, background: barBg }} />
      </div>
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
            <div key={i} className="card space-y-4">
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
          className="btn-primary"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Ajouter
        </button>
      </div>

      {loadError && (
        <div className="flex items-start gap-3 bg-[var(--color-neg-bg)] border border-[var(--color-neg)]/20 rounded-2xl p-4 animate-fade-in">
          <FontAwesomeIcon icon={faTriangleExclamation} className="w-5 h-5 text-[var(--color-neg)] shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--color-neg)] flex-1">{loadError}</p>
          <button onClick={() => setLoadError(null)} className="text-[var(--color-neg)]/50 hover:text-[var(--color-neg)] shrink-0"><FontAwesomeIcon icon={faXmark} className="w-4 h-4" /></button>
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
            className="w-full input-field rounded-xl py-[9px] pl-[38px] pr-3"
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
            className="flex items-center gap-2 input-field w-[125px] py-[9px] px-3 cursor-pointer hover:border-brand transition-colors"
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
              <div className="absolute right-0 top-full mt-1 z-50 w-[140px] card shadow-lg py-1 animate-fade-in">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSortKey(opt.value); setSortOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${sortKey === opt.value ? "text-[var(--color-brand)] font-semibold bg-[var(--color-brand-subtle)]" : "text-ink hover:bg-[var(--color-brand-subtle)]"}`}
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
          <div className="w-14 h-14 card-inset flex items-center justify-center mb-4 shadow-sm">
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
            className="btn-primary mt-5"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.map((p, idx) => {
              const margin = p.salePrice - p.purchasePrice;
            const marginRate = p.salePrice > 0 ? (margin / p.salePrice) * 100 : 0;
            const cardBg = getCardColor(p.name, idx);
            const initial = p.name.charAt(0).toUpperCase();

            let marginStyle: React.CSSProperties, marginTextStyle: React.CSSProperties;
            if (marginRate >= 40) {
              marginStyle = { background: "var(--color-pos-bg)" };
              marginTextStyle = { color: "var(--color-pos)" };
            } else if (marginRate >= 20) {
              marginStyle = { background: "var(--color-surface-raised)" };
              marginTextStyle = { color: "var(--color-body)" };
            } else {
              marginStyle = { background: "var(--color-neg-bg)" };
              marginTextStyle = { color: "var(--color-neg)" };
            }

            return (
              <div key={p.id} className="card hover:shadow-md transition-shadow">
                {/* Card header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-11 h-11 rounded-xl ${cardBg} flex items-center justify-center shrink-0`}>
                      <span className="font-display font-extrabold text-lg text-[var(--color-brand)]">{initial}</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display font-bold text-[17px] text-text-1 leading-tight truncate">{p.name}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-[6px] shrink-0 ml-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center border border-[var(--color-brand)]/20 text-[var(--color-brand)] hover:bg-[var(--color-brand)]/5 transition-colors shrink-0"
                      title="Éditer"
                    >
                      <FontAwesomeIcon icon={faPen} className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteProduct(p.id)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center border border-[var(--color-neg)]/20 text-[var(--color-neg)] hover:bg-[var(--color-neg-bg)] transition-colors shrink-0"
                      title="Supprimer"
                    >
                      <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Metrics grid */}
                <div className="grid grid-cols-2 gap-[6px] mb-4">
                  <div className="card-inset min-w-0 overflow-hidden">
                    <p className="text-label">Prix achat</p>
                    <p className="text-amount text-[13px] text-ink truncate mt-0.5">{formatCurrency(p.purchasePrice, currency)}</p>
                  </div>
                  <div className="card-inset min-w-0 overflow-hidden">
                    <p className="text-label">Prix vente</p>
                    <p className="text-amount text-[13px] text-ink truncate mt-0.5">{formatCurrency(p.salePrice, currency)}</p>
                  </div>
                  <div className="col-span-2 w-full card-inset" style={marginStyle}>
                    <p className="text-label">Marge</p>
                    <p className="text-amount text-[13px] mt-0.5" style={marginTextStyle}>
                      {margin >= 0 ? "+" : ""}{formatCurrency(margin, currency)}
                    </p>
                    <p className="text-[9px] mt-0.5" style={{ ...marginTextStyle, opacity: 0.8 }}>{marginRate.toFixed(0)}%</p>
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
          <div className="absolute bottom-0 left-0 right-0 bg-[var(--color-surface)] rounded-t-2xl max-h-[85vh] overflow-y-auto animate-slide-up shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[var(--color-surface)] z-10 flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-ink font-display">{editProduct ? "Modifier" : "Nouveau"} produit</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center text-muted hover:text-ink rounded-lg hover:bg-sand transition-colors">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="field-label">Nom du produit *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input-field"
                    placeholder="Ex: Sac à main"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="field-label">Prix d&apos;achat</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={form.purchasePrice}
                        onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                        className="input-field pl-[34px]"
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
                    <label className="field-label">Prix de vente</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={form.salePrice}
                        onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                        className="input-field pl-[34px]"
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
                      <label className="field-label">Stock initial</label>
                      <input
                        type="number"
                        value={form.stock}
                        onChange={(e) => setForm({ ...form, stock: e.target.value })}
                        className="input-field"
                        min="0"
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}
                {salePriceNum > 0 && (
                  <div className="flex items-center gap-2 bg-[var(--color-pos-bg)] rounded-xl px-4 py-3 text-sm">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-pos)] shrink-0">
                      <line x1="12" y1="19" x2="12" y2="5" />
                      <polyline points="5 12 12 5 19 12" />
                    </svg>
                    <span className="text-[var(--color-pos)] font-medium">
                      Bénéfice unitaire : <strong>{formatCurrency(liveMargin, currency, currency)}</strong> (<strong>{liveMarginRate.toFixed(0)}%</strong>)
                    </span>
                  </div>
                )}
                {error && (
                  <div className="flex items-center gap-2 bg-[var(--color-neg-bg)] border border-[var(--color-neg)]/20 rounded-xl px-4 py-3 text-sm">
                    <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 text-[var(--color-neg)] shrink-0" />
                    <p className="text-[var(--color-neg)]">{error}</p>
                  </div>
                )}
                <button
                  type="submit"
                  className="btn-primary w-full"
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
          <div className="bg-[var(--color-surface)] rounded-2xl p-6 w-full max-w-md shadow-xl animate-scale-in max-h-[90vh] overflow-y-auto">
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
                <label className="field-label">Nom du produit *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  placeholder="Ex: Sac à main"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Prix d&apos;achat</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={form.purchasePrice}
                      onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                      className="input-field pl-[34px]"
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
                  <label className="field-label">Prix de vente</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={form.salePrice}
                      onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                      className="input-field pl-[34px]"
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
                    <label className="field-label">Stock initial</label>
                    <input
                      type="number"
                      value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: e.target.value })}
                      className="input-field"
                      min="0"
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
              {salePriceNum > 0 && (
                <div className="flex items-center gap-2 bg-[var(--color-pos-bg)] rounded-xl px-4 py-3 text-sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-pos)] shrink-0">
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                  <span className="text-[var(--color-pos)] font-medium">
                    Bénéfice unitaire : <strong>{formatCurrency(liveMargin, currency, currency)}</strong> (<strong>{liveMarginRate.toFixed(0)}%</strong>)
                  </span>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 bg-[var(--color-neg-bg)] border border-[var(--color-neg)]/20 rounded-xl px-4 py-3 text-sm">
                  <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 text-[var(--color-neg)] shrink-0" />
                  <p className="text-[var(--color-neg)]">{error}</p>
                </div>
              )}
              <button
                type="submit"
                className="btn-primary w-full"
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
