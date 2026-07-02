"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGear, faUser, faPlus, faTrash, faFloppyDisk, faTag, faGlobe, faTriangleExclamation, faRotateLeft, faCreditCard, faUpRightFromSquare, faRightFromBracket, faCrown, faShield, faLock, faCheck, faCircleCheck, faStar, faXmark, faArrowRight, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { useDashboard } from "../../layout";
import { formatCurrency, resolveCurrency, setActiveCurrency, getCountryByCode, getPhonePrefix, COUNTRY_OPTIONS, validatePhoneMessage, validateName, convertForDisplay, convertForStorage, roundByCurrency, type CurrencyCode } from "@/lib/utils";
import ConfirmModal from "@/components/ConfirmModal";
import CustomSelect from "@/components/ui/CustomSelect";
import FlagImg from "@/components/ui/FlagImg";

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
  const { user, setUser, currency: activeCurrency, setCurrency: setDashboardCurrency } = useDashboard();
 const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategoryIds, setActiveCategoryIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(user?.name || "");
  const [currency, setCurrency] = useState(user?.currency || user?.baseCurrency || getCountryByCode(user?.countryCode || "")?.currency || "XOF");
  const [initialBalance, setInitialBalance] = useState(() => {
    const bc = (user?.baseCurrency || "XOF") as CurrencyCode;
    const dc = (currency || bc) as CurrencyCode;
    return String(convertForDisplay(user?.initialBalance || 0, bc, dc));
  });
  const [initialBalanceActivity, setInitialBalanceActivity] = useState(() => {
    const bc = (user?.baseCurrency || "XOF") as CurrencyCode;
    const dc = (currency || bc) as CurrencyCode;
    return String(convertForDisplay(user?.initialBalanceActivity || 0, bc, dc));
  });
  const baseBalanceRef = useRef(user?.initialBalance || 0);
  const baseActivityRef = useRef(user?.initialBalanceActivity || 0);
  const prevCurrencyRef = useRef(currency);
  const [countryCode, setCountryCode] = useState(user?.countryCode || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  useEffect(() => {
    if (countryCode && !user?.countryCode) {
      setPhone(getPhonePrefix(countryCode));
    }
  }, [countryCode]);
  const [saved, setSaved] = useState(false);
 const [newCatName, setNewCatName] = useState("");
 const [newCatType, setNewCatType] = useState("expense");
  const [catError, setCatError] = useState("");
  const [presetLoading, setPresetLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
 const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
 const [deleteLoading, setDeleteLoading] = useState(false);
 const [resetLoading, setResetLoading] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
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
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
    document.title = "Paramètres — Akwetche";
    loadCategories();
    loadSubscription();
  }, []);

  // Convertir les soldes affichés quand la devise change
  useEffect(() => {
    const prev = prevCurrencyRef.current;
    if (prev !== currency) {
      const bc = (user?.baseCurrency || "XOF") as CurrencyCode;
      const from = prev as CurrencyCode;
      const to = currency as CurrencyCode;
      // Convert base value from old display → new display (via base currency)
      const baseVal = baseBalanceRef.current;
      const newDisplay = roundByCurrency(convertForDisplay(baseVal, bc, to), to);
      setInitialBalance(String(newDisplay));
      const baseActVal = baseActivityRef.current;
      const newActDisplay = roundByCurrency(convertForDisplay(baseActVal, bc, to), to);
      setInitialBalanceActivity(String(newActDisplay));
      prevCurrencyRef.current = currency;
    }
  }, [currency]);

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
  } catch (e) { setLoadError("Impossible de charger les catégories."); console.error(e); }
  finally { setLoading(false); }
  }

  async function handleSaveProfile(e: React.FormEvent) {
  e.preventDefault();
  setNameError("");
  setPhoneError("");

  const nameErr = validateName(name);
  if (nameErr) { setNameError(nameErr); return; }
  if (phone && countryCode) {
    const phoneErr = validatePhoneMessage(countryCode, phone);
    if (phoneErr) { setPhoneError(phoneErr); return; }
  }

  const balanceInBase = baseBalanceRef.current;
  const activityInBase = baseActivityRef.current;

  try {
    const res = await fetch("/api/user", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        initialBalance: balanceInBase,
        initialBalanceActivity: activityInBase,
        currency,
        phone,
        ...(countryCode ? { countryCode } : {}),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setUser(data.user);
      setActiveCurrency(resolveCurrency(data.user?.currency));
      // Reconvertir les soldes affichés avec la devise de l'utilisateur mis à jour
      const updatedBc = (data.user?.baseCurrency || "XOF") as CurrencyCode;
      const updatedDc = resolveCurrency(data.user?.currency) as CurrencyCode;
      setInitialBalance(String(roundByCurrency(convertForDisplay(balanceInBase, updatedBc, updatedDc), updatedDc)));
      setInitialBalanceActivity(String(roundByCurrency(convertForDisplay(activityInBase, updatedBc, updatedDc), updatedDc)));
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
  setActiveCategoryIds((prev) => [...prev, optimistic.id]);
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
  setActiveCategoryIds((prev) => prev.filter(id => id !== optimistic.id));
  setCatError(data.error || "Erreur");
  return;
  }
  setCategories((prev) => prev.map((c) => (c.id === optimistic.id ? data.category : c)));
  if (data.category) setActiveCategoryIds((prev) => [...prev.filter(id => id !== optimistic.id), data.category.id]);
  } catch {
  setCategories((prev) => prev.filter((c) => c.id !== optimistic.id));
  setActiveCategoryIds((prev) => prev.filter(id => id !== optimistic.id));
  setCatError("Erreur");
  }
 }

  async function handleRestoreCategory(id: number) {
  const res = await fetch("/api/categories", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, archived: false }) });
  if (!res.ok) return;
  const fresh = await fetch("/api/categories");
  const freshData = await fresh.json();
  setCategories(freshData.categories || []);
  setActiveCategoryIds(freshData.activeCategoryIds || []);
  }

  async function handleDeleteCategory(id: number) {
  setConfirmDeleteCat(null);
  setCatError("");
  // Optimistic removal
  setCategories((prev) => prev.filter((c) => c.id !== id));
  setActiveCategoryIds((prev) => prev.filter((cid) => cid !== id));
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
  baseBalanceRef.current = 0;
  baseActivityRef.current = 0;
  } catch (e) { setLoadError("Erreur lors de la réinitialisation."); console.error(e); }
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
  if (presetLoading) return;
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
  setActiveCategoryIds((prev) => [...prev, ...optimism.map(o => o.id)]);
  setPresetLoading(true);
 try {
 const res = await fetch("/api/categories/bulk", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ categories: newPresets }),
 });
  const data = await res.json();
  if (!res.ok) {
  setCategories((prev) => prev.filter((c) => !optimism.some((o) => o.id === c.id)));
  setActiveCategoryIds((prev) => prev.filter(id => !optimism.some(o => o.id === id)));
  setPresetLoading(false);
  return;
  }
  const replaced = (prev: Category[]) => prev.map((c) => {
  const match = data.categories.find((nc: Category) => nc.name === c.name && nc.type === c.type);
  return match ? match : c;
  });
  setCategories(replaced);
  // Flush activeCategoryIds with real IDs before server refresh
  const realIds = (data.categories as Category[]).map((c) => c.id);
  const optIds = optimism.map((o) => o.id);
  setActiveCategoryIds((prev) => [...prev.filter((id) => !optIds.includes(id)), ...realIds]);
  // Refresh activeCategoryIds from server for consistency
  const newApi = await fetch("/api/categories");
  const fresh = await newApi.json();
  if (fresh.activeCategoryIds) setActiveCategoryIds(fresh.activeCategoryIds);
  } catch {
  setCategories((prev) => prev.filter((c) => !optimism.some((o) => o.id === c.id)));
  setActiveCategoryIds((prev) => prev.filter(id => !optimism.some(o => o.id === id)));
  } finally {
  setPresetLoading(false);
  }
 }

 if (loading) {
 return (
 <div className="space-y-6 max-w-2xl animate-pulse">
  <div className="space-y-2">
   <div className="h-7 w-28 bg-stone/30 rounded-lg" />
   <div className="h-4 w-52 bg-stone/20 rounded-lg" />
  </div>
  <div className="card p-6 space-y-4">
   <div className="flex items-center gap-3">
    <div className="w-12 h-12 bg-stone/30 rounded-2xl" />
    <div className="space-y-2 flex-1"><div className="h-5 w-32 bg-stone/30 rounded-lg" /><div className="h-4 w-48 bg-stone/20 rounded-lg" /></div>
   </div>
   <div className="h-px bg-border" />
   <div className="space-y-2"><div className="h-4 w-full bg-stone/20 rounded-lg" /><div className="h-4 w-3/4 bg-stone/20 rounded-lg" /></div>
   <div className="h-10 w-full bg-stone/20 rounded-xl" />
  </div>
  <div className="card p-6 space-y-4">
   <div className="h-5 w-36 bg-stone/30 rounded-lg" />
   <div className="h-10 w-full bg-stone/20 rounded-xl" />
   <div className="h-10 w-full bg-stone/20 rounded-xl" />
  </div>
 </div>
 );
 }

 return (
 <div className="space-y-6 max-w-2xl">
  <div>
  <h1 className="text-2xl font-bold text-ink">Paramètres</h1>
  <p className="text-muted text-sm mt-0.5">Gérez votre profil et vos paramètres</p>
  </div>

  {loadError && (
  <div className="alert-inline neg">
  <FontAwesomeIcon icon={faTriangleExclamation} className="w-5 h-5 shrink-0 mt-0.5" />
  <p className="text-sm flex-1">{loadError}</p>
  <button onClick={() => setLoadError(null)} className="shrink-0 hover:opacity-70"><FontAwesomeIcon icon={faXmark} className="w-4 h-4" /></button>
  </div>
  )}

  {/* PLAN CARD */}
  <p className="text-label mb-3">Abonnement</p>
  <div>
 {isAdmin ? (
 <div className="card-hero">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center">
 <FontAwesomeIcon icon={faShield} className="w-6 h-6 text-white" />
 </div>
 <div>
 <p className="text-lg font-bold text-white">Administrateur</p>
 <p className="text-sm text-white/70">Accès total — toutes les fonctionnalités débloquées</p>
 </div>
 </div>
  <span className="badge" style={{ background: "rgba(255,255,255,0.2)", color: "white" }}>Admin</span>
 </div>
 <div className="grid grid-cols-2 gap-2">
 {ALL_FEATURES.map((f) => (
 <div key={f.key} className="flex items-center gap-2 text-sm text-white">
 <FontAwesomeIcon icon={faCheck} className="w-4 h-4 text-white/70 shrink-0" />
 {f.label}
 </div>
 ))}
 <div className="flex items-center gap-2 text-sm text-white">
 <FontAwesomeIcon icon={faCheck} className="w-4 h-4 text-white/70 shrink-0" />
 Accès panneau d'administration
 </div>
 </div>
 </div>
 ) : subscription?.status === "active" || user?.plan === "premium" ? (
  <div className="card border-gold bg-gold-light">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-white/60 rounded-2xl flex items-center justify-center">
 <FontAwesomeIcon icon={faCrown} className="w-6 h-6 text-gold" />
 </div>
 <div>
 <p className="text-lg font-bold text-ink">Premium</p>
 <p className="text-sm text-muted">Toutes les fonctionnalités débloquées</p>
 </div>
 </div>
 <span className="badge badge-pos">Actif</span>
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
 <FontAwesomeIcon icon={faCheck} className="w-4 h-4 text-pos shrink-0" />
 {f.label}
 </div>
 ))}
 </div>
 <button
 onClick={handleSubscribe}
 disabled={subLoading}
 className="btn-primary"
 >
 <FontAwesomeIcon icon={faUpRightFromSquare} className="w-4 h-4" />
 {subLoading ? "Chargement..." : "Gérer mon abonnement"}
 </button>
 </div>
 ) : (
 <div className="card">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-brand-subtle rounded-2xl flex items-center justify-center">
 <FontAwesomeIcon icon={faStar} className="w-6 h-6 text-brand" />
 </div>
 <div>
 <p className="text-lg font-bold text-ink">Gratuit</p>
 <p className="text-sm text-muted">Fonctionnalités de base</p>
 </div>
 </div>
 <span className="badge badge-muted">Actif</span>
 </div>

 <div className="space-y-2 mb-4">
 {ALL_FEATURES.map((f) => (
 <div key={f.key} className="flex items-center justify-between text-sm">
 <div className="flex items-center gap-2">
 {f.free ? (
 <FontAwesomeIcon icon={faCheck} className="w-4 h-4 text-pos shrink-0" />
 ) : (
 <FontAwesomeIcon icon={faLock} className="w-4 h-4 text-muted shrink-0" />
 )}
 <span className={f.free ? "text-ink" : "text-muted"}>{f.label}</span>
 </div>
 {!f.free && (
 <span className="badge badge-gold">Premium</span>
 )}
 </div>
 ))}
 </div>

 <button
 onClick={handleSubscribe}
 disabled={subLoading}
 className="btn-primary"
 >
 <FontAwesomeIcon icon={faCrown} className="w-4 h-4" />
 {subLoading ? "Chargement..." : "Passer au Premium →"}
 </button>
  {subError && <p className="mt-2 text-sm text-neg">{subError}</p>}
 </div>
 )}
 </div>

 {/* PAYMENT BANNER */}
  {paymentMessage && (
  <div className={`alert-inline animate-fade-in ${paymentType === "success" ? "pos" : "warn"}`}>
   <FontAwesomeIcon icon={paymentType === "success" ? faCircleCheck : faXmark} className="w-4 h-4 shrink-0 mt-0.5" />
   <span>{paymentMessage}</span>
  </div>
  )}

 {/* PROFILE */}
 <p className="text-label mb-3">Profil</p>
 <div className="card">
 <form onSubmit={handleSaveProfile} className="space-y-4">
  <div>
  <label className="field-label">Nom</label>
  <input
    type="text"
    value={name}
    onChange={(e) => {
      setName(e.target.value);
      setNameError("");
    }}
    className={`input-field ${nameError ? "error" : ""}`}
    required
  />
  {nameError && <p className="text-neg text-xs mt-1">{nameError}</p>}
  </div>
 <div>
  <label className="field-label">Argent de départ</label>
  <div className="relative">
  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm font-semibold pointer-events-none">{currency === "XOF" ? "FCFA" : "EUR"}</span>
  <input type="number" value={initialBalance} onChange={(e) => { setInitialBalance(e.target.value); const v = parseFloat(e.target.value) || 0; const bc = (user?.baseCurrency || "XOF") as CurrencyCode; const dc = currency as CurrencyCode; baseBalanceRef.current = convertForStorage(v, dc, bc); }} className="input-field pl-16" min="0" step="any" />
  </div>
  <p className="text-xs text-muted mt-1">Ce que vous aviez avant de commencer.</p>
 </div>
 {isPremium && (
 <div>
  <label className="field-label">Argent de départ (activité)</label>
  <div className="relative">
  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm font-semibold pointer-events-none">{currency === "XOF" ? "FCFA" : "EUR"}</span>
  <input type="number" value={initialBalanceActivity} onChange={(e) => { setInitialBalanceActivity(e.target.value); const v = parseFloat(e.target.value) || 0; const bc = (user?.baseCurrency || "XOF") as CurrencyCode; const dc = currency as CurrencyCode; baseActivityRef.current = convertForStorage(v, dc, bc); }} className="input-field pl-16" min="0" step="any" />
  </div>
 <p className="text-xs text-muted mt-1">Ce que vous aviez dans votre activité.</p>
 </div>
 )}
  <div>
    <label className="field-label">Pays</label>
    {user?.countryCode && !isAdmin ? (
    <div className="flex items-center gap-2 input-field bg-sand text-muted cursor-not-allowed opacity-80">
      <FlagImg code={user.countryCode} />
      <span>{getCountryByCode(user.countryCode)?.name || user.countryCode}</span>
      <span className="text-xs text-muted ml-auto">Non modifiable</span>
    </div>
    ) : (
    <CustomSelect
      options={COUNTRY_OPTIONS}
      value={countryCode}
      onChange={(v) => {
        setCountryCode(v);
        setCurrency(getCountryByCode(v)?.currency || "XOF");
      }}
      placeholder="Sélectionnez votre pays"
    />
    )}
    <p className="text-xs text-muted mt-1">Devise du compte : <strong>{getCountryByCode(countryCode)?.currency || currency}</strong></p>
  </div>
  <div>
    <label className="field-label">Téléphone</label>
    <input
      type="tel"
      value={phone}
      onChange={(e) => {
        const val = e.target.value;
        if (countryCode) {
          const prefix = getPhonePrefix(countryCode);
          if (val.startsWith(prefix)) {
            setPhone(val);
            if (val.length > prefix.length) {
              setPhoneError(validatePhoneMessage(countryCode, val) || "");
            } else {
              setPhoneError("");
            }
          } else {
            setPhone(prefix);
          }
        } else {
          setPhone(val);
        }
      }}
      className={`input-field ${phoneError ? "error" : ""}`}
      placeholder={countryCode ? `${getPhonePrefix(countryCode)} XX XX XX XX` : "+229XXXXXXXX"}
    />
    {phoneError && <p className="text-neg text-xs mt-1">{phoneError}</p>}
  </div>
  <div>
    <label className="field-label">Devise d'affichage</label>
    <div className="flex items-center gap-1 p-1 bg-surface-raised border border-border rounded-xl w-fit">
      <button
        type="button"
        onClick={() => {
          setCurrency("XOF");
          setActiveCurrency("XOF" as CurrencyCode);
          setDashboardCurrency("XOF" as CurrencyCode);
        }}
        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${currency === "XOF" ? "bg-brand text-white shadow-sm" : "text-muted hover:text-ink"}`}
      >
        FCFA
      </button>
      <button
        type="button"
        onClick={() => {
          setCurrency("EUR");
          setActiveCurrency("EUR" as CurrencyCode);
          setDashboardCurrency("EUR" as CurrencyCode);
        }}
        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${currency === "EUR" ? "bg-brand text-white shadow-sm" : "text-muted hover:text-ink"}`}
      >
        EUR
      </button>
    </div>
    <p className="text-xs text-muted mt-1">Choisissez la devise d'affichage.</p>
  </div>
 <button type="submit" className="btn-primary flex items-center gap-2 text-sm">
 <FontAwesomeIcon icon={faFloppyDisk} className="w-4 h-4" />
 {saved ? "Enregistré ✓" : "Enregistrer"}
 </button>
 </form>
 </div>

 {/* PASSWORD */}
 <p className="text-label mb-3">Mot de passe</p>
 <div className="card">
 <form onSubmit={handleChangePassword} className="space-y-4">
 <div>
  <label className="field-label">Mot de passe actuel</label>
  <div style={{ position: "relative" }}>
    <input type={showCurrent ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input-field pr-10" required />
    <button type="button" onClick={() => setShowCurrent(!showCurrent)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-body" tabIndex={-1}>
      <FontAwesomeIcon icon={showCurrent ? faEyeSlash : faEye} />
    </button>
  </div>
 </div>
 <div>
  <label className="field-label">Nouveau mot de passe</label>
  <div style={{ position: "relative" }}>
    <input type={showNew ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field pr-10" minLength={8} required />
    <button type="button" onClick={() => setShowNew(!showNew)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-body" tabIndex={-1}>
      <FontAwesomeIcon icon={showNew ? faEyeSlash : faEye} />
    </button>
  </div>
 <p className="text-xs text-muted mt-1">Minimum 8 caractères.</p>
 </div>
 <div>
  <label className="field-label">Confirmer le nouveau mot de passe</label>
  <div style={{ position: "relative" }}>
    <input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-field pr-10" minLength={8} required />
    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-body" tabIndex={-1}>
      <FontAwesomeIcon icon={showConfirm ? faEyeSlash : faEye} />
    </button>
  </div>
 </div>
  {passwordError && <p className="text-sm text-neg">{passwordError}</p>}
 <button type="submit" className="btn-primary flex items-center gap-2 text-sm">
 <FontAwesomeIcon icon={faFloppyDisk} className="w-4 h-4" />
 {passwordSaved ? "Mis à jour ✓" : "Modifier le mot de passe"}
 </button>
 </form>
 </div>

  {/* CATEGORIES */}
  <p className="text-label mb-3">Catégories</p>
  <div className="card">
  {!isPremium && (
  <div className="mb-4 p-4 bg-gold-light rounded-xl border border-border space-y-3">
  <p className="text-sm text-ink">
  Vous êtes sur le plan <strong>Gratuit</strong>. Seules <strong>3 catégories par type</strong> (revenus / dépenses) sont actives.
  Les catégories supplémentaires nécessitent Premium.
  </p>
  <div className="flex items-center justify-between text-sm">
  <div>
  <span className="font-medium text-gold">Revenus actifs</span>
  <span className="ml-2 font-semibold text-gold">{activeCategoryIds.filter(id => categories.find(c => c.id === id)?.type === "income").length}/{categories.filter(c => c.type === "income").length}</span>
  </div>
  <div>
  <span className="font-medium text-gold">Dépenses actives</span>
  <span className="ml-2 font-semibold text-gold">{activeCategoryIds.filter(id => categories.find(c => c.id === id)?.type === "expense").length}/{categories.filter(c => c.type === "expense").length}</span>
  </div>
  </div>
  <button
  onClick={handleSubscribe}
  className="btn-primary w-full justify-center"
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
  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${isTypeLocked ? "bg-gold-light text-gold" : "bg-sand text-muted"}`}>({activeOfType}/3 actives)</span>
  )}
  </div>
  <button onClick={() => addPresetCategories(type)} disabled={presetLoading} className="text-xs text-brand hover:text-brand font-medium disabled:opacity-40">+ Catégories par défaut</button>
  </div>

  {categories.filter(c => !c.archived && c.type === type).length === 0 ? (
  <p className="text-sm text-muted">Aucune catégorie de {typeLabel.toLowerCase()}</p>
  ) : (
  <div className="flex flex-wrap gap-2">
  {categories.filter(c => !c.archived && c.type === type).map((cat) => {
  const isActive = activeCategoryIds.includes(cat.id);
  return (
  <div key={cat.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border ${
  isActive
  ? "bg-gold-light text-brand border-transparent"
  : "bg-sand text-muted border-border"
  }`}>
  {!isActive && <FontAwesomeIcon icon={faLock} className="w-3 h-3 shrink-0" />}
  <span className={!isActive ? "opacity-70" : ""}>{cat.name}</span>
  <button
  onClick={(e) => { e.stopPropagation(); setConfirmDeleteCat(cat.id); }}
  className={`hover:text-neg transition-colors ml-0.5 ${isActive ? "text-brand" : "text-muted"}`}
  title="Supprimer"
  >
  <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
  </button>
  {!isActive && (
  <span className="text-[10px] font-medium bg-white/60 text-muted px-1.5 py-0.5 rounded">Premium</span>
  )}
  </div>
  );
  })}
  </div>
  )}

  {/* Archived categories for this type */}
  {categories.filter(c => c.archived && c.type === type).length > 0 && (
  <details className="mt-2 group">
  <summary className="text-xs text-muted cursor-pointer hover:text-ink transition-colors list-none flex items-center gap-1.5">
  <span className="text-[10px] font-medium bg-border text-muted px-1.5 py-0.5 rounded">
  {categories.filter(c => c.archived && c.type === type).length} archivée{(categories.filter(c => c.archived && c.type === type).length) > 1 ? "s" : ""}
  </span>
  <svg className={`w-3 h-3 transition-transform group-open:rotate-90`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
  </summary>
  <div className="flex flex-wrap gap-2 mt-2">
  {categories.filter(c => c.archived && c.type === type).map((cat) => (
  <div key={cat.id} className="flex items-center gap-1.5 bg-sand text-muted px-3 py-1.5 rounded-xl text-sm border border-border opacity-70">
  <FontAwesomeIcon icon={faLock} className="w-3 h-3 shrink-0" />
  <span className="opacity-70">{cat.name}</span>
  <button
  onClick={(e) => { e.stopPropagation(); handleRestoreCategory(cat.id); }}
  className="text-muted hover:text-brand transition-colors ml-0.5"
  title="Restaurer"
  >
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
  </button>
  <button
  onClick={(e) => { e.stopPropagation(); setConfirmDeleteCat(cat.id); }}
  className="text-muted hover:text-neg transition-colors"
  title="Supprimer définitivement"
  >
  <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
  </button>
  </div>
  ))}
  </div>
  </details>
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
  {catError && <p className="text-neg text-sm">{catError}</p>}
  </div>

 {/* DANGER ZONE */}
 <p className="text-label mb-3">Zone de danger</p>
 <div className="card" style={{ borderColor: "var(--color-neg-border)", background: "var(--color-neg-bg)" }}>
 <div className="flex items-center gap-3 mb-3">
 <FontAwesomeIcon icon={faTriangleExclamation} className="w-5 h-5" style={{ color: "var(--color-neg)" }} />
 <h2 className="text-base font-semibold" style={{ color: "var(--color-neg)" }}>Réinitialisation</h2>
 </div>
 <p className="text-sm" style={{ color: "var(--color-body)" }}>Supprime toutes vos données. Action irréversible.</p>
 <button onClick={() => setShowResetModal(true)} className="btn-danger flex items-center gap-2 mt-4">
 <FontAwesomeIcon icon={faRotateLeft} className="w-4 h-4" />
 Réinitialiser toutes les données
 </button>
   {resetDone && <p className="mt-3 text-sm px-3 py-2 rounded-xl text-pos bg-pos-bg"><FontAwesomeIcon icon={faCheck} className="w-4 h-4 mr-1" /> Données réinitialisées.</p>}
 </div>

 <div className="card mt-4" style={{ borderColor: "var(--color-neg-border)", background: "var(--color-neg-bg)" }}>
 <div className="flex items-center gap-3 mb-3">
 <FontAwesomeIcon icon={faTrash} className="w-5 h-5" style={{ color: "var(--color-neg)" }} />
 <h2 className="text-base font-semibold" style={{ color: "var(--color-neg)" }}>Supprimer mon compte</h2>
 </div>
 <p className="text-sm" style={{ color: "var(--color-body)" }}>Supprime définitivement votre compte et toutes vos données.</p>
 <button onClick={() => setShowDeleteAccountModal(true)} className="btn-danger flex items-center gap-2 mt-4">
 <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
 Supprimer définitivement
 </button>
 </div>

 {/* LOGOUT */}
 <div className="border-t border-border pt-6">
  <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-muted hover:text-neg transition-colors">
 <FontAwesomeIcon icon={faRightFromBracket} className="w-4 h-4" />
 Déconnexion
 </button>
 </div>

 <ConfirmModal open={showDeleteAccountModal} title="Supprimer votre compte ?" message="Cette action est irréversible." confirmLabel={deleteLoading ? "Suppression..." : "Oui, supprimer"} cancelLabel="Annuler" variant="danger" onConfirm={handleDeleteAccount} onCancel={() => setShowDeleteAccountModal(false)} />
 <ConfirmModal open={showResetModal} title="Réinitialiser toutes les données ?" message="Toutes vos transactions, ventes, produits et catégories seront supprimés." confirmLabel={resetLoading ? "Réinitialisation..." : "Oui, tout supprimer"} cancelLabel="Annuler" variant="danger" onConfirm={handleResetAll} onCancel={() => setShowResetModal(false)} />
  <ConfirmModal open={confirmDeleteCat !== null} title="Supprimer cette catégorie ?" message="Cette catégorie sera définitivement supprimée. Les transactions liées ne seront plus associées à une catégorie." confirmLabel="Oui, supprimer" cancelLabel="Annuler" variant="warning" onConfirm={() => handleDeleteCategory(confirmDeleteCat!)} onCancel={() => setConfirmDeleteCat(null)} />
 </div>
 );
}
