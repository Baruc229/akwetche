"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "../../layout";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBox, faPlus, faPen, faTrash, faArrowTrendUp, faXmark } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from "@/lib/utils";
import ConfirmModal from "@/components/ConfirmModal";

type Product = {
 id: number;
 name: string;
 purchasePrice: number;
 salePrice: number;
 stock: number;
};

export default function ProductsPage() {
 const { user } = useDashboard();
 const router = useRouter();
 const [products, setProducts] = useState<Product[]>([]);
 const [loading, setLoading] = useState(true);
 const [showModal, setShowModal] = useState(false);
 const [editProduct, setEditProduct] = useState<Product | null>(null);
 const [form, setForm] = useState({
 name: "",
 purchasePrice: "",
 salePrice: "",
 stock: "",
 });
 const [error, setError] = useState("");
 const [confirmDeleteProduct, setConfirmDeleteProduct] = useState<number | null>(null);

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
 if (user && user.role === "user" && user.subscription?.status !== "active" && user.plan !== "premium") {
 router.replace("/dashboard");
 return;
 }
 loadProducts();
 }, [user]);

 function openCreate() {
 setEditProduct(null);
 setForm({ name: "", purchasePrice: "", salePrice: "", stock: "" });
 setShowModal(true);
 }

 function openEdit(product: Product) {
 setEditProduct(product);
 setForm({
 name: product.name,
 purchasePrice: String(product.purchasePrice),
 salePrice: String(product.salePrice),
 stock: String(product.stock),
 });
 setShowModal(true);
 }

 async function handleSubmit(e: React.FormEvent) {
 e.preventDefault();
 setError("");

 const method = editProduct ? "PUT" : "POST";
 const body = editProduct
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

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" />
 </div>
 );
 }

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

 {products.length === 0 ? (
 <div className="card text-center py-12 text-muted">
 <FontAwesomeIcon icon={faBox} className="w-10 h-10 mx-auto mb-3 opacity-50" />
 <p className="text-sm">Aucun produit pour le moment</p>
 <button onClick={openCreate} className="text-forest text-sm font-medium mt-2">
 Ajouter votre premier produit
 </button>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {products.map((p) => {
 const margin = p.salePrice - p.purchasePrice;
 const marginRate = p.purchasePrice > 0 ? ((margin / p.purchasePrice) * 100).toFixed(0) : "—";
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
 <h3 className="text-base font-semibold text-ink mb-3">{p.name}</h3>
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
 <span className="font-medium text-forest">+{formatCurrency(margin)} ({marginRate}%)</span>
 </div>
 <div className="flex justify-between pt-1.5 border-t border-border">
 <span className="text-muted">Stock</span>
 <span className={`font-semibold ${p.stock === 0 ? "text-red-500" : "text-ink"}`}>
 {p.stock} unité{p.stock !== 1 ? "s" : ""}
 </span>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}

 {showModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
 <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-scale-in">
 <div className="flex items-center justify-between mb-5">
 <h3 className="text-lg font-semibold text-ink">
 {editProduct ? "Modifier" : "Nouveau"} produit
 </h3>
 <button onClick={() => setShowModal(false)} className="text-muted hover:text-muted"><FontAwesomeIcon icon={faXmark} className="w-4 h-4" /></button>
 </div>
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label className="block text-sm text-muted mb-1">Nom du produit</label>
 <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
 </div>
 <div>
 <label className="block text-sm text-muted mb-1">Prix d'achat</label>
 <input type="number" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} className="input-field" min="0" />
 </div>
 <div>
 <label className="block text-sm text-muted mb-1">Prix de vente</label>
 <input type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} className="input-field" min="0" />
 </div>
 {!editProduct && (
 <div>
 <label className="block text-sm text-muted mb-1">Stock initial</label>
 <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="input-field" min="0" />
 </div>
 )}
 {form.purchasePrice && form.salePrice && parseFloat(form.salePrice) > 0 && (
 <div className="bg-ochre-light p-3 rounded-xl text-sm">
 <span className="text-forest-light">
 Bénéfice unitaire :{" "}
 <strong>
 {formatCurrency(parseFloat(form.salePrice) - parseFloat(form.purchasePrice || "0"))}
 </strong>
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
 message="Ce produit sera définitivement supprimé ainsi que son historique de ventes et de stock. Cette action est irréversible."
 confirmLabel="Oui, supprimer"
 cancelLabel="Annuler"
 variant="danger"
 onConfirm={() => handleDelete(confirmDeleteProduct!)}
 onCancel={() => setConfirmDeleteProduct(null)}
 />
 </div>
 );
}
