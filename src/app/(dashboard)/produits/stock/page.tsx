"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "../../layout";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlusCircle, faMinusCircle, faArrowsUpDown, faRotateLeft, faXmark, faTriangleExclamation, faBox, faBoxArchive } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency, formatDate } from "@/lib/utils";
import PremiumLock from "@/components/subscription/PremiumLock";

type Product = {
  id: number;
  name: string;
  stock: number;
  purchasePrice: number;
  salePrice: number;
};

type Movement = {
  id: number;
  type: string;
  quantity: number;
  description: string;
  date: string;
  product: { id: number; name: string };
};

type ProductStats = {
  product: Product;
  sold: number;
  remaining: number;
  total: number;
  ratio: number;
  status: "instock" | "low" | "out";
};

type MovementKind = "initial" | "sale" | "replenish" | "adjustment";

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

function getThresholdColor(ratio: number): { text: string; bg: string; badgeBg: string; badgeText: string } {
  if (ratio > 0.5) return { text: "text-teal", bg: "bg-teal", badgeBg: "bg-teal/10", badgeText: "text-teal" };
  if (ratio > 0.1) return { text: "text-gold", bg: "bg-gold", badgeBg: "bg-gold-pale", badgeText: "text-gold" };
  return { text: "text-red", bg: "bg-red", badgeBg: "bg-red-pale", badgeText: "text-red" };
}

function getStatusLabel(ratio: number): string {
  if (ratio > 0.5) return "En stock";
  if (ratio > 0.1) return "Stock faible";
  return "Rupture";
}

function getMovementKind(m: Movement): MovementKind {
  const d = m.description || "";
  if (d === "Stock initial") return "initial";
  if (d.startsWith("Vente")) return "sale";
  if (d === "Réapprovisionnement") return "replenish";
  return "adjustment";
}

function getMovementLabel(m: Movement): string {
  const kind = getMovementKind(m);
  if (kind === "initial") return "Stock initial";
  if (kind === "sale") return m.description;
  if (kind === "replenish") return "Réapprovisionner";
  return "Ajustement";
}

export default function StockPage() {
  const { user } = useDashboard();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [premiumLocked, setPremiumLocked] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [replenishProduct, setReplenishProduct] = useState<Product | null>(null);
  const [replenishQty, setReplenishQty] = useState("");
  const [replenishError, setReplenishError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      setProducts(prodData.products || []);
    } catch {
      setLoadError("Impossible de charger le stock.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = "Gestion du stock — Akwetche";
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "user") { setPremiumLocked(false); loadData(); return; }
    if (user.subscription?.status === "active" || user.plan === "premium") { setPremiumLocked(false); loadData(); return; }
    if (user.subscription?.status === "expired") { setPremiumLocked(true); return; }
    router.replace("/dashboard");
  }, [user]);

  const productStats = useMemo(() => {
    const soldMap: Record<number, number> = {};
    for (const m of movements) {
      if (m.type === "out" && m.description?.startsWith("Vente")) {
        soldMap[m.product.id] = (soldMap[m.product.id] || 0) + m.quantity;
      }
    }
    return products.map(p => {
      const sold = soldMap[p.id] || 0;
      const remaining = p.stock;
      const total = remaining + sold;
      const ratio = total > 0 ? remaining / total : 0;
      let status: ProductStats["status"] = "instock";
      if (remaining === 0) status = "out";
      else if (ratio <= 0.1) status = "out";
      else if (ratio <= 0.5) status = "low";
      return { product: p, sold, remaining, total, ratio, status };
    });
  }, [products, movements]);

  const totalStockValue = useMemo(() =>
    products.reduce((sum, p) => sum + p.purchasePrice * p.stock, 0),
    [products]
  );

  const inStockCount = useMemo(() =>
    products.filter(p => p.stock > 0).length,
    [products]
  );

  const outOfStockCount = useMemo(() =>
    products.filter(p => p.stock === 0).length,
    [products]
  );

  async function handleReplenish(e: React.FormEvent) {
    e.preventDefault();
    if (!replenishProduct) return;
    setReplenishError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: replenishProduct.id,
          type: "in",
          quantity: parseInt(replenishQty),
          description: "Réapprovisionnement",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setReplenishError(data.error || "Erreur"); return; }
      setReplenishProduct(null);
      setReplenishQty("");
      loadData();
    } catch {
      setReplenishError("Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  function openReplenish(p: Product) {
    setReplenishProduct(p);
    setReplenishQty("1");
    setReplenishError("");
  }

  function closeReplenish() {
    setReplenishProduct(null);
    setReplenishQty("");
    setReplenishError("");
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-stone/30 rounded-lg" />
          <div className="h-4 w-32 bg-stone/20 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1,2,3].map(i => (
            <div key={i} className="rounded-xl p-4 space-y-2 bg-white border border-border">
              <div className="h-2 w-20 bg-stone/30 rounded-full" />
              <div className="h-6 w-28 bg-stone/20 rounded-lg" />
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-white border border-border p-4 space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-12 w-full bg-stone/20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (premiumLocked) return <PremiumLock />;

  return (
    <div className="space-y-3">

      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Gestion du stock</h1>
        <p className="text-sm text-muted mt-0.5">{products.length} produit{products.length !== 1 ? "s" : ""} · vue d&apos;ensemble</p>
      </div>

      {loadError && (
        <div className="flex items-start gap-3 bg-red-pale rounded-2xl p-4 animate-fade-in">
          <FontAwesomeIcon icon={faTriangleExclamation} className="w-5 h-5 text-red shrink-0 mt-0.5" />
          <p className="text-sm text-red flex-1">{loadError}</p>
          <button onClick={() => setLoadError(null)} className="text-red/60 hover:text-red shrink-0">
            <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI band */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl p-4 bg-teal/10 border border-border">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-teal mb-1">Valeur totale du stock</p>
          <p className="font-display text-lg font-bold text-teal">{formatCurrency(totalStockValue)}</p>
        </div>
        <div className="rounded-xl p-4 bg-white border border-border">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted mb-1">Produits en stock</p>
          <p className="font-display text-lg font-bold text-forest">{inStockCount}</p>
        </div>
        <div className={`rounded-xl p-4 border border-border ${outOfStockCount > 0 ? "bg-red-pale" : "bg-white"}`}>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted mb-1">Produits en rupture</p>
          <p className={`font-display text-lg font-bold ${outOfStockCount > 0 ? "text-red" : "text-text-3"}`}>{outOfStockCount}</p>
        </div>
      </div>

      {/* Products card */}
      <div className="rounded-xl bg-white border border-border">
        {productStats.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <FontAwesomeIcon icon={faBox} className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Aucun produit pour le moment</p>
            <p className="text-xs mt-1">Ajoutez des produits dans la section Produits.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {productStats.map((s) => {
              const tc = getThresholdColor(s.ratio);
              const pctSold = s.total > 0 ? (s.sold / s.total) * 100 : 0;
              const barPct = s.total > 0 ? (s.remaining / s.total) * 100 : 0;
              return (
                <div key={s.product.id} className="p-4">
                  {/* Product header: icon + name + badge */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-sand flex items-center justify-center shrink-0">
                      <span className="font-display font-extrabold text-sm text-ink">{getInitial(s.product.name)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink truncate">{s.product.name}</p>
                    </div>
                    <span className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full ${tc.badgeBg} ${tc.badgeText}`}>
                      {getStatusLabel(s.ratio)}
                    </span>
                  </div>

                  {/* Remaining / Total line */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted">{s.remaining} restant{s.remaining !== 1 ? "s" : ""}</span>
                    <span className={`text-xs font-semibold ${tc.text}`}>{s.remaining} / {s.total}</span>
                  </div>

                  {/* Bar */}
                  <div className="h-[5px] rounded-full bg-border overflow-hidden mb-1">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(barPct, 100)}%`, backgroundColor: tc.bg }} />
                  </div>

                  {/* Sold / Percentage line */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted">{s.sold} vendu{s.sold !== 1 ? "s" : ""}</span>
                    <span className={`text-xs font-semibold ${tc.text}`}>{pctSold.toFixed(0)}%</span>
                  </div>

                  {/* Replenish button */}
                  <button
                    onClick={() => openReplenish(s.product)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-forest border border-border hover:border-forest/30 rounded-xl px-3 py-1.5 transition-colors"
                  >
                    <FontAwesomeIcon icon={faRotateLeft} className="w-3 h-3" />
                    Réapprovisionner
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Movement history */}
      <div className="rounded-xl bg-white border border-border">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-ink">Historique des mouvements</h2>
        </div>
        {movements.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <FontAwesomeIcon icon={faBoxArchive} className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Aucun mouvement</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {movements.slice(0, 50).map((m, i) => {
              const kind = getMovementKind(m);
              const isIn = kind === "initial" || kind === "replenish";
              const isAdjustment = kind === "adjustment";
              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3 hover:bg-sand/50 transition-colors animate-slide-in" style={{ animationDelay: `${i * 30}ms` }}>
                  {/* Icon */}
                  <div className={`w-[38px] h-[38px] rounded-[11px] flex items-center justify-center shrink-0 ${isAdjustment ? "bg-sand" : isIn ? "bg-teal/10" : "bg-red-pale"}`}>
                    <FontAwesomeIcon
                      icon={isAdjustment ? faArrowsUpDown : isIn ? faPlusCircle : faMinusCircle}
                      className={`w-4 h-4 ${isAdjustment ? "text-text-3" : isIn ? "text-teal" : "text-red"}`}
                    />
                  </div>
                  {/* Body */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink truncate">{m.product?.name || "Produit supprimé"}</p>
                    <p className="text-[11px] text-text-3 truncate">{getMovementLabel(m)}</p>
                  </div>
                  {/* Delta */}
                  <span className={`font-display font-bold text-base shrink-0 ${isIn ? "text-teal" : "text-red"}`}>
                    {isIn ? "+" : "-"}{m.quantity}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Replenish bottom sheet (mobile) */}
      {replenishProduct && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={closeReplenish}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in" />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[20px] max-h-[70vh] overflow-y-auto animate-slide-up shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-ink font-display">Réapprovisionner</h3>
              <button onClick={closeReplenish} className="w-8 h-8 flex items-center justify-center text-muted hover:text-ink rounded-lg hover:bg-sand transition-colors">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <form onSubmit={handleReplenish} className="space-y-4">
                <div>
                  <label className="field-label">Produit</label>
                  <p className="text-sm font-medium text-ink bg-sand rounded-xl px-3 py-2.5">{replenishProduct.name}</p>
                </div>
                <div>
                  <label className="field-label">Quantité à ajouter</label>
                  <input type="number" value={replenishQty} onChange={(e) => setReplenishQty(e.target.value)} className="input-field" min="1" required />
                </div>
                {replenishError && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{replenishError}</p>}
                <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl bg-forest text-white font-semibold text-sm hover:bg-forest-light transition-colors disabled:opacity-50">
                  {submitting ? "En cours..." : "Confirmer"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Replenish modal (desktop) */}
      {replenishProduct && (
        <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4 bg-black/40 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-ink font-display">Réapprovisionner</h3>
              <button onClick={closeReplenish} className="text-muted hover:text-muted">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleReplenish} className="space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1">Produit</label>
                <p className="text-sm font-medium text-ink bg-sand rounded-xl px-3 py-2.5">{replenishProduct.name}</p>
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Quantité à ajouter</label>
                <input type="number" value={replenishQty} onChange={(e) => setReplenishQty(e.target.value)} className="input-field" min="1" required />
              </div>
              {replenishError && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{replenishError}</p>}
              <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl bg-forest text-white font-semibold text-sm hover:bg-forest-light transition-colors disabled:opacity-50">
                {submitting ? "En cours..." : "Confirmer"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
