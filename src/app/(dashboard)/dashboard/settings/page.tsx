"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings, User, Plus, Trash2, Save, Tag, Globe, AlertTriangle, RotateCcw, CreditCard, ExternalLink, LogOut, Trash, Crown, Shield, Lock, Check, Star, Sparkles } from "lucide-react";
import { useDashboard } from "../../layout";
import { formatCurrency, resolveCurrency, setActiveCurrency } from "@/lib/utils";
import ConfirmModal from "@/components/ConfirmModal";

type Category = { id: number; name: string; icon: string; type: string };

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
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim(), type: newCatType, icon: "" }),
      });
      const data = await res.json();
      if (!res.ok) { setCatError(data.error || "Erreur"); return; }
      setNewCatName("");
      loadCategories();
    } catch { setCatError("Erreur"); }
  }

  async function handleDeleteCategory(id: number) {
    setConfirmDeleteCat(null);
    await fetch("/api/categories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadCategories();
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
    for (const preset of presets) {
      const exists = categories.some((c) => c.name === preset.name && c.type === preset.type);
      if (!exists) {
        await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...preset, icon: "" }) });
      }
    }
    loadCategories();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Paramètres</h1>
        <p className="text-stone-500 text-sm mt-0.5">Gérez votre profil et vos paramètres</p>
      </div>

      {/* PLAN CARD */}
      <div className="card overflow-hidden">
        {isAdmin ? (
          <div className="p-6 bg-gradient-to-r from-amber-50 to-emerald-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-stone-900">Administrateur</p>
                  <p className="text-sm text-stone-500">Accès total — toutes les fonctionnalités débloquées</p>
                </div>
              </div>
              <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full">Admin</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ALL_FEATURES.map((f) => (
                <div key={f.key} className="flex items-center gap-2 text-sm text-stone-700">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  {f.label}
                </div>
              ))}
              <div className="flex items-center gap-2 text-sm text-stone-700">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                Accès panneau d'administration
              </div>
            </div>
          </div>
        ) : subscription?.status === "active" || user?.plan === "premium" ? (
          <div className="p-6 bg-gradient-to-r from-amber-50 to-amber-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                  <Crown className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-stone-900">Premium</p>
                  <p className="text-sm text-stone-500">Toutes les fonctionnalités débloquées</p>
                </div>
              </div>
              <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">Actif</span>
            </div>
            {subscription && (
              <p className="text-sm text-stone-600 mb-4">
                {activeCurrency === "XOF" ? "5 000 FCFA" : "7,99 €"} / mois
                · Prochain renouvellement le {new Date(subscription.endDate).toLocaleDateString("fr-FR")}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {ALL_FEATURES.map((f) => (
                <div key={f.key} className="flex items-center gap-2 text-sm text-stone-700">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  {f.label}
                </div>
              ))}
            </div>
            <button
              onClick={handleSubscribe}
              disabled={subLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 transition-all disabled:opacity-50"
            >
              <ExternalLink className="w-4 h-4" />
              {subLoading ? "Chargement..." : "Gérer mon abonnement"}
            </button>
          </div>
        ) : (
          <div>
            <div className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-stone-900">Gratuit</p>
                    <p className="text-sm text-stone-500">Fonctionnalités de base</p>
                  </div>
                </div>
                <span className="bg-stone-100 text-stone-600 text-xs font-semibold px-3 py-1 rounded-full">Actif</span>
              </div>

              <div className="space-y-2 mb-4">
                {ALL_FEATURES.map((f) => (
                  <div key={f.key} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {f.free ? (
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Lock className="w-4 h-4 text-stone-300 shrink-0" />
                      )}
                      <span className={f.free ? "text-stone-700" : "text-stone-400"}>{f.label}</span>
                    </div>
                    {!f.free && (
                      <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Premium</span>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={handleSubscribe}
                disabled={subLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 transition-all shadow-sm disabled:opacity-50"
              >
                <Crown className="w-4 h-4" />
                {subLoading ? "Chargement..." : "Passer au Premium →"}
              </button>
              {subError && <p className="mt-2 text-sm text-red-600">{subError}</p>}
            </div>
          </div>
        )}
      </div>

      {/* PAYMENT BANNER */}
      {paymentMessage && (
        <div className={`p-4 rounded-2xl text-sm font-medium animate-fade-in ${paymentType === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"}`}>
          {paymentType === "success" ? "✅ " : "❌ "}{paymentMessage}
        </div>
      )}

      {/* PROFILE */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <User className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-semibold text-stone-800">Profil</h2>
        </div>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm text-stone-600 mb-1">Nom</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm text-stone-600 mb-1">Argent de départ</label>
            <input type="number" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} className="input-field" min="0" />
            <p className="text-xs text-stone-400 mt-1">Ce que vous aviez avant de commencer.</p>
          </div>
          {isPremium && (
            <div>
              <label className="block text-sm text-stone-600 mb-1">Argent de départ (activité)</label>
              <input type="number" value={initialBalanceActivity} onChange={(e) => setInitialBalanceActivity(e.target.value)} className="input-field" min="0" />
              <p className="text-xs text-stone-400 mt-1">Ce que vous aviez dans votre activité.</p>
            </div>
          )}
          <div>
            <label className="block text-sm text-stone-600 mb-1">Devise préférée</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="input-field pl-10">
                <option value="XOF">FCFA (Franc CFA)</option>
                <option value="EUR">EUR (Euro)</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn-primary flex items-center gap-2 text-sm">
            <Save className="w-4 h-4" />
            {saved ? "Enregistré ✓" : "Enregistrer"}
          </button>
        </form>
      </div>

      {/* PASSWORD */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <Lock className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-semibold text-stone-800">Mot de passe</h2>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm text-stone-600 mb-1">Mot de passe actuel</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm text-stone-600 mb-1">Nouveau mot de passe</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field" minLength={8} required />
            <p className="text-xs text-stone-400 mt-1">Minimum 8 caractères.</p>
          </div>
          <div>
            <label className="block text-sm text-stone-600 mb-1">Confirmer le nouveau mot de passe</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-field" minLength={8} required />
          </div>
          {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
          <button type="submit" className="btn-primary flex items-center gap-2 text-sm">
            <Save className="w-4 h-4" />
            {passwordSaved ? "Mis à jour ✓" : "Modifier le mot de passe"}
          </button>
        </form>
      </div>

      {/* CATEGORIES */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <Tag className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-semibold text-stone-800">Catégories</h2>
        </div>
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-stone-700">Revenus</h3>
              <button onClick={() => addPresetCategories("income")} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">+ Catégories par défaut</button>
            </div>
            {categories.filter(c => c.type === "income").length === 0 ? (
              <p className="text-sm text-stone-400">Aucune catégorie de revenu</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.filter(c => c.type === "income").map((cat) => (
                  <div key={cat.id} className="flex items-center gap-1.5 bg-teal-50 text-teal-700 px-3 py-1.5 rounded-xl text-sm">
                    {cat.name}
                    <button onClick={() => setConfirmDeleteCat(cat.id)} className="text-teal-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-stone-700">Dépenses</h3>
              <button onClick={() => addPresetCategories("expense")} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">+ Catégories par défaut</button>
            </div>
            {categories.filter(c => c.type === "expense").length === 0 ? (
              <p className="text-sm text-stone-400">Aucune catégorie de dépense</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.filter(c => c.type === "expense").map((cat) => (
                  <div key={cat.id} className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl text-sm">
                    {cat.name}
                    <button onClick={() => handleDeleteCategory(cat.id)} className="text-amber-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <form onSubmit={handleAddCategory} className="flex items-end gap-2 pt-3 border-t border-stone-100">
            <div className="flex-1">
              <label className="block text-xs text-stone-500 mb-1">Nouvelle catégorie</label>
              <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="input-field text-sm" placeholder="Nom" />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Type</label>
              <select value={newCatType} onChange={(e) => setNewCatType(e.target.value)} className="input-field text-sm">
                <option value="expense">Dépense</option>
                <option value="income">Revenu</option>
              </select>
            </div>
            <button type="submit" className="btn-primary py-2.5 px-3 text-sm"><Plus className="w-4 h-4" /></button>
          </form>
          {catError && <p className="text-red-500 text-sm">{catError}</p>}
        </div>
      </div>

      {/* RESET */}
      <div className="card p-6 border border-red-200 bg-red-50/30">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h2 className="text-base font-semibold text-stone-800">Réinitialisation</h2>
        </div>
        <p className="text-sm text-stone-600 mb-4">Supprime toutes vos données. Action irréversible.</p>
        <button onClick={() => setShowResetModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-all shadow-sm">
          <RotateCcw className="w-4 h-4" />
          Réinitialiser toutes les données
        </button>
        {resetDone && <p className="mt-3 text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl">✅ Données réinitialisées.</p>}
      </div>

      {/* DELETE ACCOUNT */}
      <div className="card p-6 border border-red-300 bg-red-50/50">
        <div className="flex items-center gap-3 mb-3">
          <Trash className="w-5 h-5 text-red-600" />
          <h2 className="text-base font-semibold text-stone-800">Supprimer mon compte</h2>
        </div>
        <p className="text-sm text-stone-600 mb-4">Supprime définitivement votre compte et toutes vos données.</p>
        <button onClick={() => setShowDeleteAccountModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-all shadow-sm">
          <Trash className="w-4 h-4" />
          Supprimer définitivement
        </button>
      </div>

      {/* LOGOUT */}
      <div className="border-t border-stone-200 pt-6">
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-stone-500 hover:text-red-600 transition-colors">
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>

      <ConfirmModal open={showDeleteAccountModal} title="Supprimer votre compte ?" message="Cette action est irréversible." confirmLabel={deleteLoading ? "Suppression..." : "Oui, supprimer"} cancelLabel="Annuler" variant="danger" onConfirm={handleDeleteAccount} onCancel={() => setShowDeleteAccountModal(false)} />
      <ConfirmModal open={showResetModal} title="Réinitialiser toutes les données ?" message="Toutes vos transactions, ventes, produits et catégories seront supprimés." confirmLabel={resetLoading ? "Réinitialisation..." : "Oui, tout supprimer"} cancelLabel="Annuler" variant="danger" onConfirm={handleResetAll} onCancel={() => setShowResetModal(false)} />
      <ConfirmModal open={confirmDeleteCat !== null} title="Supprimer cette catégorie ?" message="Les transactions liées ne seront pas supprimées." confirmLabel="Oui, supprimer" cancelLabel="Annuler" variant="warning" onConfirm={() => handleDeleteCategory(confirmDeleteCat!)} onCancel={() => setConfirmDeleteCat(null)} />
    </div>
  );
}
