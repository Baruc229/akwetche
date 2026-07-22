"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser, faShield, faBell, faCrown, faCircleInfo,
  faLock, faRightFromBracket, faChevronRight,
  faPhone, faMoneyBill, faCamera, faFloppyDisk,
  faXmark, faCheck, faSpinner, faTrash
} from "@fortawesome/free-solid-svg-icons";
import { useDashboard } from "../../layout";
import { setActiveCurrency, getCountryByCode, getPhonePrefix, validatePhoneMessage, validateName, type CurrencyCode } from "@/lib/utils";

export default function ComptePage() {
  const { user, setUser, currency: activeCurrency, setCurrency: setDashboardCurrency } = useDashboard();
  const router = useRouter();

  useEffect(() => { document.title = "Compte — Akwetche"; }, []);

  // ─── Avatar ───
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processAvatar = useCallback(async (file: File) => {
    setAvatarError("");
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) { setAvatarError("Format non supporté (JPEG, PNG, WebP)"); return; }
    if (file.size > 2 * 1024 * 1024) { setAvatarError("Image trop lourde (max 2 Mo)"); return; }
    setAvatarLoading(true);
    try {
      const bmp = await createImageBitmap(file);
      if (bmp.width < 200 || bmp.height < 200) { setAvatarError("Dimensions trop petites (min 200×200)"); setAvatarLoading(false); return; }
      const size = Math.min(bmp.width, bmp.height);
      const sx = (bmp.width - size) / 2;
      const sy = (bmp.height - size) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = 256; canvas.height = 256;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bmp, sx, sy, size, size, 0, 0, 256, 256);
      bmp.close();
      const blob = await new Promise<Blob>((resolve, reject) => { canvas.toBlob(b => b ? resolve(b) : reject(new Error("Erreur")), "image/webp", 0.85); });
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => { reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(blob); });
      const res = await fetch("/api/user/avatar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatar: base64 }) });
      const data = await res.json();
      if (!res.ok) { setAvatarError(data.error || "Erreur upload"); return; }
      setUser({ ...user!, avatarUrl: data.avatarUrl });
    } catch { setAvatarError("Erreur réseau"); }
    finally { setAvatarLoading(false); }
  }, [user, setUser]);

  async function handleDeleteAvatar() {
    setAvatarLoading(true);
    try {
      const res = await fetch("/api/user/avatar", { method: "DELETE" });
      if (res.ok) setUser({ ...user!, avatarUrl: null });
    } catch {} finally { setAvatarLoading(false); }
  }

  // ─── Nom ───
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [nameError, setNameError] = useState("");
  const [nameSaving, setNameSaving] = useState(false);

  async function handleSaveName() {
    setNameError("");
    const err = validateName(name);
    if (err) { setNameError(err); return; }
    setNameSaving(true);
    try {
      const res = await fetch("/api/user", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const data = await res.json();
      if (res.ok) { setUser(data.user); setEditingName(false); }
    } catch {} finally { setNameSaving(false); }
  }

  // ─── Téléphone ───
  const [editingPhone, setEditingPhone] = useState(false);
  const [phone, setPhone] = useState(user?.phone || "");
  const [phoneError, setPhoneError] = useState("");
  const [phoneSaving, setPhoneSaving] = useState(false);

  useEffect(() => {
    if (editingPhone) {
      const cc = user?.countryCode;
      if (cc && !phone) setPhone(getPhonePrefix(cc));
    }
  }, [editingPhone, user?.countryCode]);

  async function handleSavePhone() {
    setPhoneError("");
    if (phone && user?.countryCode) {
      const err = validatePhoneMessage(user.countryCode, phone);
      if (err) { setPhoneError(err); return; }
    }
    setPhoneSaving(true);
    try {
      const res = await fetch("/api/user", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
      const data = await res.json();
      if (res.ok) { setUser(data.user); setEditingPhone(false); }
    } catch {} finally { setPhoneSaving(false); }
  }

  // ─── Devise ───
  const [currencySaving, setCurrencySaving] = useState(false);

  async function handleChangeCurrency(next: "XOF" | "EUR") {
    if (next === activeCurrency) return;
    setCurrencySaving(true);
    setDashboardCurrency(next as CurrencyCode);
    setActiveCurrency(next as CurrencyCode);
    try {
      const res = await fetch("/api/user", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currency: next }) });
      const data = await res.json();
      if (res.ok) setUser(data.user);
    } catch {} finally { setCurrencySaving(false); }
  }

  // ─── Init ───
  const initials = (() => {
    const n = user?.name || "";
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase();
  })();

  const planLabel = (() => {
    if (user?.role === "super_admin" || user?.role === "admin") return "Admin";
    if (user?.subscription?.status === "active" || user?.plan === "premium") return "Premium";
    return "Gratuit";
  })();

  const isPremium = planLabel === "Premium" || planLabel === "Admin";

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <div className="max-w-lg mx-auto pb-8">
      {/* ─── BANDEAU PROFIL ─── */}
      <div className="rounded-2xl p-5 sm:p-6 mb-8" style={{ background: "linear-gradient(135deg, #0D1B35 0%, #132848 100%)" }}>
        <div className="flex items-center gap-4">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user?.name || ""} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover shrink-0" style={{ border: "3px solid #C9A84C" }} />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center shrink-0" style={{ background: "#1B3A6B", border: "3px solid #C9A84C" }}>
              <span className="text-xl sm:text-2xl font-bold" style={{ color: "#F5A623" }}>{initials}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-lg sm:text-xl font-bold text-white truncate">{user?.name}</p>
            <p className="text-xs sm:text-sm truncate mt-1" style={{ color: "#94A3B8" }}>{user?.email}</p>
          </div>
        </div>
        {isPremium && (
          <span className="inline-block mt-4 text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "rgba(245,166,35,0.15)", color: "#F5A623", border: "1px solid rgba(245,166,35,0.3)" }}>
            {planLabel}
          </span>
        )}
      </div>

      {/* ─── INFORMATIONS PERSONNELLES ─── */}
      <p className="text-xs font-semibold uppercase tracking-wider mb-4 px-1" style={{ color: "#94A3B8" }}>Informations personnelles</p>

      <div className="space-y-3 mb-8">
        {/* ── Photo de profil ── */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <div className="flex items-center gap-5 px-5 sm:px-6 py-5">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#EBF0F7" }}>
              <FontAwesomeIcon icon={faCamera} className="w-5 h-5" style={{ color: "#1B3A6B" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted mb-1">Photo de profil</p>
              <p className="text-sm font-medium text-ink">{user?.avatarUrl ? "Photo ajoutée" : "Pas de photo"}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => fileInputRef.current?.click()} disabled={avatarLoading} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all" style={{ background: "var(--color-brand-subtle)", color: "var(--color-brand)" }}>
                {avatarLoading ? <FontAwesomeIcon icon={faSpinner} className="w-3 h-3 animate-spin" /> : <>{user?.avatarUrl ? "Changer" : "Ajouter"}</>}
              </button>
              {user?.avatarUrl && (
                <button onClick={handleDeleteAvatar} disabled={avatarLoading} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all" style={{ background: "var(--color-neg-bg)", color: "var(--color-neg)" }}>
                  <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          {avatarError && <p className="px-5 pb-4 text-xs text-neg">{avatarError}</p>}
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processAvatar(f); e.target.value = ""; }} />
        </div>

        {/* ── Nom complet ── */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          {!editingName ? (
            <div className="flex items-center gap-5 px-5 sm:px-6 py-5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#EBF0F7" }}>
                <FontAwesomeIcon icon={faUser} className="w-5 h-5" style={{ color: "#1B3A6B" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted mb-1">Nom complet</p>
                <p className="text-sm font-medium text-ink truncate">{user?.name || "Non renseigné"}</p>
              </div>
              <button onClick={() => { setEditingName(true); setName(user?.name || ""); setNameError(""); }} className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all" style={{ background: "var(--color-brand-subtle)", color: "var(--color-brand)" }}>
                Modifier
              </button>
            </div>
          ) : (
            <div className="p-5 space-y-3">
              <div>
                <label className="field-label">Nom complet</label>
                <input type="text" value={name} onChange={(e) => { setName(e.target.value); setNameError(""); }} className={`input-field ${nameError ? "error" : ""}`} placeholder="Votre nom" autoFocus />
                {nameError && <p className="text-neg text-xs mt-1">{nameError}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleSaveName} disabled={nameSaving} className="btn-primary flex items-center gap-2 text-sm">
                  <FontAwesomeIcon icon={nameSaving ? faSpinner : faFloppyDisk} className={`w-4 h-4 ${nameSaving ? "animate-spin" : ""}`} />
                  Enregistrer
                </button>
                <button onClick={() => setEditingName(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-ink transition-colors">
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Téléphone ── */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          {!editingPhone ? (
            <div className="flex items-center gap-5 px-5 sm:px-6 py-5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#EBF0F7" }}>
                <FontAwesomeIcon icon={faPhone} className="w-5 h-5" style={{ color: "#1B3A6B" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted mb-1">Téléphone</p>
                <p className="text-sm font-medium text-ink truncate">{user?.phone || "Non renseigné"}</p>
              </div>
              <button onClick={() => { setEditingPhone(true); setPhone(user?.phone || ""); setPhoneError(""); }} className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all" style={{ background: "var(--color-brand-subtle)", color: "var(--color-brand)" }}>
                Modifier
              </button>
            </div>
          ) : (
            <div className="p-5 space-y-3">
              <div>
                <label className="field-label">Téléphone</label>
                <input type="tel" value={phone} onChange={(e) => { const val = e.target.value; if (user?.countryCode) { const prefix = getPhonePrefix(user.countryCode); if (val.startsWith(prefix)) { setPhone(val); setPhoneError(val.length > prefix.length ? validatePhoneMessage(user.countryCode, val) || "" : ""); } else { setPhone(prefix); } } else { setPhone(val); } }} className={`input-field ${phoneError ? "error" : ""}`} placeholder={user?.countryCode ? `${getPhonePrefix(user.countryCode)} XX XX XX XX` : "+229XXXXXXXX"} />
                {phoneError && <p className="text-neg text-xs mt-1">{phoneError}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleSavePhone} disabled={phoneSaving} className="btn-primary flex items-center gap-2 text-sm">
                  <FontAwesomeIcon icon={phoneSaving ? faSpinner : faFloppyDisk} className={`w-4 h-4 ${phoneSaving ? "animate-spin" : ""}`} />
                  Enregistrer
                </button>
                <button onClick={() => setEditingPhone(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-ink transition-colors">
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Devise ── */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <div className="flex items-center gap-5 px-5 sm:px-6 py-5">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#EBF0F7" }}>
              <FontAwesomeIcon icon={faMoneyBill} className="w-5 h-5" style={{ color: "#1B3A6B" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted mb-1">Devise d&apos;affichage</p>
              <p className="text-sm font-medium text-ink">{activeCurrency === "EUR" ? "Euro (EUR)" : "CFA (FCFA)"}</p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl shrink-0" style={{ background: "var(--color-surface-raised)" }}>
              <button onClick={() => handleChangeCurrency("XOF")} disabled={currencySaving} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeCurrency === "XOF" ? "bg-brand text-white shadow-sm" : "text-muted hover:text-ink"}`}>
                FCFA
              </button>
              <button onClick={() => handleChangeCurrency("EUR")} disabled={currencySaving} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeCurrency === "EUR" ? "bg-brand text-white shadow-sm" : "text-muted hover:text-ink"}`}>
                EUR
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── PARAMÈTRES ─── */}
      <p className="text-xs font-semibold uppercase tracking-wider mb-4 px-1" style={{ color: "#94A3B8" }}>Paramètres</p>

      <div className="space-y-3 mb-8">
        {[
          { label: "Connexion et sécurité", desc: "Email, mot de passe, sessions", icon: faShield, href: "/dashboard/settings/securite" },
          { label: "Notifications", desc: "Préférences par canal", icon: faBell, href: "/dashboard/settings/notifications" },
          { label: "Abonnement", desc: "Gérer votre plan", icon: faCrown, href: "/dashboard/settings/abonnement" },
          { label: "À propos", desc: "Version, liens utiles", icon: faCircleInfo, href: "/dashboard/settings/about" },
        ].map((item) => (
          <div key={item.href} className="rounded-2xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <Link href={item.href} className="flex items-center gap-5 px-5 sm:px-6 py-5 transition-colors hover:bg-[var(--color-brand-subtle)]">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#EBF0F7" }}>
                <FontAwesomeIcon icon={item.icon} className="w-5 h-5" style={{ color: "#1B3A6B" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink">{item.label}</p>
                <p className="text-xs mt-1 text-muted">{item.desc}</p>
              </div>
              <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4 shrink-0" style={{ color: "#94A3B8" }} />
            </Link>
          </div>
        ))}
      </div>

      {/* ─── DANGER ─── */}
      <p className="text-xs font-semibold uppercase tracking-wider mb-4 px-1" style={{ color: "#94A3B8" }}>Zone sensible</p>

      <div className="rounded-2xl overflow-hidden mb-8" style={{ background: "var(--color-surface)", border: "2px solid #B94A3E" }}>
        <Link href="/dashboard/settings/danger" className="flex items-center gap-5 px-5 sm:px-6 py-5 transition-colors hover:bg-red-50 active:bg-red-50">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#FEE8E5" }}>
            <FontAwesomeIcon icon={faLock} className="w-5 h-5" style={{ color: "#B94A3E" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: "#B94A3E" }}>Désactivation et suppression</p>
            <p className="text-xs mt-1 text-muted">Désactiver ou supprimer votre compte</p>
          </div>
          <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4 shrink-0" style={{ color: "#94A3B8" }} />
        </Link>
      </div>

      {/* ─── DÉCONNEXION ─── */}
      <button onClick={handleLogout} className="w-full py-4 rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98]" style={{ background: "#1B3A6B", color: "white" }}>
        <FontAwesomeIcon icon={faRightFromBracket} className="w-4 h-4" />
        Déconnexion
      </button>
    </div>
  );
}
