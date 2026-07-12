"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "../../layout";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBox, faPlus, faTriangleExclamation, faBoxArchive, faArrowDown, faArrowUp, faXmark, faRotateLeft, faEye, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency, formatDate } from "@/lib/utils";
import ConfirmModal from "@/components/ConfirmModal";
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
  initialStock: number;
  sold: number;
  remaining: number;
  status: "instock" | "low" | "out";
};

export default function StockPage() {
  const { user } = useDashboard();
  const router = useRouter();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalStockValue, setTotalStockValue] = useState(0);
  const [outOfStock, setOutOfStock] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [premiumLocked, setPremiumLocked] = useState(false);
  const [replenishProduct, setReplenishProduct] = useState<Product | null>(null);
  const [replenishQty, setReplenishQty] = useState("1");
  const [replenishNote, setReplenishNote] = useState("");
  const [replenishError, setReplenishError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  function computeProductStats(products: Product[], movements: Movement[]): ProductStats[] {
    const soldMap: Record<number, number> = {};
    const productIndex = new Map(products.map(p => [p.id, p]));
    for (const m of movements) {
      if (m.type === "out" && m.description?.startsWith("Vente") && m.product?.id) {
        const prod = productIndex.get(m.product.id);
        if (prod) {
          soldMap[prod.id] = (soldMap[prod.id] || 0) + m.quantity;
        }
      }
    }
    return products.map(p => {
      const sold = soldMap[p.id] || 0;
      const initialStock = p.stock + sold;
      let status: ProductStats["status"] = "instock";
      if (p.stock === 0) {
        status = "out";
      } else if (initialStock > 0 && p.stock <= initialStock * 0.05) {
        status = "low";
      }
      return { product: p, initialStock, sold, remaining: p.stock, status };
    });
  }

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
      setLoadError("Impossible de charger le stock.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = "Stock — Akwetche";
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "user") { setPremiumLocked(false); loadData(); return; }
    if (user.subscription?.status === "active" || user.plan === "premium") { setPremiumLocked(false); loadData(); return; }
    if (user.subscription?.status === "expired") { setPremiumLocked(true); return; }
    router.replace("/dashboard");
  }, [user]);

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
          description: replenishNote || "Réapprovisionnement",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReplenishError(data.error || "Erreur");
        return;
      }
      setReplenishProduct(null);
      setReplenishQty("1");
      setReplenishNote("");
      loadData();
    } catch {
      setReplenishError("Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-40 bg-stone/30 rounded-lg" />
            <div className="h-4 w-24 bg-stone/20 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-5 space-y-2"><div className="h-3 w-28 bg-stone/30 rounded-lg" /><div className="h-7 w-24 bg-stone/20 rounded-lg" /></div>
          <div className="card p-5 space-y-2"><div className="h-3 w-28 bg-stone/30 rounded-lg" /><div className="h-7 w-24 bg-stone/20 rounded-lg" /></div>
          <div className="card p-5 space-y-2"><div className="h-3 w-28 bg-stone/30 rounded-lg" /><div className="h-7 w-24 bg-stone/20 rounded-lg" /></div>
        </div>
        <div className="card p-4 space-y-3">
          <div className="h-4 w-full bg-stone/20 rounded-lg" />
          <div className="h-4 w-full bg-stone/20 rounded-lg" />
          <div className="h-4 w-3/4 bg-stone/20 rounded-lg" />
        </div>
      </div>
    );
  }

  const stats = computeProductStats(products, movements);
  const lowStockProducts = stats.filter(s => s.status === "low" || s.status === "out");

  if (premiumLocked) return <PremiumLock />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display text-2xl text-ink">Gestion du stock</h1>
          <p className="text-muted text-sm mt-0.5">{products.length} produit{products.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {loadError && (
      <div className="alert-inline neg animate-fade-in">
      <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 shrink-0 mt-0.5" />
      <p className="flex-1">{loadError}</p>
      <button onClick={() => setLoadError(null)} className="opacity-60 hover:opacity-100 shrink-0"><FontAwesomeIcon icon={faXmark} className="w-4 h-4" /></button>
      </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-label">Valeur totale du stock</p>
          <p className="text-amount text-xl mt-1" style={{ color: "var(--color-brand)" }}>{formatCurrency(totalStockValue)}</p>
        </div>
        <div className="card">
          <p className="text-label">Produits en stock</p>
          <p className="text-amount text-xl mt-1">{products.filter(p => p.stock > 0).length}</p>
        </div>
        <div className="card">
          <p className="text-label">Produits en rupture</p>
          <p className={`text-amount text-xl mt-1 ${outOfStock.length > 0 ? "text-neg" : ""}`}>{outOfStock.length}</p>
        </div>
      </div>

      {lowStockProducts.length > 0 && (
        <div className="space-y-2">
          {lowStockProducts.map(s => (
            <div key={s.product.id} className={`alert-inline ${s.status === "out" ? "neg" : "warn"}`}>
              <FontAwesomeIcon 
                icon={faTriangleExclamation} 
                className="w-4 h-4 shrink-0" 
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">
                  {s.status === "out" ? "Rupture" : "Stock faible"} — {s.product.name}
                </p>
                <p className="text-xs mt-0.5 opacity-80">
                  {s.remaining} restant{s.remaining !== 1 ? "s" : ""}{s.status === "low" ? ` sur ${s.initialStock} initiaux` : ""}
                </p>
              </div>
              <button
                onClick={() => {
                  setReplenishProduct(s.product);
                  setReplenishQty("1");
                  setReplenishNote("");
                  setReplenishError("");
                }}
                className="btn-ghost text-xs shrink-0"
              >
                <FontAwesomeIcon icon={faRotateLeft} className="w-3 h-3 mr-1" />
                Réappro.
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <div className="px-6 pt-5 pb-3">
          <h2 className="text-sm font-semibold text-ink">Produits</h2>
        </div>
        {stats.length === 0 ? (
        <div className="text-center py-12 text-muted">
        <FontAwesomeIcon icon={faBox} className="w-10 h-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Aucun produit pour le moment</p>
        <p className="text-xs mt-1">Ajoutez des produits dans la section Produits.</p>
        </div>
        ) : (
        <>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-6 py-3 text-label">Produit</th>
                <th className="px-6 py-3 text-label">Stock initial</th>
                <th className="px-6 py-3 text-label">Vendu</th>
                <th className="px-6 py-3 text-label">Restant</th>
                <th className="px-6 py-3 text-label">Statut</th>
                <th className="px-6 py-3 text-label">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stats.map((s, i) => (
                <tr key={s.product.id} className={`transition-colors animate-slide-in ${i % 2 === 1 ? "bg-[var(--color-surface-raised)]" : ""}`} style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="px-6 py-3 font-medium text-ink">{s.product.name}</td>
                  <td className="px-6 py-3 text-ink">{s.initialStock}</td>
                  <td className="px-6 py-3 text-ink">{s.sold}</td>
                  <td className="px-6 py-3 text-ink">{s.remaining}</td>
                  <td className="px-6 py-3">{renderStatusBadge(s.status)}</td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => {
                        setReplenishProduct(s.product);
                        setReplenishQty("1");
                        setReplenishNote("");
                        setReplenishError("");
                      }}
                      className="btn-ghost text-xs"
                    >
                      <FontAwesomeIcon icon={faRotateLeft} className="w-3.5 h-3.5" />
                      Réapprovisionner
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="md:hidden space-y-3 p-4 pt-0">
          {stats.map((s, i) => {
            const pctSold = s.initialStock > 0 ? (s.sold / s.initialStock) * 100 : 0;
            let barBg: string;
            if (s.status === "out") {
              barBg = "var(--color-bar-neg)";
            } else if (s.status === "low") {
              barBg = "var(--color-bar-warn)";
            } else {
              barBg = "var(--color-bar-pos)";
            }
            return (
              <div key={s.product.id} className="card animate-slide-in" style={{ animationDelay: `${i * 30}ms` }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink truncate">{s.product.name}</p>
                    <p className="text-xs text-muted mt-0.5">{s.remaining} restant{s.remaining !== 1 ? "s" : ""} sur {s.initialStock}</p>
                  </div>
                  {renderStatusBadge(s.status)}
                </div>
                {/* Bar */}
                <div className="bar-row">
                  <div className="bar-head">
                    <span className="bar-label">
                      <span className="bar-dot" style={{ background: barBg }} />
                      Vendu
                    </span>
                    <span className="bar-value">{s.sold} <span className="pct">{pctSold.toFixed(0)}%</span></span>
                  </div>
                  <div className="bar-track lg">
                    <div className="bar-fill" style={{ width: `${Math.min(pctSold, 100)}%`, background: barBg }} />
                  </div>
                </div>
                <button
                  onClick={() => {
                    setReplenishProduct(s.product);
                    setReplenishQty("1");
                    setReplenishNote("");
                    setReplenishError("");
                  }}
                  className="btn-secondary w-full text-xs min-h-[44px]"
                >
                  <FontAwesomeIcon icon={faRotateLeft} className="w-3.5 h-3.5" />
                  Réapprovisionner
                </button>
              </div>
            );
          })}
        </div>
      </>
      )}
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold text-ink p-4 pb-0">Historique des mouvements</h2>
        {movements.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <FontAwesomeIcon icon={faBoxArchive} className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Aucun mouvement</p>
          </div>
        ) : (
          <div className="divide-y divide-border mt-3">
            {movements.slice(0, 50).map((m, i) => (
              <div key={m.id} className="flex items-center justify-between p-4 hover:bg-sand transition-colors animate-slide-in" style={{ animationDelay: `${i * 30}ms` }}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.type === "in" ? "bg-[var(--color-pos-bg)]" : "bg-[var(--color-neg-bg)]"}`}>
                    <FontAwesomeIcon icon={m.type === "in" ? faArrowDown : faArrowUp} className={`w-5 h-5 ${m.type === "in" ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{m.product?.name || "Produit supprimé"}</p>
                    <p className="text-xs text-muted">{m.description || (m.type === "in" ? "Entrée" : "Sortie")} · {formatDate(m.date)}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${m.type === "in" ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]"}`}>
                  {m.type === "in" ? "+" : "-"}{m.quantity}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile — full page */}
      {replenishProduct && (
        <div className="fixed inset-0 z-50 md:hidden bg-[var(--color-bg)] animate-slide-up flex flex-col">
          <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3.5 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
            <button onClick={() => setReplenishProduct(null)} className="w-9 h-9 flex items-center justify-center text-muted hover:text-ink rounded-lg hover:bg-[var(--color-surface-raised)] transition-colors">
              <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 rotate-180" />
            </button>
            <h3 className="text-base font-semibold text-ink">Réapprovisionner</h3>
          </div>
          <form onSubmit={handleReplenish} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="field-label">Produit</label>
                <p className="text-sm font-medium text-ink bg-sand rounded-xl px-3 py-2.5">{replenishProduct.name}</p>
              </div>
              <div>
                <label className="field-label">Quantité</label>
                <input type="number" value={replenishQty} onChange={(e) => setReplenishQty(e.target.value)} className="input-field" placeholder="1" min="1" required />
              </div>
              <div>
                <label className="field-label">Note (optionnelle)</label>
                <input type="text" value={replenishNote} onChange={(e) => setReplenishNote(e.target.value)} className="input-field" placeholder="ex: Livraison fournisseur" />
              </div>
            </div>
            <div className="shrink-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] p-5">
              {replenishError && <div className="alert-inline neg mb-3"><FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 shrink-0 mt-0.5" /><p>{replenishError}</p></div>}
              <button type="submit" disabled={submitting} className="btn-primary w-full py-3 disabled:opacity-50">
                {submitting ? "En cours..." : "Ajouter au stock"}
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Desktop modal */}
      {replenishProduct && (
        <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4 bg-black/40 animate-fade-in" onClick={() => setReplenishProduct(null)}>
          <div className="bg-[var(--color-surface)] rounded-2xl p-6 w-full max-w-md shadow-xl animate-scale-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-ink">Réapprovisionner</h3>
              <button onClick={() => setReplenishProduct(null)} className="text-muted hover:text-ink"><FontAwesomeIcon icon={faXmark} className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleReplenish} className="space-y-4">
              <div>
                <label className="field-label">Produit</label>
                <p className="text-sm font-medium text-ink bg-sand rounded-xl px-3 py-2.5">{replenishProduct.name}</p>
              </div>
              <div>
                <label className="field-label">Quantité</label>
                <input type="number" value={replenishQty} onChange={(e) => setReplenishQty(e.target.value)} className="input-field" placeholder="1" min="1" required />
              </div>
              <div>
                <label className="field-label">Note (optionnelle)</label>
                <input type="text" value={replenishNote} onChange={(e) => setReplenishNote(e.target.value)} className="input-field" placeholder="ex: Livraison fournisseur" />
              </div>
              {replenishError && <div className="alert-inline neg"><FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 shrink-0 mt-0.5" /><p>{replenishError}</p></div>}
              <button type="submit" disabled={submitting} className="btn-primary w-full py-3 disabled:opacity-50">
                {submitting ? "En cours..." : "Ajouter au stock"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function renderStatusBadge(status: ProductStats["status"]) {
  if (status === "out") {
    return <span className="badge badge-neg">Rupture</span>;
  }
  if (status === "low") {
    return <span className="badge badge-warn">Faible</span>;
  }
  return <span className="badge badge-pos">En stock</span>;
}
