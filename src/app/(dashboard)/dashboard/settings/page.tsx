"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGear, faUser, faPlus, faTrash, faFloppyDisk, faTag, faGlobe, faTriangleExclamation, faRotateLeft, faCreditCard, faUpRightFromSquare, faRightFromBracket, faCrown, faShield, faLock, faCheck, faCircleCheck, faStar, faXmark, faArrowRight, faEye, faEyeSlash, faDesktop, faLaptop, faMobileScreen, faGlobeAmericas, faRightFromBracket as faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { useDashboard } from "../../layout";
import { formatCurrency, resolveCurrency, setActiveCurrency, getCountryByCode, getPhonePrefix, COUNTRY_OPTIONS, validatePhoneMessage, validateName, toDisplayCurrency, toStorageCurrency, roundByCurrency, type CurrencyCode } from "@/lib/utils";
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
  const [settingsTab, setSettingsTab] = useState<"abonnement" | "profil" | "securite" | "notifications" | "categories" | "about" | "danger">("profil");
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategoryIds, setActiveCategoryIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(user?.name || "");
  const [currency, setCurrency] = useState(user?.currency || getCountryByCode(user?.countryCode || "")?.currency || "XOF");
  const [initialBalance, setInitialBalance] = useState(() => {
    const dc = currency as CurrencyCode;
    return String(roundByCurrency(toDisplayCurrency(user?.initialBalance || 0, dc), dc));
  });
  const [initialBalanceActivity, setInitialBalanceActivity] = useState(() => {
    const dc = currency as CurrencyCode;
    return String(roundByCurrency(toDisplayCurrency(user?.initialBalanceActivity || 0, dc), dc));
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
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
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
  const [sessions, setSessions] = useState<{ id: number; ipAddress: string; userAgent: string; lastActive: string; createdAt: string; isCurrent: boolean }[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [disconnectAllLoading, setDisconnectAllLoading] = useState(false);
  const [mobileTabOpen, setMobileTabOpen] = useState(false);
  const tabDropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (settingsTab === "securite") loadSessions();
  }, [settingsTab]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (tabDropdownRef.current && !tabDropdownRef.current.contains(e.target as Node)) setMobileTabOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Convertir les soldes affichés quand la devise change
  useEffect(() => {
    const prev = prevCurrencyRef.current;
    if (prev !== currency) {
      const to = currency as CurrencyCode;
      // Convert base value (FCFA) → new display currency
      const baseVal = baseBalanceRef.current;
      const newDisplay = roundByCurrency(toDisplayCurrency(baseVal, to), to);
      setInitialBalance(String(newDisplay));
      const baseActVal = baseActivityRef.current;
      const newActDisplay = roundByCurrency(toDisplayCurrency(baseActVal, to), to);
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

  async function loadSessions() {
    setSessionsLoading(true);
    try {
      const res = await fetch("/api/user/sessions");
      if (res.ok) { const data = await res.json(); setSessions(data.sessions || []); }
    } catch {} finally { setSessionsLoading(false); }
  }

  async function handleDisconnectSession(id: number) {
    try {
      await fetch(`/api/user/sessions/${id}`, { method: "DELETE" });
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch {}
  }

  async function handleDisconnectAll() {
    setDisconnectAllLoading(true);
    try {
      await fetch("/api/user/sessions", { method: "DELETE" });
      setSessions(prev => prev.filter(s => s.isCurrent));
    } catch {} finally { setDisconnectAllLoading(false); }
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
      const updatedDc = resolveCurrency(data.user?.currency) as CurrencyCode;
      setInitialBalance(String(roundByCurrency(toDisplayCurrency(balanceInBase, updatedDc), updatedDc)));
      setInitialBalanceActivity(String(roundByCurrency(toDisplayCurrency(activityInBase, updatedDc), updatedDc)));
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

 async function handleDeactivateAccount() {
  setDeactivateLoading(true);
  try {
    await fetch("/api/auth/deactivate-account", { method: "POST" });
    router.push("/");
  } catch { setDeactivateLoading(false); setShowDeactivateModal(false); }
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

  const TABS = [
    { key: "abonnement" as const, label: "Abonnement" },
    { key: "profil" as const, label: "Profil" },
    { key: "securite" as const, label: "Connexion et sécurité" },
    { key: "notifications" as const, label: "Notifications" },
    { key: "categories" as const, label: "Catégories" },
    { key: "about" as const, label: "À propos" },
    { key: "danger" as const, label: "Danger" },
  ];

  return (
  <div>
  <div className="mb-6">
  <h1 className="text-2xl font-bold text-ink">Paramètres</h1>
  <p className="text-muted text-sm mt-0.5">Gérez votre profil et vos paramètres</p>
  </div>

  {loadError && (
  <div className="alert-inline neg mb-6">
  <FontAwesomeIcon icon={faTriangleExclamation} className="w-5 h-5 shrink-0 mt-0.5" />
  <p className="text-sm flex-1">{loadError}</p>
  <button onClick={() => setLoadError(null)} className="shrink-0 hover:opacity-70"><FontAwesomeIcon icon={faXmark} className="w-4 h-4" /></button>
  </div>
  )}

  {/* Tabs — mobile: dropdown selector */}
  <div className="lg:hidden mb-4 relative" ref={tabDropdownRef}>
    <button
      onClick={() => setMobileTabOpen(!mobileTabOpen)}
      className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-brand)' }}
    >
      {TABS.find(t => t.key === settingsTab)?.label || "Menu"}
      <FontAwesomeIcon icon={faChevronDown} className="w-3 h-3 transition-transform" style={{ transform: mobileTabOpen ? 'rotate(180deg)' : 'rotate(0)', color: 'var(--color-muted)' }} />
    </button>
    {mobileTabOpen && (
      <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50 shadow-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setSettingsTab(tab.key); setMobileTabOpen(false); }}
            className="w-full text-left px-4 py-3 text-sm font-medium transition-all"
            style={{
              background: settingsTab === tab.key ? 'var(--color-brand-subtle)' : 'transparent',
              color: settingsTab === tab.key ? 'var(--color-brand)' : 'var(--color-ink)',
              fontWeight: settingsTab === tab.key ? 600 : 500,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
    )}
  </div>

  <div className="flex gap-6">
  {/* Sidebar navigation — desktop */}
  <nav className="hidden lg:block w-52 shrink-0">
    <div className="sticky top-24 space-y-0.5">
      {TABS.map(tab => (
        <button
          key={tab.key}
          onClick={() => setSettingsTab(tab.key)}
          className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
          style={{
            background: settingsTab === tab.key ? 'var(--color-brand-subtle)' : 'transparent',
            color: settingsTab === tab.key ? 'var(--color-brand)' : 'var(--color-muted)',
            fontWeight: settingsTab === tab.key ? 600 : 500,
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  </nav>

  {/* Content */}
  <div className="flex-1 min-w-0 space-y-6 max-w-2xl">

  {/* ABONNEMENT */}
  {settingsTab === "abonnement" && (
  <>
  <p className="text-label mb-3">Abonnement</p>
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
  Accès panneau d&apos;administration
  </div>
  </div>
  </div>
  ) : (() => {
    const isActive = subscription?.status === "active" || user?.plan === "premium";
    const endDate = subscription?.endDate ? new Date(subscription.endDate) : null;
    const daysRemaining = endDate ? Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;
    const isExpiringSoon = isActive && daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;
    const isExpired = subscription?.status === "expired" || (daysRemaining !== null && daysRemaining <= 0);
    const isCancelled = subscription?.status === "cancelled" && isActive;

    if (isActive && !isExpired) {
      return (
  <div className="card" style={{ border: isExpiringSoon ? '2px solid var(--color-warn, #F59E0B)' : '2px solid var(--color-gold, #C9A84C)', background: isExpiringSoon ? 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)' : 'linear-gradient(135deg, #FFFBEB 0%, #FEF9C3 100%)' }}>
  <div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-3">
  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: isExpiringSoon ? 'rgba(245,158,11,0.15)' : 'rgba(201,168,76,0.2)' }}>
  <FontAwesomeIcon icon={faCrown} className="w-6 h-6" style={{ color: isExpiringSoon ? 'var(--color-warn, #D97706)' : 'var(--color-gold, #B8860B)' }} />
  </div>
  <div>
  <p className="text-lg font-bold text-ink">Premium</p>
  <p className="text-sm text-muted">Toutes les fonctionnalités débloquées</p>
  </div>
  </div>
  <span className="badge" style={isExpiringSoon ? { background: 'rgba(245,158,11,0.15)', color: '#92400E' } : isCancelled ? { background: 'rgba(107,114,128,0.12)', color: '#374151' } : { background: 'rgba(34,197,94,0.12)', color: '#166534' }}>
  {isCancelled ? 'Annulé' : isExpiringSoon ? 'Expire bientôt' : 'Actif'}
  </span>
  </div>

  {isExpiringSoon && (
  <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: 'rgba(245,158,11,0.12)' }}>
  <FontAwesomeIcon icon={faTriangleExclamation} className="w-5 h-5 shrink-0" style={{ color: 'var(--color-warn, #D97706)' }} />
  <div>
  <p className="text-sm font-semibold" style={{ color: '#92400E' }}>Votre abonnement expire dans {daysRemaining} jour{daysRemaining! > 1 ? 's' : ''}</p>
  <p className="text-xs mt-0.5" style={{ color: '#A16207' }}>Renouvelez pour continuer à profiter de toutes les fonctionnalités.</p>
  </div>
  </div>
  )}

  <p className="text-sm text-muted mb-4">
  {subscription && `${activeCurrency === "XOF" ? "5 000 FCFA" : "7,99 €"} / mois`}
  {endDate && ` · Renouvellement le ${endDate.toLocaleDateString("fr-FR", { day: 'numeric', month: 'long', year: 'numeric' })}`}
  {isCancelled && ` · Accès maintenu jusqu'au ${endDate?.toLocaleDateString("fr-FR", { day: 'numeric', month: 'long', year: 'numeric' })}`}
  </p>

  <div className="grid grid-cols-2 gap-2 mb-4">
  {ALL_FEATURES.map((f) => (
  <div key={f.key} className="flex items-center gap-2 text-sm text-ink">
  <FontAwesomeIcon icon={faCheck} className="w-4 h-4 shrink-0" style={{ color: '#16A34A' }} />
  {f.label}
  </div>
  ))}
  </div>

  <button
  onClick={handleSubscribe}
  disabled={subLoading}
  className="btn-primary"
  style={isExpiringSoon ? { background: 'var(--color-warn, #D97706)' } : {}}
  >
  <FontAwesomeIcon icon={faUpRightFromSquare} className="w-4 h-4" />
  {subLoading ? "Chargement..." : isExpiringSoon ? "Renouveler maintenant" : "Gérer mon abonnement"}
  </button>
  </div>
      );
    }

    return (
  <div className="space-y-4">
  <div className="card">
  <div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-3">
  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--color-brand-subtle)' }}>
  <FontAwesomeIcon icon={faStar} className="w-6 h-6" style={{ color: 'var(--color-brand)' }} />
  </div>
  <div>
  <p className="text-lg font-bold text-ink">Gratuit</p>
  <p className="text-sm text-muted">Fonctionnalités de base</p>
  </div>
  </div>
  <span className="badge" style={{ background: 'var(--color-surface-raised)', color: 'var(--color-muted)' }}>Actif</span>
  </div>

  <div className="space-y-2.5 mb-5">
  {ALL_FEATURES.map((f) => (
  <div key={f.key} className="flex items-center justify-between text-sm">
  <div className="flex items-center gap-2.5">
  {f.free ? (
  <FontAwesomeIcon icon={faCheck} className="w-4 h-4 shrink-0" style={{ color: '#16A34A' }} />
  ) : (
  <FontAwesomeIcon icon={faLock} className="w-4 h-4 shrink-0" style={{ color: 'var(--color-muted)' }} />
  )}
  <span style={{ color: f.free ? 'var(--color-ink)' : 'var(--color-muted)' }}>{f.label}</span>
  </div>
  {!f.free && (
  <span className="badge" style={{ background: 'rgba(201,168,76,0.12)', color: '#92400E', fontSize: '11px' }}>Premium</span>
  )}
  </div>
  ))}
  </div>

  <button onClick={handleSubscribe} disabled={subLoading} className="btn-primary w-full">
  <FontAwesomeIcon icon={faCrown} className="w-4 h-4" />
  {subLoading ? "Chargement..." : "Passer au Premium →"}
  </button>
  {subError && <p className="mt-2 text-sm text-neg">{subError}</p>}
  </div>

  <div className="card" style={{ border: '2px solid var(--color-gold, #C9A84C)' }}>
  <p className="text-sm font-semibold text-ink mb-3">Premium</p>
  <div className="flex items-baseline gap-1 mb-4">
  <span className="text-3xl font-bold" style={{ color: 'var(--color-gold, #B8860B)', fontFamily: 'var(--font-dm-sans)' }}>
  {activeCurrency === "XOF" ? "5 000" : "7,99"}
  </span>
  <span className="text-sm font-medium text-muted">
  {activeCurrency === "XOF" ? "FCFA" : "€"}/mois
  </span>
  </div>
  <div className="space-y-2.5 mb-5">
  {ALL_FEATURES.filter(f => !f.free).map((f) => (
  <div key={f.key} className="flex items-center gap-2.5 text-sm">
  <FontAwesomeIcon icon={faCheck} className="w-4 h-4 shrink-0" style={{ color: '#16A34A' }} />
  <span className="text-ink">{f.label}</span>
  </div>
  ))}
  </div>
  <button onClick={handleSubscribe} disabled={subLoading} className="w-full py-3 rounded-xl text-sm font-semibold transition-all text-white" style={{ background: 'linear-gradient(135deg, var(--color-gold, #C9A84C), #D4A843)' }}>
  {subLoading ? "Chargement..." : "Commencer maintenant"}
  </button>
  </div>
  </div>
    );
  })()}
  </>
  )}

  {/* PAYMENT BANNER */}
  {settingsTab === "abonnement" && paymentMessage && (
  <div className={`alert-inline animate-fade-in ${paymentType === "success" ? "pos" : "warn"}`}>
   <FontAwesomeIcon icon={paymentType === "success" ? faCircleCheck : faXmark} className="w-4 h-4 shrink-0 mt-0.5" />
   <span>{paymentMessage}</span>
  </div>
  )}

  {/* PROFILE */}
  {settingsTab === "profil" && (
  <>
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
    placeholder="Votre nom"
    required
  />
  {nameError && <p className="text-neg text-xs mt-1">{nameError}</p>}
  </div>
 <div>
  <label className="field-label">Argent de départ</label>
  <div className="relative">
  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm font-semibold pointer-events-none">{currency === "XOF" ? "FCFA" : "EUR"}</span>
  <input type="number" value={initialBalance} onChange={(e) => { setInitialBalance(e.target.value); const v = parseFloat(e.target.value) || 0; const dc = currency as CurrencyCode; baseBalanceRef.current = toStorageCurrency(v, dc); }} className="input-field pl-16" placeholder="0" min="0" step="any" />
  </div>
  <p className="text-xs text-muted mt-1">Ce que vous aviez avant de commencer.</p>
 </div>
 {isPremium && (
 <div>
  <label className="field-label">Argent de départ (activité)</label>
  <div className="relative">
  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm font-semibold pointer-events-none">{currency === "XOF" ? "FCFA" : "EUR"}</span>
  <input type="number" value={initialBalanceActivity} onChange={(e) => { setInitialBalanceActivity(e.target.value); const v = parseFloat(e.target.value) || 0; const dc = currency as CurrencyCode; baseActivityRef.current = toStorageCurrency(v, dc); }} className="input-field pl-16" placeholder="0" min="0" step="any" />
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
 </>
 )}

{/* CONNEXION ET SÉCURITÉ */}
{settingsTab === "securite" && (
<>
{/* Mot de passe */}
<p className="text-label mb-3">Mot de passe</p>
<div className="card">
<form onSubmit={handleChangePassword} className="space-y-4">
<div>
  <label className="field-label">Mot de passe actuel</label>
  <div style={{ position: "relative" }}>
    <input type={showCurrent ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input-field pr-10" placeholder="Mot de passe actuel" required />
    <button type="button" onClick={() => setShowCurrent(!showCurrent)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-body" tabIndex={-1}>
      <FontAwesomeIcon icon={showCurrent ? faEyeSlash : faEye} />
    </button>
  </div>
</div>
<div>
  <label className="field-label">Nouveau mot de passe</label>
  <div style={{ position: "relative" }}>
    <input type={showNew ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field pr-10" placeholder="Nouveau mot de passe" minLength={8} required />
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
    <input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-field pr-10" placeholder="Confirmer le mot de passe" minLength={8} required />
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

{/* Sessions actives */}
<p className="text-label mb-3 mt-6">Sessions actives</p>
<div className="card">
  <p className="text-sm text-muted mb-4">Appareils connectés à votre compte. Déconnectez les sessions que vous ne reconnaissez pas.</p>
  {sessionsLoading ? (
    <div className="space-y-3">
      {[1, 2].map(i => <div key={i} className="skeleton h-16 w-full rounded-xl" />)}
    </div>
  ) : (
    <div className="space-y-3">
      {sessions.map(s => {
        const ua = s.userAgent || "";
        const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
        const isTablet = /iPad|Tablet/i.test(ua);
        const deviceIcon = isMobile ? faMobileScreen : isTablet ? faLaptop : faDesktop;
        const browserMatch = ua.match(/(Chrome|Firefox|Safari|Edge|Opera|OPR)\/[\d.]+/);
        const browser = browserMatch ? browserMatch[0].split("/")[0] : "Navigateur inconnu";
        const osMatch = ua.match(/(Windows NT 10|Mac OS X|Linux|Android|iOS|iPhone OS)[\s;)]*/i);
        const os = osMatch ? osMatch[1].replace("NT 10", "Windows 10").replace("Mac OS X", "macOS") : "Système inconnu";
        const ago = (() => {
          const diff = Math.floor((Date.now() - new Date(s.lastActive).getTime()) / 1000);
          if (diff < 60) return "À l'instant";
          if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
          if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
          return `Il y a ${Math.floor(diff / 86400)} j`;
        })();
        return (
          <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)]" style={{ background: s.isCurrent ? 'var(--color-brand-subtle)' : 'var(--color-surface-raised)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.isCurrent ? 'var(--color-brand)' : 'var(--color-border)', color: s.isCurrent ? 'white' : 'var(--color-muted)' }}>
              <FontAwesomeIcon icon={deviceIcon} className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-ink truncate">{browser} · {os}</p>
                {s.isCurrent && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-brand)] text-white shrink-0">Cet appareil</span>}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted">{s.ipAddress || "IP inconnue"}</span>
                <span className="text-muted/40 text-xs">·</span>
                <span className="text-xs text-muted">{ago}</span>
              </div>
            </div>
            {!s.isCurrent && (
              <button onClick={() => handleDisconnectSession(s.id)} className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-[var(--color-neg-bg)]" style={{ color: 'var(--color-neg)' }}>
                <FontAwesomeIcon icon={faRightFromBracket} className="w-3 h-3 mr-1" />
                Déconnecter
              </button>
            )}
          </div>
        );
      })}
      {sessions.length === 0 && (
        <p className="text-sm text-muted text-center py-4">Aucune session active.</p>
      )}
    </div>
  )}
  {sessions.filter(s => !s.isCurrent).length > 0 && (
    <button onClick={handleDisconnectAll} disabled={disconnectAllLoading} className="mt-4 w-full py-2.5 rounded-xl text-sm font-medium border border-[var(--color-neg)] transition-all hover:bg-[var(--color-neg-bg)]" style={{ color: 'var(--color-neg)' }}>
      {disconnectAllLoading ? "Déconnexion..." : "Déconnecter tous les autres appareils"}
    </button>
  )}
</div>
   </>
   )}

  {/* NOTIFICATIONS */}
  {settingsTab === "notifications" && (
  <>
  <p className="text-label mb-3">Notifications</p>
  <div className="card space-y-4">
    <p className="text-sm text-muted">Choisissez les notifications que vous souhaitez recevoir.</p>
    {[
      { key: "transaction", label: "Transactions", desc: "Quand une transaction est créée ou modifiée" },
      { key: "tontine", label: "Tontines", desc: "Rappels de cotisation et mises à jour" },
      { key: "sale", label: "Ventes", desc: "Nouvelles ventes et changements de statut" },
      { key: "stock", label: "Stock", desc: "Alertes de stock bas" },
      { key: "subscription", label: "Abonnement", desc: "Renouvellements et changements de plan" },
      { key: "system", label: "Système", desc: "Mises à jour et maintenance" },
    ].map(item => (
      <div key={item.key} className="flex items-center justify-between py-2">
        <div>
          <p className="text-sm font-medium text-ink">{item.label}</p>
          <p className="text-xs text-muted mt-0.5">{item.desc}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-border text-brand accent-[var(--color-brand)]" />
            Email
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-border text-brand accent-[var(--color-brand)]" />
            In-app
          </label>
        </div>
      </div>
    ))}
    <button className="btn-primary w-full justify-center flex items-center gap-2 text-sm">
      <FontAwesomeIcon icon={faFloppyDisk} className="w-4 h-4" />
      Enregistrer les préférences
    </button>
  </div>
  </>
  )}

  {/* CATEGORIES */}
  {settingsTab === "categories" && (
  <>
  <p className="text-label mb-3">Catégories</p>
  <div className="card">
    <p className="text-sm text-muted mb-3">Gérez vos catégories de revenus et dépenses depuis la page dédiée.</p>
    <Link href="/dashboard/categories" className="btn-primary w-full justify-center flex items-center gap-2 text-sm">
      <FontAwesomeIcon icon={faTag} className="w-4 h-4" />
      Gérer les catégories →
    </Link>
   </div>
   </>
   )}

  {/* À PROPOS */}
  {settingsTab === "about" && (
  <>
  <p className="text-label mb-3">À propos</p>
  <div className="card space-y-4">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--color-brand)', color: 'white' }}>
        <span className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>A</span>
      </div>
      <div>
        <p className="text-base font-bold text-ink" style={{ fontFamily: 'var(--font-display)' }}>Akwetche</p>
        <p className="text-xs text-muted">Version 1.0.0</p>
      </div>
    </div>
    <p className="text-sm text-muted">Gestion de finances personnelle et commerciale. Simple, clair, efficace.</p>
    <div className="space-y-1">
      <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm text-ink hover:bg-[var(--color-brand-subtle)] transition-colors">
        <FontAwesomeIcon icon={faGlobeAmericas} className="w-4 h-4 text-muted" />
        Site officiel
        <FontAwesomeIcon icon={faUpRightFromSquare} className="w-3 h-3 text-muted ml-auto" />
      </a>
      <a href="/mentions-legales" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm text-ink hover:bg-[var(--color-brand-subtle)] transition-colors">
        <FontAwesomeIcon icon={faShield} className="w-4 h-4 text-muted" />
        Mentions légales
        <FontAwesomeIcon icon={faUpRightFromSquare} className="w-3 h-3 text-muted ml-auto" />
      </a>
      <a href="/cgu" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm text-ink hover:bg-[var(--color-brand-subtle)] transition-colors">
        <FontAwesomeIcon icon={faLock} className="w-4 h-4 text-muted" />
        Conditions générales d&apos;utilisation
        <FontAwesomeIcon icon={faUpRightFromSquare} className="w-3 h-3 text-muted ml-auto" />
      </a>
      <a href="/politique-confidentialite" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm text-ink hover:bg-[var(--color-brand-subtle)] transition-colors">
        <FontAwesomeIcon icon={faShield} className="w-4 h-4 text-muted" />
        Politique de confidentialité
        <FontAwesomeIcon icon={faUpRightFromSquare} className="w-3 h-3 text-muted ml-auto" />
      </a>
      <a href="mailto:support@akwetche.com" className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm text-ink hover:bg-[var(--color-brand-subtle)] transition-colors">
        <FontAwesomeIcon icon={faCircleCheck} className="w-4 h-4 text-muted" />
        Contacter le support
      </a>
    </div>
  </div>
  </>
  )}

 {/* DANGER ZONE */}
 {settingsTab === "danger" && (
 <>
 <p className="text-label mb-3">Zone de danger</p>

 {/* Désactivation — réversible */}
 <div className="card" style={{ borderColor: "var(--color-warn-border, #E5E7EB)", background: "var(--color-warn-bg, #FFFBEB)" }}>
 <div className="flex items-center gap-3 mb-3">
 <FontAwesomeIcon icon={faLock} className="w-5 h-5" style={{ color: "var(--color-warn, #D97706)" }} />
 <h2 className="text-base font-semibold" style={{ color: "var(--color-warn, #D97706)" }}>Désactiver mon compte</h2>
 </div>
 <p className="text-sm mb-1" style={{ color: "var(--color-body)" }}>Votre compte sera masqué et vous serez déconnecté. Vous pouvez le réactiver à tout moment en vous reconnectant avec votre email et mot de passe.</p>
 <p className="text-xs mb-3" style={{ color: "var(--color-muted)" }}>Aucune donnée ne sera supprimée.</p>
 <button onClick={() => setShowDeactivateModal(true)} className="flex items-center gap-2 mt-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all hover:bg-amber-50" style={{ borderColor: "var(--color-warn, #D97706)", color: "var(--color-warn, #D97706)" }}>
 <FontAwesomeIcon icon={faLock} className="w-4 h-4" />
 Désactiver mon compte
 </button>
 </div>

 {/* Réinitialisation — irréversible */}
 <div className="card mt-4" style={{ borderColor: "var(--color-neg-border)", background: "var(--color-neg-bg)" }}>
 <div className="flex items-center gap-3 mb-3">
 <FontAwesomeIcon icon={faRotateLeft} className="w-5 h-5" style={{ color: "var(--color-neg)" }} />
 <h2 className="text-base font-semibold" style={{ color: "var(--color-neg)" }}>Réinitialisation</h2>
 </div>
 <p className="text-sm" style={{ color: "var(--color-body)" }}>Supprime toutes vos données (transactions, ventes, produits, catégories). Votre compte reste actif.</p>
 <button onClick={() => setShowResetModal(true)} className="btn-danger flex items-center gap-2 mt-4">
 <FontAwesomeIcon icon={faRotateLeft} className="w-4 h-4" />
 Réinitialiser toutes les données
 </button>
   {resetDone && <p className="mt-3 text-sm px-3 py-2 rounded-xl text-pos bg-pos-bg"><FontAwesomeIcon icon={faCheck} className="w-4 h-4 mr-1" /> Données réinitialisées.</p>}
 </div>

 {/* Suppression — définitive */}
 <div className="card mt-4" style={{ borderColor: "var(--color-neg-border)", background: "var(--color-neg-bg)" }}>
 <div className="flex items-center gap-3 mb-3">
 <FontAwesomeIcon icon={faTrash} className="w-5 h-5" style={{ color: "var(--color-neg)" }} />
 <h2 className="text-base font-semibold" style={{ color: "var(--color-neg)" }}>Supprimer mon compte</h2>
 </div>
 <p className="text-sm mb-1" style={{ color: "var(--color-body)" }}>Supprime définitivement votre compte et toutes vos données. Cette action est irréversible.</p>
 <p className="text-xs mb-3 font-medium" style={{ color: "var(--color-neg)" }}>Vous ne pourrez pas récupérer votre compte.</p>
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
 </>
 )}

 <ConfirmModal open={showDeleteAccountModal} title="Supprimer votre compte ?" message="Cette action est irréversible. Toutes vos données seront définitivement supprimées." confirmLabel={deleteLoading ? "Suppression..." : "Oui, supprimer"} cancelLabel="Annuler" variant="danger" onConfirm={handleDeleteAccount} onCancel={() => setShowDeleteAccountModal(false)} />
 <ConfirmModal open={showDeactivateModal} title="Désactiver votre compte ?" message="Vous serez déconnecté. Vous pourrez réactiver votre compte en vous reconnectant." confirmLabel={deactivateLoading ? "Désactivation..." : "Oui, désactiver"} cancelLabel="Annuler" variant="warning" onConfirm={handleDeactivateAccount} onCancel={() => setShowDeactivateModal(false)} />
 <ConfirmModal open={showResetModal} title="Réinitialiser toutes les données ?" message="Toutes vos transactions, ventes, produits et catégories seront supprimés." confirmLabel={resetLoading ? "Réinitialisation..." : "Oui, tout supprimer"} cancelLabel="Annuler" variant="danger" onConfirm={handleResetAll} onCancel={() => setShowResetModal(false)} />
  <ConfirmModal open={confirmDeleteCat !== null} title="Supprimer cette catégorie ?" message="Cette catégorie sera définitivement supprimée. Les transactions liées ne seront plus associées à une catégorie." confirmLabel="Oui, supprimer" cancelLabel="Annuler" variant="warning" onConfirm={() => handleDeleteCategory(confirmDeleteCat!)} onCancel={() => setConfirmDeleteCat(null)} />
 </div>
 </div>
 </div>
 );
}
