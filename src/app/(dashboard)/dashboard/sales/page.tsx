"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "../../layout";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowTrendUp, faPlus, faBagShopping, faXmark, faTrash, faSearch, faCalendarDays, faCrown } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency, formatDate } from "@/lib/utils";
import ConfirmModal from "@/components/ConfirmModal";
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
  const { user } = useDashboard();
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [premiumLocked, setPremiumLocked] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [formProductId, setFormProductId] = useState("");
  const [formQuantity, setFormQuantity] = useState("1");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formNote, setFormNote] = useState("");
  const [formError, setFormError] = useState("");

  const [period, setPeriod] = useState<Period>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [pendingCustomStart, setPendingCustomStart] = useState("");
  const [pendingCustomEnd, setPendingCustomEnd] = useState("");
  const [customDateError, setCustomDateError] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "product" | "amount">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null);
  const [deleteMsg, setDeleteMsg] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [salesRes, prodRes] = await Promise.all([
        fetch("/api/sales?limit=1000"),
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

  const sortedSales = useMemo(() => {
    const arr = [...filteredSales];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "date") cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      else if (sortBy === "product") cmp = a.product.name.localeCompare(b.product.name);
      else if (sortBy === "amount") cmp = a.totalAmount - b.totalAmount;
      return sortDir === "desc" ? -cmp : cmp;
    });
    return arr;
  }, [filteredSales, sortBy, sortDir]);

  const summary = useMemo(() => {
    const revenue = filteredSales.reduce((s, x) => s + x.totalAmount, 0);
    const margin = filteredSales.reduce((s, x) => s + x.profit, 0);
    const count = filteredSales.length;

    const productQty: Record<number, { name: string; qty: number }> = {};
    for (const s of filteredSales) {
      if (!productQty[s.product.id]) productQty[s.product.id] = { name: s.product.name, qty: 0 };
      productQty[s.product.id].qty += s.quantity;
    }
    let topProduct = "";
    let topQty = 0;
    for (const key of Object.keys(productQty)) {
      const p = productQty[Number(key)];
      if (p.qty > topQty) { topQty = p.qty; topProduct = p.name; }
    }

    return { revenue, margin, count, topProduct };
  }, [filteredSales]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    const qty = parseInt(formQuantity);
    if (!formProductId || !qty || qty < 1) { setFormError("Veuillez remplir tous les champs"); return; }

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: formProductId, quantity: formQuantity }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || "Erreur"); return; }

      setShowModal(false);
      setFormProductId("");
      setFormQuantity("1");
      setFormDate(new Date().toISOString().split("T")[0]);
      setFormNote("");
      loadData();
    } catch {
      setFormError("Erreur réseau");
    }
  }

  async function handleDelete(sale: Sale) {
    try {
      const res = await fetch("/api/sales", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sale.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 404 || res.status === 405) {
          setDeleteMsg("La suppression via l'API n'est pas encore disponible");
        } else {
          setDeleteMsg(data.error || "Erreur lors de la suppression");
        }
        return;
      }
      setSales((prev) => prev.filter((s) => s.id !== sale.id));
      setDeleteTarget(null);
      setDeleteMsg("");
    } catch {
      setDeleteMsg("Erreur réseau");
    }
  }

  const selectedProduct = products.find((p) => p.id === parseInt(formProductId));
  const qtyNum = parseInt(formQuantity) || 0;
  const totalDisplay = selectedProduct ? selectedProduct.salePrice * qtyNum : 0;

  const periodOptions = [
    { value: "month", label: "Ce mois" },
    { value: "lastMonth", label: "Mois dernier" },
    { value: "custom", label: "Personnalisé" },
  ];

  const sortOptions = [
    { value: "date", label: "Date" },
    { value: "product", label: "Produit" },
    { value: "amount", label: "Montant" },
  ];

  if (premiumLocked) return <PremiumLock />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Ventes</h1>
          <p className="text-muted text-sm mt-0.5">{filteredSales.length} vente{filteredSales.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
          <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
          Nouvelle vente
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <p className="stat-label">Chiffre d&apos;affaires du mois</p>
          <p className="stat-value text-forest">{formatCurrency(summary.revenue)}</p>
        </div>
        <div className="card p-4">
          <p className="stat-label">Nombre de ventes</p>
          <p className="stat-value text-forest-light">{summary.count}</p>
        </div>
        <div className="card p-4">
          <p className="stat-label">Marge totale</p>
          <p className="stat-value text-amber">{formatCurrency(summary.margin)}</p>
        </div>
        <div className="card p-4">
          <p className="stat-label">Produit le plus vendu</p>
          <p className="stat-value text-ink text-sm sm:text-lg break-words">
            {summary.topProduct ? (
              <><FontAwesomeIcon icon={faCrown} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-ochre mr-1 inline" />{summary.topProduct}</>
            ) : "—"}
          </p>
        </div>
      </div>

      {/* Filters & Sort */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
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
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                period === opt.value ? "bg-ochre-light text-forest" : "text-muted hover:bg-border"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 w-full sm:w-auto">
              <div className="w-full sm:w-auto">
                <label className="block text-xs text-muted mb-0.5 sm:hidden">Date de début</label>
                <input
                  type="date"
                  value={pendingCustomStart}
                  onChange={(e) => { setPendingCustomStart(e.target.value); setCustomDateError(""); }}
                  className="input-field text-xs py-1.5 px-2 w-full sm:w-40"
                />
              </div>
              <span className="hidden sm:inline text-muted text-xs">→</span>
              <div className="w-full sm:w-auto">
                <label className="block text-xs text-muted mb-0.5 mt-1 sm:mt-0 sm:hidden">Date de fin</label>
                <input
                  type="date"
                  value={pendingCustomEnd}
                  onChange={(e) => { setPendingCustomEnd(e.target.value); setCustomDateError(""); }}
                  className="input-field text-xs py-1.5 px-2 w-full sm:w-40"
                />
              </div>
            </div>
            <button
              onClick={() => {
                if (!pendingCustomStart || !pendingCustomEnd) {
                  setCustomDateError("Veuillez sélectionner une date de début et une date de fin");
                  return;
                }
                if (new Date(pendingCustomEnd) < new Date(pendingCustomStart)) {
                  setCustomDateError("La date de fin ne peut pas être antérieure à la date de début");
                  return;
                }
                setCustomStart(pendingCustomStart);
                setCustomEnd(pendingCustomEnd);
                setCustomDateError("");
              }}
              className="btn-secondary text-xs py-1.5 px-3 whitespace-nowrap"
            >
              Appliquer
            </button>
            {customDateError && (
              <p className="text-xs text-red-500 w-full">{customDateError}</p>
            )}
          </div>
        )}
        <div className="hidden md:flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-muted">Trier</span>
          <CustomSelect options={sortOptions} value={sortBy} onChange={(v) => setSortBy(v as "date" | "product" | "amount")} className="w-28 sm:w-32" />
          <button
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className="text-muted hover:text-ink transition-colors text-sm px-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center"
            title={sortDir === "asc" ? "Ascendant" : "Descendant"}
          >
            {sortDir === "asc" ? "↑" : "↓"}
          </button>
        </div>
      </div>

      {/* Sales List */}
      {loading ? (
        <div className="card flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-forest border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sortedSales.length === 0 ? (
        <div className="card text-center py-12 text-muted">
          <FontAwesomeIcon icon={faBagShopping} className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Aucune vente pour cette période</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted text-xs uppercase tracking-wider border-b border-border">
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Produit</th>
                  <th className="p-4 font-medium text-right">Qté</th>
                  <th className="p-4 font-medium text-right">Prix unitaire</th>
                  <th className="p-4 font-medium text-right">Total</th>
                  <th className="p-4 font-medium text-right">Marge</th>
                  <th className="p-4 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-sand transition-colors">
                    <td className="p-4 text-ink whitespace-nowrap">{formatDate(sale.date)}</td>
                    <td className="p-4 text-ink font-medium">{sale.product.name}</td>
                    <td className="p-4 text-ink text-right">{sale.quantity}</td>
                    <td className="p-4 text-ink text-right">{formatCurrency(sale.unitPrice)}</td>
                    <td className="p-4 text-ink text-right font-semibold">{formatCurrency(sale.totalAmount)}</td>
                    <td className="p-4 text-right text-forest">{formatCurrency(sale.profit)}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => { setDeleteTarget(sale); setDeleteMsg(""); }}
                        className="text-muted hover:text-red-500 transition-colors p-1"
                        title="Supprimer"
                      >
                        <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {sortedSales.map((sale) => (
              <div key={sale.id} className="card p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink truncate">{sale.product.name}</p>
                    <p className="text-xs text-muted">{formatDate(sale.date)}</p>
                  </div>
                  <button
                    onClick={() => { setDeleteTarget(sale); setDeleteMsg(""); }}
                    className="text-muted hover:text-red-500 transition-colors p-1.5 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Supprimer"
                  >
                    <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-sand rounded-lg p-2">
                    <p className="text-muted mb-0.5">Qté</p>
                    <p className="font-semibold text-ink">{sale.quantity}</p>
                  </div>
                  <div className="bg-sand rounded-lg p-2">
                    <p className="text-muted mb-0.5">Prix unit.</p>
                    <p className="font-semibold text-ink">{formatCurrency(sale.unitPrice)}</p>
                  </div>
                  <div className="bg-ochre-light rounded-lg p-2">
                    <p className="text-ochre/70 mb-0.5">Total</p>
                    <p className="font-semibold text-ochre">{formatCurrency(sale.totalAmount)}</p>
                  </div>
                </div>
                <div className="mt-2 text-right">
                  <span className="text-xs font-medium text-forest">+{formatCurrency(sale.profit)} de marge</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Mobile drawer */}
      {showModal && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => { setShowModal(false); setFormError(""); }}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in" />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto animate-slide-up shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-ink">Nouvelle vente</h3>
              <button onClick={() => { setShowModal(false); setFormError(""); }} className="w-8 h-8 flex items-center justify-center text-muted hover:text-ink rounded-lg hover:bg-sand transition-colors">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Produit</label>
                  <CustomSelect
                    options={products.map((p) => ({
                      value: String(p.id),
                      label: `${p.name} — ${formatCurrency(p.salePrice)} (${p.stock} dispo)`,
                    }))}
                    value={formProductId}
                    onChange={setFormProductId}
                    placeholder="Sélectionner un produit"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Quantité</label>
                  <input
                    type="number"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    className="input-field"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Note (optionnelle)</label>
                  <input
                    type="text"
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    className="input-field"
                    placeholder="Ex: Vente en magasin"
                  />
                </div>
                {selectedProduct && (
                  <div className="bg-ochre-light p-3 rounded-xl text-sm space-y-1">
                    <p className="text-forest-light">
                      Prix unitaire : <strong>{formatCurrency(selectedProduct.salePrice)}</strong>
                    </p>
                    {qtyNum > 1 && (
                      <p className="text-forest-light">
                        {qtyNum} × {formatCurrency(selectedProduct.salePrice)}
                      </p>
                    )}
                    <p className="text-forest font-semibold text-base">
                      Total : {formatCurrency(totalDisplay)}
                    </p>
                    {qtyNum > selectedProduct.stock && (
                      <p className="text-red-500 text-xs mt-1">
                        ⚠ Stock insuffisant ({selectedProduct.stock} disponible{selectedProduct.stock !== 1 ? "s" : ""})
                      </p>
                    )}
                  </div>
                )}
                {formError && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{formError}</p>}
                <button type="submit" className="btn-primary w-full py-3">
                  Enregistrer la vente
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Desktop modal */}
      {showModal && (
        <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4 bg-black/40 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-ink">Nouvelle vente</h3>
              <button onClick={() => { setShowModal(false); setFormError(""); }} className="text-muted hover:text-ink transition-colors">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1">Produit</label>
                <CustomSelect
                  options={products.map((p) => ({
                    value: String(p.id),
                    label: `${p.name} — ${formatCurrency(p.salePrice)} (${p.stock} dispo)`,
                  }))}
                  value={formProductId}
                  onChange={setFormProductId}
                  placeholder="Sélectionner un produit"
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Quantité</label>
                <input
                  type="number"
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(e.target.value)}
                  className="input-field"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Note (optionnelle)</label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  className="input-field"
                  placeholder="Ex: Vente en magasin"
                />
              </div>
              {selectedProduct && (
                <div className="bg-ochre-light p-3 rounded-xl text-sm space-y-1">
                  <p className="text-forest-light">
                    Prix unitaire : <strong>{formatCurrency(selectedProduct.salePrice)}</strong>
                  </p>
                  {qtyNum > 1 && (
                    <p className="text-forest-light">
                      {qtyNum} × {formatCurrency(selectedProduct.salePrice)}
                    </p>
                  )}
                  <p className="text-forest font-semibold text-base">
                    Total : {formatCurrency(totalDisplay)}
                  </p>
                  {qtyNum > selectedProduct.stock && (
                    <p className="text-red-500 text-xs mt-1">
                      ⚠ Stock insuffisant ({selectedProduct.stock} disponible{selectedProduct.stock !== 1 ? "s" : ""})
                    </p>
                  )}
                </div>
              )}
              {formError && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{formError}</p>}
              <button type="submit" className="btn-primary w-full py-3">
                Enregistrer la vente
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmModal
        open={deleteTarget !== null}
        title="Supprimer la vente"
        message={`Voulez-vous vraiment supprimer la vente de ${deleteTarget?.quantity} × ${deleteTarget?.product.name} ?`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
        onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget); }}
        onCancel={() => { setDeleteTarget(null); setDeleteMsg(""); }}
      />

      {/* Delete message overlay */}
      {deleteMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-5 py-3 rounded-xl shadow-lg text-sm animate-fade-in max-w-md text-center">
          {deleteMsg}
          <button onClick={() => setDeleteMsg("")} className="ml-3 text-white/80 hover:text-white">
            <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
