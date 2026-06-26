"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "../../layout";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBox, faPlus, faTriangleExclamation, faBoxArchive, faArrowDown, faArrowUp, faXmark, faRotateLeft, faEye } from '@fortawesome/free-solid-svg-icons';
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
      } else if (initialStock > 0 && p.stock <= initialStock * 0.2) {
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
          <h1 className="text-2xl font-bold text-ink">Gestion du stock</h1>
          <p className="text-muted text-sm mt-0.5">{products.length} produit{products.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {loadError && (
      <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 animate-fade-in">
      <FontAwesomeIcon icon={faTriangleExclamation} className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
      <p className="text-sm text-red-700 flex-1">{loadError}</p>
      <button onClick={() => setLoadError(null)} className="text-red-400 hover:text-red-600 shrink-0"><FontAwesomeIcon icon={faXmark} className="w-4 h-4" /></button>
      </div>
      )}

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

      {lowStockProducts.length > 0 && (
        <div className="space-y-2">
          {lowStockProducts.map(s => (
            <div key={s.product.id} className={`rounded-xl px-4 py-3 flex items-center gap-3 text-sm ${
              s.status === "out"
                ? "bg-red-50 border border-red-200"
                : "bg-orange-50 border border-orange-200"
            }`}>
              <FontAwesomeIcon 
                icon={faTriangleExclamation} 
                className={`w-4 h-4 shrink-0 ${s.status === "out" ? "text-red-500" : "text-orange-500"}`} 
              />
              <div className="min-w-0 flex-1">
                <p className={`font-medium truncate ${s.status === "out" ? "text-red-800" : "text-orange-800"}`}>
                  {s.status === "out" ? "Rupture" : "Stock faible"} — {s.product.name}
                </p>
                <p className={`text-xs mt-0.5 ${s.status === "out" ? "text-red-600" : "text-orange-600"}`}>
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
                className="shrink-0 text-xs font-medium text-forest hover:text-ochre transition-colors px-2 py-1"
              >
                <FontAwesomeIcon icon={faRotateLeft} className="w-3 h-3 mr-1" />
                Réappro.
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        <h2 className="text-sm font-semibold text-ink p-4 pb-3">Produits</h2>
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
                <th className="px-4 py-3 text-muted font-medium text-xs uppercase tracking-wider">Produit</th>
                <th className="px-4 py-3 text-muted font-medium text-xs uppercase tracking-wider">Stock initial</th>
                <th className="px-4 py-3 text-muted font-medium text-xs uppercase tracking-wider">Vendu</th>
                <th className="px-4 py-3 text-muted font-medium text-xs uppercase tracking-wider">Restant</th>
                <th className="px-4 py-3 text-muted font-medium text-xs uppercase tracking-wider">Statut</th>
                <th className="px-4 py-3 text-muted font-medium text-xs uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stats.map((s, i) => (
                <tr key={s.product.id} className="hover:bg-sand transition-colors animate-slide-in" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="px-4 py-3 font-medium text-ink">{s.product.name}</td>
                  <td className="px-4 py-3 text-ink">{s.initialStock}</td>
                  <td className="px-4 py-3 text-ink">{s.sold}</td>
                  <td className="px-4 py-3 text-ink">{s.remaining}</td>
                  <td className="px-4 py-3">{renderStatusBadge(s.status)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        setReplenishProduct(s.product);
                        setReplenishQty("1");
                        setReplenishNote("");
                        setReplenishError("");
                      }}
                      className="flex items-center gap-1.5 text-xs font-medium text-forest hover:text-ochre transition-colors"
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
            const barColor = s.status === "out" ? "#EF4444" : s.status === "low" ? "#F97316" : "#10B981";
            return (
              <div key={s.product.id} className="card p-4 animate-slide-in" style={{ animationDelay: `${i * 30}ms` }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink truncate">{s.product.name}</p>
                    <p className="text-xs text-muted mt-0.5">{s.remaining} restant{s.remaining !== 1 ? "s" : ""} sur {s.initialStock}</p>
                  </div>
                  {renderStatusBadge(s.status)}
                </div>
                {/* Progress bar */}
                <div className="h-2 bg-border rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(pctSold, 100)}%`, backgroundColor: barColor }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted mb-3">
                  <span>{s.sold} vendu{s.sold !== 1 ? "s" : ""}</span>
                  <span>{pctSold.toFixed(0)}%</span>
                </div>
                <button
                  onClick={() => {
                    setReplenishProduct(s.product);
                    setReplenishQty("1");
                    setReplenishNote("");
                    setReplenishError("");
                  }}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 rounded-xl bg-forest/10 text-forest hover:bg-forest/20 transition-colors min-h-[44px]"
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
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.type === "in" ? "bg-teal/10" : "bg-red-pale"}`}>
                    <FontAwesomeIcon icon={m.type === "in" ? faArrowDown : faArrowUp} className={`w-5 h-5 ${m.type === "in" ? "text-teal" : "text-red"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{m.product?.name || "Produit supprimé"}</p>
                    <p className="text-xs text-muted">{m.description || (m.type === "in" ? "Entrée" : "Sortie")} · {formatDate(m.date)}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${m.type === "in" ? "text-forest" : "text-red"}`}>
                  {m.type === "in" ? "+" : "-"}{m.quantity}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile drawer */}
      {replenishProduct && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setReplenishProduct(null)}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in" />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] overflow-y-auto animate-slide-up shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-ink">Réapprovisionner</h3>
              <button onClick={() => setReplenishProduct(null)} className="w-8 h-8 flex items-center justify-center text-muted hover:text-ink rounded-lg hover:bg-sand transition-colors">
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
                  <label className="field-label">Quantité</label>
                  <input type="number" value={replenishQty} onChange={(e) => setReplenishQty(e.target.value)} className="input-field" min="1" required />
                </div>
                <div>
                  <label className="field-label">Note (optionnelle)</label>
                  <input type="text" value={replenishNote} onChange={(e) => setReplenishNote(e.target.value)} className="input-field" placeholder="Ex: Livraison fournisseur" />
                </div>
                {replenishError && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{replenishError}</p>}
                <button type="submit" disabled={submitting} className="btn-primary w-full py-3 disabled:opacity-50">
                  {submitting ? "En cours..." : "Ajouter au stock"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Desktop modal */}
      {replenishProduct && (
        <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4 bg-black/40 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-ink">Réapprovisionner</h3>
              <button onClick={() => setReplenishProduct(null)} className="text-muted hover:text-muted"><FontAwesomeIcon icon={faXmark} className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleReplenish} className="space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1">Produit</label>
                <p className="text-sm font-medium text-ink bg-sand rounded-xl px-3 py-2.5">{replenishProduct.name}</p>
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Quantité</label>
                <input type="number" value={replenishQty} onChange={(e) => setReplenishQty(e.target.value)} className="input-field" min="1" required />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Note (optionnelle)</label>
                <input type="text" value={replenishNote} onChange={(e) => setReplenishNote(e.target.value)} className="input-field" placeholder="Ex: Livraison fournisseur" />
              </div>
              {replenishError && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{replenishError}</p>}
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
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Rupture</span>;
  }
  if (status === "low") {
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Faible</span>;
  }
  return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">En stock</span>;
}
