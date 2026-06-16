"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "../../layout";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBox, faPlus, faPen, faTrash, faArrowTrendUp, faXmark, faSearch } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from "@/lib/utils";
import ConfirmModal from "@/components/ConfirmModal";
import CustomSelect from "@/components/ui/CustomSelect";
import PremiumLock from "@/components/subscription/PremiumLock";

type Product = {
  id: number;
  name: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  description?: string;
  unit?: string;
};

type SortKey = "name" | "salePrice" | "margin" | "stock";

export default function ProductsPage() {
  const { user } = useDashboard();
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

  async function loadProducts() {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data.products || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

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
    setForm({
      name: product.name,
      description: product.description || "",
      purchasePrice: String(product.purchasePrice),
      salePrice: String(product.salePrice),
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

    const method = editProduct ? "PUT" : "POST";
    const body: Record<string, unknown> = editProduct
      ? { id: editProduct.id, ...form }
      : form;

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

  const maxStock = Math.max(...products.map(p => p.stock), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (premiumLocked) return <PremiumLock />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Produits</h1>
          <p className="text-muted text-sm mt-0.5">
            {products.length} produit{products.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
          <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
          Ajouter un produit
        </button>
      </div>

      {products.length === 0 && !search ? (
        <div className="card text-center py-12 text-muted">
          <FontAwesomeIcon icon={faBox} className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Aucun produit pour le moment</p>
          <button onClick={openCreate} className="text-forest text-sm font-medium mt-2">
            Ajouter votre premier produit
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="hidden md:block relative flex-1 w-full">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="input-field pl-10 pr-9"
              />
              {searchInput && (
                <button onClick={() => { setSearchInput(""); setSearch(""); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-muted hover:text-ink rounded-full hover:bg-sand transition-colors">
                  <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-muted md:hidden shrink-0">Trier</span>
              <CustomSelect
                options={[
                  { value: "name", label: "Nom" },
                  { value: "salePrice", label: "Prix vente" },
                  { value: "margin", label: "Marge" },
                  { value: "stock", label: "Stock" },
                ]}
                value={sortKey}
                onChange={(v) => setSortKey(v as SortKey)}
                className="w-full sm:w-36"
              />
            </div>
          </div>

          {sorted.length === 0 ? (
            <div className="card text-center py-12 text-muted">
              <p className="text-sm">Aucun produit trouvé</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sorted.map((p) => {
                const margin = p.salePrice - p.purchasePrice;
                const marginRateNum = p.salePrice > 0 ? (margin / p.salePrice) * 100 : 0;
                const marginRate = marginRateNum.toFixed(0);
                return (
                  <div key={p.id} className="card p-5 animate-fade-in">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 bg-ochre-light rounded-xl flex items-center justify-center">
                        <FontAwesomeIcon icon={faBox} className="w-5 h-5 text-forest-light" />
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 text-muted hover:text-forest rounded-lg hover:bg-ochre-light transition-all">
                          <FontAwesomeIcon icon={faPen} className="w-4 h-4" />
                        </button>
                        <button onClick={() => setConfirmDeleteProduct(p.id)} className="p-1.5 text-muted hover:text-red-500 rounded-lg hover:bg-red-50 transition-all">
                          <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mb-3">
                      <h3 className="text-base font-semibold text-ink">{p.name}</h3>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted">Prix d'achat</span>
                        <span className="font-medium text-ink">{formatCurrency(p.purchasePrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Prix de vente</span>
                        <span className="font-medium text-ink">{formatCurrency(p.salePrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Marge</span>
                        <span className={`font-medium ${marginRateNum >= 40 ? 'text-forest' : marginRateNum >= 20 ? 'text-ochre' : 'text-red-500'}`}>
                          +{formatCurrency(margin)} ({marginRate}%)
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-muted">Stock</span>
                        <span className={`font-semibold ${p.stock === 0 ? "text-red-500" : p.stock <= 5 ? "text-ochre" : "text-ink"}`}>
                          {p.stock} unité{p.stock !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {maxStock > 0 && (
                        <div className="h-1.5 bg-border rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${p.stock === 0 ? "bg-red-400" : p.stock <= 5 ? "bg-ochre" : "bg-forest"}`}
                            style={{ width: `${(p.stock / maxStock) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Mobile drawer */}
      {showModal && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setShowModal(false)}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in" />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto animate-slide-up shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-ink">{editProduct ? "Modifier" : "Nouveau"} produit</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center text-muted hover:text-ink rounded-lg hover:bg-sand transition-colors">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Nom du produit *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Description (optionnelle)</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field resize-none" rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-muted mb-1">Prix d'achat</label>
                    <input type="number" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} className="input-field" min="0" step="0.01" />
                  </div>
                  <div>
                    <label className="block text-sm text-muted mb-1">Prix de vente</label>
                    <input type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} className="input-field" min="0" step="0.01" />
                  </div>
                </div>
                {!editProduct && (
                  <div>
                    <label className="block text-sm text-muted mb-1">Stock initial</label>
                    <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="input-field" min="0" />
                  </div>
                )}
                {salePriceNum > 0 && (
                  <div className="bg-ochre-light p-3 rounded-xl text-sm flex items-center gap-2">
                    <FontAwesomeIcon icon={faArrowTrendUp} className="w-4 h-4 text-forest-light" />
                    <span className="text-forest-light">
                      Bénéfice unitaire :{" "}
                      <strong>{formatCurrency(liveMargin)}</strong>
                      {" "}(<strong>{liveMarginRate.toFixed(0)}%</strong>)
                    </span>
                  </div>
                )}
                {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</p>}
                <button type="submit" className="btn-primary w-full py-3">
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
              <h3 className="text-lg font-semibold text-ink">
                {editProduct ? "Modifier" : "Nouveau"} produit
              </h3>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-muted"><FontAwesomeIcon icon={faXmark} className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1">Nom du produit *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Description (optionnelle)</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field resize-none" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-muted mb-1">Prix d'achat</label>
                  <input type="number" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} className="input-field" min="0" step="0.01" />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Prix de vente</label>
                  <input type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} className="input-field" min="0" step="0.01" />
                </div>
              </div>
              {!editProduct && (
                <div>
                  <label className="block text-sm text-muted mb-1">Stock initial</label>
                  <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="input-field" min="0" />
                </div>
              )}
              {salePriceNum > 0 && (
                <div className="bg-ochre-light p-3 rounded-xl text-sm flex items-center gap-2">
                  <FontAwesomeIcon icon={faArrowTrendUp} className="w-4 h-4 text-forest-light" />
                  <span className="text-forest-light">
                    Bénéfice unitaire :{" "}
                    <strong>{formatCurrency(liveMargin)}</strong>
                    {" "}(<strong>{liveMarginRate.toFixed(0)}%</strong>)
                  </span>
                </div>
              )}
              {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</p>}
              <button type="submit" className="btn-primary w-full py-3">
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
