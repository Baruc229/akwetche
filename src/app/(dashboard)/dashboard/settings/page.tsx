"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGear, faUser, faPlus, faTrash, faFloppyDisk, faTag, faGlobe, faTriangleExclamation, faRotateLeft, faCreditCard, faUpRightFromSquare, faRightFromBracket, faCrown, faShield, faLock, faCheck, faCircleCheck, faStar, faXmark, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { useDashboard } from "../../layout";
import { formatCurrency, resolveCurrency, setActiveCurrency } from "@/lib/utils";
import ConfirmModal from "@/components/ConfirmModal";
import CustomSelect from "@/components/ui/CustomSelect";

type Category = { id: number; name: string; icon: string; type: string; archived: boolean };

const PRESET_CATEGORIES = {
 income: [
 { name: "Salaire", type: "income" },
 { name: "Freelance", type: "income" },
 { name: "Ventes", type: "income" },
 { name: "Investissements", type: "income" },
 { name: "Autres revenus", type: "income" },
 ],
 expense: [
 { name: "Alimentation", type: "expense" },
 { name: "Logement", type: "expense" },
 { name: "Transport", type: "expense" },
 { name: "Électricité", type: "expense" },
 { name: "Eau", type: "expense" },
 { name: "Internet", type: "expense" },
 { name: "Santé", type: "expense" },
 { name: "Éducation", type: "expense" },
 { name: "Loisirs", type: "expense" },
 { name: "Vêtements", type: "expense" },
 { name: "Autres dépenses", type: "expense" },
 ],
};

const ALL_FEATURES = [
 { key: "transactions", label: "Transactions illimitées", free: false },
 { key: "categories", label: "Catégories illimitées", free: false },
 { key: "activity", label: "Mode activité commerciale", free: false },
 { key: "products", label: "Gestion des produits, ventes et stocks", free: false },
 { key: "reports", label: "Bilans hebdo / mensuel / annuel", free: true },
 { key: "stats", label: "Statistiques avancées", free: false },
];

export default function SettingsPage() {
 const { user, setUser, currency: activeCurrency } = useDashboard();
 const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategoryIds, setActiveCategoryIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
 const [name, setName] = useState(user?.name || "");
 const [initialBalance, setInitialBalance] = useState(String(user?.initialBalance || "0"));
 const [initialBalanceActivity, setInitialBalanceActivity] = useState(String(user?.initialBalanceActivity || "0"));
 const [currency, setCurrency] = useState(user?.currency || "auto");
 const [saved, setSaved] = useState(false);
 const [newCatName, setNewCatName] = useState("");
 const [newCatType, setNewCatType] = useState("expense");
 const [catError, setCatError] = useState("");
 const [showResetModal, setShowResetModal] = useState(false);
 const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
 const [deleteLoading, setDeleteLoading] = useState(false);
 const [resetLoading, setResetLoading] = useState(false);
 const [resetDone, setResetDone] = useState(false);
 const [subscription, setSubscription] = useState<{ status: string; amount: number; currency: string; endDate: string } | null>(null);
 const [subLoading, setSubLoading] = useState(false);
 const [subError, setSubError] = useState("");
 const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
 const [paymentType, setPaymentType] = useState<"success" | "error" | null>(null);
 const [confirmDeleteCat, setConfirmDeleteCat] = useState<number | null>(null);
 const [currentPassword, setCurrentPassword] = useState("");
 const [newPassword, setNewPassword] = useState("");
 const [confirmPassword, setConfirmPassword] = useState("");
 const [passwordSaved, setPasswordSaved] = useState(false);
 const [passwordError, setPasswordError] = useState("");

 const isAdmin = user?.role === "super_admin" || user?.role === "admin";
 const isPremium = user?.subscription?.status === "active" || isAdmin;
 const isFree = !isPremium && !isAdmin;

 useEffect(() => {
 const params = new URLSearchParams(window.location.search);
 const payment = params.get("payment");
 if (payment === "success") {
 setPaymentMessage("Paiement réussi ! Votre abonnement Premium est maintenant actif.");
 setPaymentType("success");
 loadSubscription();
 const url = new URL(window.location.href);
 url.searchParams.delete("payment");
 window.history.replaceState({}, "", url.toString());
 setTimeout(() => { setPaymentMessage(null); setPaymentType(null); }, 6000);
 } else if (payment === "cancelled") {
 setPaymentMessage("Paiement annulé. Vous pouvez réessayer quand vous voulez.");
 setPaymentType("error");
 const url = new URL(window.location.href);
 url.searchParams.delete("payment");
 window.history.replaceState({}, "", url.toString());
 setTimeout(() => { setPaymentMessage(null); setPaymentType(null); }, 6000);
 }
 }, []);

 useEffect(() => {
 if (user?.currency) setCurrency(user.currency);
 else if (user) setCurrency("auto");
 }, [user?.currency, user]);

 useEffect(() => {
 loadCategories();
 loadSubscription();
 }, []);

 async function loadSubscription() {
 try {
 const res = await fetch("/api/payments/manage-subscription");
 const data = await res.json();
 setSubscription(data.subscription);
 } catch {}
 }

 async function handleSubscribe() {
 router.push("/payment");
 }

  async function loadCategories() {
  try {
  const res = await fetch("/api/categories");
  const data = await res.json();
  setCategories(data.categories || []);
  setActiveCategoryIds(data.activeCategoryIds || []);
  } catch (e) { console.error(e); }
  finally { setLoading(false); }
  }

 async function handleSaveProfile(e: React.FormEvent) {
 e.preventDefault();
 try {
 const res = await fetch("/api/user", {
 method: "PUT",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ name, initialBalance: parseFloat(initialBalance), initialBalanceActivity: parseFloat(initialBalanceActivity), currency }),
 });
 const data = await res.json();
 if (res.ok) {
 setUser(data.user);
 setActiveCurrency(resolveCurrency(data.user?.currency));
 setSaved(true);
 setTimeout(() => setSaved(false), 2000);
 }
 } catch (e) { console.error(e); }
 }

  async function handleAddCategory(e: React.FormEvent) {
  e.preventDefault();
  setCatError("");
  if (!newCatName.trim()) return;
  const limit = 3;
  const activeByType = activeCategoryIds.filter(id => categories.find(c => c.id === id)?.type === newCatType).length;
  if (isFree && activeByType >= limit) {
  setCatError(`Limite gratuite atteinte (${limit} catégories par type max). Passez à Premium pour en créer plus.`);
  return;
  }
  const optimistic: Category = { id: Date.now(), name: newCatName.trim(), icon: "", type: newCatType, archived: false };
  setCategories((prev) => [...prev, optimistic]);
 setNewCatName("");
 try {
 const res = await fetch("/api/categories", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ name: optimistic.name, type: optimistic.type, icon: "" }),
 });
  const data = await res.json();
  if (!res.ok) {
  setCategories((prev) => prev.filter((c) => c.id !== optimistic.id));
  setCatError(data.error || "Erreur");
  return;
  }
  setCategories((prev) => prev.map((c) => (c.id === optimistic.id ? data.category : c)));
  if (data.category) setActiveCategoryIds((prev) => [...prev, data.category.id]);
  } catch {
  setCategories((prev) => prev.filter((c) => c.id !== optimistic.id));
  setCatError("Erreur");
  }
 }

  async function handleDeleteCategory(id: number) {
  setConfirmDeleteCat(null);
  setCatError("");
  // Optimistic removal
  setCategories((prev) => prev.filter((c) => c.id !== id));
  const res = await fetch("/api/categories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
  if (!res.ok) {
  // Rollback: reload from server
  const fresh = await fetch("/api/categories");
  const freshData = await fresh.json();
  setCategories(freshData.categories || []);
  setActiveCategoryIds(freshData.activeCategoryIds || []);
  setCatError("Erreur lors de la suppression");
  return;
  }
  // For free users, refresh to handle promotion (next category may become active)
  if (!isPremium) {
  const fresh = await fetch("/api/categories");
  const freshData = await fresh.json();
  setCategories(freshData.categories || []);
  setActiveCategoryIds(freshData.activeCategoryIds || []);
  }
  }

 async function handleDeleteAccount() {
 setDeleteLoading(true);
 try {
 await fetch("/api/auth/delete-account", { method: "POST" });
 router.push("/");
 } catch { setDeleteLoading(false); setShowDeleteAccountModal(false); }
 }

 async function handleLogout() {
 await fetch("/api/auth/logout", { method: "POST" });
 router.push("/");
 }

 async function handleResetAll() {
 setResetLoading(true);
 try {
 const res = await fetch("/api/reset", { method: "POST" });
 const data = await res.json();
 if (!res.ok) throw new Error(data.error);
 setResetDone(true);
 setTimeout(() => setResetDone(false), 3000);
 setShowResetModal(false);
 loadCategories();
 setInitialBalance("0");
 setInitialBalanceActivity("0");
 } catch (e) { console.error(e); }
 finally { setResetLoading(false); }
 }

 async function handleChangePassword(e: React.FormEvent) {
 e.preventDefault();
 setPasswordError("");
 setPasswordSaved(false);
 if (newPassword !== confirmPassword) {
 setPasswordError("Les mots de passe ne correspondent pas");
 return;
 }
 try {
 const res = await fetch("/api/auth/change-password", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ currentPassword, newPassword }),
 });
 const data = await res.json();
 if (!res.ok) { setPasswordError(data.error || "Erreur"); return; }
 setPasswordSaved(true);
 setCurrentPassword("");
 setNewPassword("");
 setConfirmPassword("");
 setTimeout(() => setPasswordSaved(false), 3000);
 } catch { setPasswordError("Erreur réseau"); }
 }

  async function addPresetCategories(type: "income" | "expense") {
  const presets = PRESET_CATEGORIES[type];
  let newPresets = presets.filter((p) => !categories.some((c) => c.name === p.name && c.type === p.type));
  if (newPresets.length === 0) return;
  if (!isPremium) {
  const limit = 3;
  const activeOfType = activeCategoryIds.filter(id => categories.find(c => c.id === id)?.type === type).length;
  const available = Math.max(0, limit - activeOfType);
  if (available <= 0) return;
  newPresets = newPresets.slice(0, available);
  if (newPresets.length === 0) return;
  }
  const optimism: Category[] = newPresets.map((p, i) => ({ id: Date.now() + i, name: p.name, icon: "", type: p.type, archived: false }));
  setCategories((prev) => [...prev, ...optimism]);
 try {
 const res = await fetch("/api/categories/bulk", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ categories: newPresets }),
 });
  const data = await res.json();
  if (!res.ok) {
  setCategories((prev) => prev.filter((c) => !optimism.some((o) => o.id === c.id)));
  return;
  }
  const replaced = (prev: Category[]) => prev.map((c) => {
  const match = data.categories.find((nc: Category) => nc.name === c.name && nc.type === c.type);
  return match ? match : c;
  });
  setCategories(replaced);
  // Refresh activeCategoryIds
  const newApi = await fetch("/api/categories");
  const fresh = await newApi.json();
  if (fresh.activeCategoryIds) setActiveCategoryIds(fresh.activeCategoryIds);
  } catch {
  setCategories((prev) => prev.filter((c) => !optimism.some((o) => o.id === c.id)));
  }
 }

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" />
 </div>
 );
 }

 return (
 <div className="space-y-6 max-w-2xl">
 <div>
 <h1 className="text-2xl font-bold text-ink">Paramètres</h1>
 <p className="text-muted text-sm mt-0.5">Gérez votre profil et vos paramètres</p>
 </div>

 {/* PLAN CARD */}
 <div className="card overflow-hidden">
 {isAdmin ? (
 <div className="p-6 bg-sand">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-ochre-light rounded-2xl flex items-center justify-center">
 <FontAwesomeIcon icon={faShield} className="w-6 h-6 text-ochre" />
 </div>
 <div>
 <p className="text-lg font-bold text-ink">Administrateur</p>
 <p className="text-sm text-muted">Accès total — toutes les fonctionnalités débloquées</p>
 </div>
 </div>
 <span className="bg-ochre-light text-ochre text-xs font-semibold px-3 py-1 rounded-full">Admin</span>
 </div>
 <div className="grid grid-cols-2 gap-2">
 {ALL_FEATURES.map((f) => (
 <div key={f.key} className="flex items-center gap-2 text-sm text-ink">
 <FontAwesomeIcon icon={faCheck} className="w-4 h-4 text-forest shrink-0" />
 {f.label}
 </div>
 ))}
 <div className="flex items-center gap-2 text-sm text-ink">
 <FontAwesomeIcon icon={faCheck} className="w-4 h-4 text-forest shrink-0" />
 Accès panneau d'administration
 </div>
 </div>
 </div>
 ) : subscription?.status === "active" || user?.plan === "premium" ? (
 <div className="p-6 bg-ochre-light">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-ochre-light rounded-2xl flex items-center justify-center">
 <FontAwesomeIcon icon={faCrown} className="w-6 h-6 text-ochre" />
 </div>
 <div>
 <p className="text-lg font-bold text-ink">Premium</p>
 <p className="text-sm text-muted">Toutes les fonctionnalités débloquées</p>
 </div>
 </div>
 <span className="bg-ochre-light text-forest text-xs font-semibold px-3 py-1 rounded-full">Actif</span>
 </div>
 {subscription && (
 <p className="text-sm text-muted mb-4">
 {activeCurrency === "XOF" ? "5 000 FCFA" : "7,99 €"} / mois
 · Prochain renouvellement le {new Date(subscription.endDate).toLocaleDateString("fr-FR")}
 </p>
 )}
 <div className="grid grid-cols-2 gap-2 mb-4">
 {ALL_FEATURES.map((f) => (
 <div key={f.key} className="flex items-center gap-2 text-sm text-ink">
 <FontAwesomeIcon icon={faCheck} className="w-4 h-4 text-forest shrink-0" />
 {f.label}
 </div>
 ))}
 </div>
 <button
 onClick={handleSubscribe}
 disabled={subLoading}
 className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-ochre text-white hover:bg-ochre transition-all disabled:opacity-50"
 >
 <FontAwesomeIcon icon={faUpRightFromSquare} className="w-4 h-4" />
 {subLoading ? "Chargement..." : "Gérer mon abonnement"}
 </button>
 </div>
 ) : (
 <div>
 <div className="p-6 bg-sand">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-ochre-light rounded-2xl flex items-center justify-center">
 <FontAwesomeIcon icon={faStar} className="w-6 h-6 text-forest" />
 </div>
 <div>
 <p className="text-lg font-bold text-ink">Gratuit</p>
 <p className="text-sm text-muted">Fonctionnalités de base</p>
 </div>
 </div>
 <span className="bg-border text-muted text-xs font-semibold px-3 py-1 rounded-full">Actif</span>
 </div>

 <div className="space-y-2 mb-4">
 {ALL_FEATURES.map((f) => (
 <div key={f.key} className="flex items-center justify-between text-sm">
 <div className="flex items-center gap-2">
 {f.free ? (
 <FontAwesomeIcon icon={faCheck} className="w-4 h-4 text-forest shrink-0" />
 ) : (
 <FontAwesomeIcon icon={faLock} className="w-4 h-4 text-muted shrink-0" />
 )}
 <span className={f.free ? "text-ink" : "text-muted"}>{f.label}</span>
 </div>
 {!f.free && (
 <span className="text-[10px] font-semibold bg-ochre-light text-ochre px-1.5 py-0.5 rounded">Premium</span>
 )}
 </div>
 ))}
 </div>

 <button
 onClick={handleSubscribe}
 disabled={subLoading}
 className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-forest text-white hover: hover: transition-all shadow-sm disabled:opacity-50"
 >
 <FontAwesomeIcon icon={faCrown} className="w-4 h-4" />
 {subLoading ? "Chargement..." : "Passer au Premium →"}
 </button>
 {subError && <p className="mt-2 text-sm text-red-600">{subError}</p>}
 </div>
 </div>
 )}
 </div>

 {/* PAYMENT BANNER */}
 {paymentMessage && (
 <div className={`p-4 rounded-2xl text-sm font-medium animate-fade-in ${paymentType === "success" ? "bg-ochre-light text-forest border border-border" : "bg-ochre-light text-ochre border border-border"}`}>
  <FontAwesomeIcon icon={paymentType === "success" ? faCircleCheck : faXmark} className="w-4 h-4 inline-block mr-1" />{paymentMessage}
 </div>
 )}

 {/* PROFILE */}
 <div className="card p-6">
 <div className="flex items-center gap-3 mb-5">
 <FontAwesomeIcon icon={faUser} className="w-5 h-5 text-forest" />
 <h2 className="text-base font-semibold text-ink">Profil</h2>
 </div>
 <form onSubmit={handleSaveProfile} className="space-y-4">
 <div>
 <label className="block text-sm text-muted mb-1">Nom</label>
 <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" required />
 </div>
 <div>
 <label className="block text-sm text-muted mb-1">Argent de départ</label>
 <input type="number" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} className="input-field" min="0" />
 <p className="text-xs text-muted mt-1">Ce que vous aviez avant de commencer.</p>
 </div>
 {isPremium && (
 <div>
 <label className="block text-sm text-muted mb-1">Argent de départ (activité)</label>
 <input type="number" value={initialBalanceActivity} onChange={(e) => setInitialBalanceActivity(e.target.value)} className="input-field" min="0" />
 <p className="text-xs text-muted mt-1">Ce que vous aviez dans votre activité.</p>
 </div>
 )}
 <div>
              <label className="block text-sm text-muted mb-1">Devise préférée</label>
              <div className="relative">
                <FontAwesomeIcon icon={faGlobe} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <CustomSelect
                  options={[
                    { value: "auto", label: "Automatique" },
                    { value: "XOF", label: "FCFA (Franc CFA)" },
                    { value: "EUR", label: "EUR (Euro)" },
                  ]}
                  value={currency}
                  onChange={(v) => setCurrency(v)}
                  className="pl-10"
                />
              </div>
 </div>
 <button type="submit" className="btn-primary flex items-center gap-2 text-sm">
 <FontAwesomeIcon icon={faFloppyDisk} className="w-4 h-4" />
 {saved ? "Enregistré ✓" : "Enregistrer"}
 </button>
 </form>
 </div>

 {/* PASSWORD */}
 <div className="card p-6">
 <div className="flex items-center gap-3 mb-5">
 <FontAwesomeIcon icon={faLock} className="w-5 h-5 text-forest" />
 <h2 className="text-base font-semibold text-ink">Mot de passe</h2>
 </div>
 <form onSubmit={handleChangePassword} className="space-y-4">
 <div>
 <label className="block text-sm text-muted mb-1">Mot de passe actuel</label>
 <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input-field" required />
 </div>
 <div>
 <label className="block text-sm text-muted mb-1">Nouveau mot de passe</label>
 <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field" minLength={8} required />
 <p className="text-xs text-muted mt-1">Minimum 8 caractères.</p>
 </div>
 <div>
 <label className="block text-sm text-muted mb-1">Confirmer le nouveau mot de passe</label>
 <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-field" minLength={8} required />
 </div>
 {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
 <button type="submit" className="btn-primary flex items-center gap-2 text-sm">
 <FontAwesomeIcon icon={faFloppyDisk} className="w-4 h-4" />
 {passwordSaved ? "Mis à jour ✓" : "Modifier le mot de passe"}
 </button>
 </form>
 </div>

  {/* CATEGORIES */}
  <div className="card p-6">
  <div className="flex items-center gap-3 mb-5">
  <FontAwesomeIcon icon={faTag} className="w-5 h-5 text-forest" />
  <h2 className="text-base font-semibold text-ink">Catégories</h2>
  </div>
  {!isPremium && (
  <div className="mb-4 p-4 bg-ochre-light rounded-xl border border-border space-y-3">
  <p className="text-sm text-ink">
  Vous êtes sur le plan <strong>Gratuit</strong>. Seules <strong>3 catégories par type</strong> (revenus / dépenses) sont actives.
  Les catégories supplémentaires nécessitent Premium.
  </p>
  <div className="flex items-center justify-between text-sm">
  <div>
  <span className="font-medium text-ochre">Revenus actifs</span>
  <span className="ml-2 font-semibold text-ochre">{activeCategoryIds.filter(id => categories.find(c => c.id === id)?.type === "income").length}/{categories.filter(c => c.type === "income").length}</span>
  </div>
  <div>
  <span className="font-medium text-ochre">Dépenses actives</span>
  <span className="ml-2 font-semibold text-ochre">{activeCategoryIds.filter(id => categories.find(c => c.id === id)?.type === "expense").length}/{categories.filter(c => c.type === "expense").length}</span>
  </div>
  </div>
  <button
  onClick={handleSubscribe}
  className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-sm font-medium bg-forest text-white hover:bg-forest-light transition-all"
  >
  <FontAwesomeIcon icon={faCrown} className="w-4 h-4" />
  Passer au Premium
  <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
  </button>
  </div>
  )}

  {(["income", "expense"] as const).map((type) => {
  const typeLabel = type === "income" ? "Revenus" : "Dépenses";
  const activeOfType = activeCategoryIds.filter(id => categories.find(c => c.id === id)?.type === type).length;
  const totalOfType = categories.filter(c => c.type === type).length;
  const isTypeLocked = !isPremium && activeOfType >= 3;

  return (
  <div key={type} className="mb-6 last:mb-0">
  <div className="flex items-center justify-between mb-3">
  <div className="flex items-center gap-2">
  <h3 className="text-sm font-medium text-ink">{typeLabel}</h3>
  {!isPremium && (
  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${isTypeLocked ? "bg-ochre-light text-ochre" : "bg-sand text-muted"}`}>({activeOfType}/3 actives)</span>
  )}
  </div>
  <button onClick={() => addPresetCategories(type)} className="text-xs text-forest hover:text-forest font-medium">+ Catégories par défaut</button>
  </div>

  {totalOfType === 0 ? (
  <p className="text-sm text-muted">Aucune catégorie de {typeLabel.toLowerCase()}</p>
  ) : (
  <div className="flex flex-wrap gap-2">
  {categories.filter(c => c.type === type).map((cat) => {
  const isActive = activeCategoryIds.includes(cat.id);
  return (
  <div key={cat.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border ${
  isActive
  ? "bg-ochre-light text-forest border-transparent"
  : cat.archived
    ? "bg-sand text-muted border-border opacity-70"
    : "bg-sand text-muted border-border"
  }`}>
  {!isActive && <FontAwesomeIcon icon={faLock} className="w-3 h-3 shrink-0" />}
  <span className={!isActive ? "opacity-70" : ""}>{cat.name}</span>
  <button
  onClick={(e) => { e.stopPropagation(); setConfirmDeleteCat(cat.id); }}
  className={`hover:text-red-500 transition-colors ml-0.5 ${isActive ? "text-forest" : "text-muted"}`}
  title="Supprimer"
  >
  <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
  </button>
  {!isActive && (
  <span className="text-[10px] font-medium bg-white/60 text-muted px-1.5 py-0.5 rounded">
  {cat.archived ? "Archivée" : "Premium"}
  </span>
  )}
  </div>
  );
  })}
  </div>
  )}
  </div>
  );
  })}

  <form onSubmit={handleAddCategory} className="flex items-end gap-2 pt-3 border-t border-border">
  <div className="flex-1">
  <label className="block text-xs text-muted mb-1">Nouvelle catégorie</label>
  <input
  type="text"
  value={newCatName}
  onChange={(e) => setNewCatName(e.target.value)}
  className="input-field text-sm"
  placeholder="Nom"
  disabled={!isPremium && activeCategoryIds.filter(id => categories.find(c => c.id === id)?.type === newCatType).length >= 3}
  />
  </div>
  <div>
  <label className="block text-xs text-muted mb-1">Type</label>
  <CustomSelect
  options={[
  { value: "expense", label: "Dépense" },
  { value: "income", label: "Revenu" },
  ]}
  value={newCatType}
  onChange={(v) => setNewCatType(v)}
  />
  </div>
  <button
  type="submit"
  disabled={!isPremium && activeCategoryIds.filter(id => categories.find(c => c.id === id)?.type === newCatType).length >= 3}
  className="btn-primary py-2.5 px-3 text-sm disabled:opacity-40"
  >
  <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
  </button>
  </form>
  {catError && <p className="text-red-500 text-sm">{catError}</p>}
  </div>

 {/* RESET */}
 <div className="card p-6 border border-red-200 bg-red-50/30">
 <div className="flex items-center gap-3 mb-3">
 <FontAwesomeIcon icon={faTriangleExclamation} className="w-5 h-5 text-red-600" />
 <h2 className="text-base font-semibold text-ink">Réinitialisation</h2>
 </div>
 <p className="text-sm text-muted mb-4">Supprime toutes vos données. Action irréversible.</p>
 <button onClick={() => setShowResetModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-all shadow-sm">
 <FontAwesomeIcon icon={faRotateLeft} className="w-4 h-4" />
 Réinitialiser toutes les données
 </button>
  {resetDone && <p className="mt-3 text-sm text-forest bg-ochre-light px-3 py-2 rounded-xl"><FontAwesomeIcon icon={faCheck} className="w-4 h-4 mr-1" /> Données réinitialisées.</p>}
 </div>

 {/* DELETE ACCOUNT */}
 <div className="card p-6 border border-red-300 bg-red-50/50">
 <div className="flex items-center gap-3 mb-3">
 <FontAwesomeIcon icon={faTrash} className="w-5 h-5 text-red-600" />
 <h2 className="text-base font-semibold text-ink">Supprimer mon compte</h2>
 </div>
 <p className="text-sm text-muted mb-4">Supprime définitivement votre compte et toutes vos données.</p>
 <button onClick={() => setShowDeleteAccountModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-all shadow-sm">
 <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
 Supprimer définitivement
 </button>
 </div>

 {/* LOGOUT */}
 <div className="border-t border-border pt-6">
 <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-muted hover:text-red-600 transition-colors">
 <FontAwesomeIcon icon={faRightFromBracket} className="w-4 h-4" />
 Déconnexion
 </button>
 </div>

 <ConfirmModal open={showDeleteAccountModal} title="Supprimer votre compte ?" message="Cette action est irréversible." confirmLabel={deleteLoading ? "Suppression..." : "Oui, supprimer"} cancelLabel="Annuler" variant="danger" onConfirm={handleDeleteAccount} onCancel={() => setShowDeleteAccountModal(false)} />
 <ConfirmModal open={showResetModal} title="Réinitialiser toutes les données ?" message="Toutes vos transactions, ventes, produits et catégories seront supprimés." confirmLabel={resetLoading ? "Réinitialisation..." : "Oui, tout supprimer"} cancelLabel="Annuler" variant="danger" onConfirm={handleResetAll} onCancel={() => setShowResetModal(false)} />
 <ConfirmModal open={confirmDeleteCat !== null} title="Supprimer cette catégorie ?" message="Les transactions liées ne seront pas supprimées." confirmLabel="Oui, supprimer" cancelLabel="Annuler" variant="warning" onConfirm={() => handleDeleteCategory(confirmDeleteCat!)} onCancel={() => setConfirmDeleteCat(null)} />
 </div>
 );
}
