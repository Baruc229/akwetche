"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser, faShield, faBell, faCrown, faCircleInfo,
  faLock, faRightFromBracket, faChevronRight,
  faPhone, faMoneyBill, faIdCard, faSpinner, faStar, faCamera, faPeopleGroup
} from "@fortawesome/free-solid-svg-icons";
import { useDashboard } from "../../layout";
import UserAvatar from "@/components/settings/UserAvatar";

export default function ComptePage() {
  const { user, setUser } = useDashboard();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processAvatar = useCallback(async (file: File) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) return;
    if (file.size > 2 * 1024 * 1024) return;
    setAvatarLoading(true);
    try {
      const bmp = await createImageBitmap(file);
      if (bmp.width < 200 || bmp.height < 200) { setAvatarLoading(false); return; }
      const size = Math.min(bmp.width, bmp.height);
      const sx = (bmp.width - size) / 2;
      const sy = (bmp.height - size) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bmp, sx, sy, size, size, 0, 0, 256, 256);
      bmp.close();
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("Erreur canvas")), "image/webp", 0.85);
      });
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const res = await fetch("/api/user/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: base64 }),
      });
      const data = await res.json();
      if (res.ok && user) {
        setUser({ ...user, avatarUrl: data.avatarUrl });
      }
    } catch {}
    setAvatarLoading(false);
  }, [user, setUser]);

  useEffect(() => { document.title = "Compte — Akwetche"; }, []);

  const planLabel = (() => {
    if (user?.role === "super_admin" || user?.role === "admin") return "Admin";
    if (user?.subscription?.status === "active" || user?.plan === "premium") return "Premium";
    return "Gratuit";
  })();

  const isPremium = planLabel === "Premium" || planLabel === "Admin";

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  const currencyDisplay = user?.currency === "EUR" ? "Euro (EUR)" : "CFA (FCFA)";

  return (
    <div className="max-w-2xl mx-auto pb-8">
      {/* ─── BANDEAU PROFIL ─── */}
      <div className="card mb-8 p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => fileInputRef.current?.click()} className="relative group shrink-0 rounded-full" disabled={avatarLoading}>
            <UserAvatar name={user?.name} avatarUrl={user?.avatarUrl} size="lg" loading={avatarLoading} />
            <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.45)" }}>
              <FontAwesomeIcon icon={faCamera} className="w-5 h-5 text-white" />
            </div>
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processAvatar(f); e.target.value = ""; }} />
          <div className="flex-1 min-w-0">
            <p className="text-lg sm:text-xl font-bold text-ink truncate">{user?.name}</p>
            <p className="text-xs sm:text-sm truncate mt-1 text-muted">{user?.email}</p>
            {isPremium ? (
              <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: "rgba(245,166,35,0.1)", color: "var(--color-gold)", border: "1px solid rgba(245,166,35,0.2)" }}>
                <FontAwesomeIcon icon={faCrown} className="w-2.5 h-2.5" />
                {planLabel}
              </span>
            ) : (
              <Link href="/dashboard/settings/abonnement" className="group mt-2 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full transition-all" style={{ background: "var(--color-surface-raised)", color: "var(--color-muted)", border: "1px solid var(--color-border)" }}>
                <FontAwesomeIcon icon={faStar} className="w-2.5 h-2.5" />
                Gratuit
                <FontAwesomeIcon icon={faChevronRight} className="w-2 h-2 opacity-50 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ─── RÉSUMÉ RAPIDE ─── */}
      <p className="text-label mb-4 px-1">Résumé</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Nom", value: user?.name || "—", icon: faUser, color: "var(--color-brand)" },
          { label: "Téléphone", value: user?.phone || "—", icon: faPhone, color: "var(--color-forest)" },
          { label: "Devise", value: currencyDisplay, icon: faMoneyBill, color: "var(--color-gold)" },
          { label: "Pays", value: user?.countryCode || "—", icon: faIdCard, color: "var(--color-muted)" },
        ].map((item) => (
          <div key={item.label} className="card-compact text-center">
            <FontAwesomeIcon icon={item.icon} className="w-4 h-4 mb-1.5" style={{ color: item.color }} />
            <p className="text-[10px] text-muted uppercase tracking-wider">{item.label}</p>
            <p className="text-sm font-medium text-ink truncate mt-0.5">{item.value}</p>
          </div>
        ))}
      </div>

      {/* ─── PARAMÈTRES ─── */}
      <p className="text-label mb-4 px-1">Paramètres</p>
      <div className="space-y-3 mb-8">
        {[
          { label: "Profil", desc: "Nom, téléphone, pays, devise, soldes initiaux", icon: faUser, href: "/dashboard/settings/profil", color: "var(--color-brand)" },
          { label: "Connexion et sécurité", desc: "Email, mot de passe, sessions", icon: faShield, href: "/dashboard/settings/securite", color: "var(--color-forest)" },
          { label: "Notifications", desc: "Préférences par canal", icon: faBell, href: "/dashboard/settings/notifications", color: "var(--color-gold)" },
          { label: "Tontines", desc: "Activer les tontines, commissions, retirer les revenus enregistrés", icon: faPeopleGroup, href: "/dashboard/settings/tontines", color: "var(--color-teal)" },
          { label: "Abonnement", desc: "Gérer votre plan", icon: faCrown, href: "/dashboard/settings/abonnement", color: "var(--color-gold-dark)" },
          { label: "À propos", desc: "Version, liens utiles", icon: faCircleInfo, href: "/dashboard/settings/about", color: "var(--color-muted)" },
        ].map((item) => (
          <div key={item.href} className="card" style={{ padding: 0 }}>
            <Link href={item.href} className="flex items-center gap-5 px-5 sm:px-6 py-5 transition-colors hover:bg-[var(--color-surface-raised)]">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${item.color}12` }}>
                <FontAwesomeIcon icon={item.icon} className="w-5 h-5" style={{ color: item.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink">{item.label}</p>
                <p className="text-xs mt-1 text-muted">{item.desc}</p>
              </div>
              <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4 shrink-0 text-muted" />
            </Link>
          </div>
        ))}
      </div>

      {/* ─── DANGER ─── */}
      <p className="text-label mb-4 px-1">Zone sensible</p>
      <div className="card mb-8" style={{ padding: 0, border: "2px solid var(--color-neg)" }}>
        <Link href="/dashboard/settings/danger" className="flex items-center gap-5 px-5 sm:px-6 py-5 transition-colors hover:bg-[var(--color-neg-bg)] active:bg-[var(--color-neg-bg)]">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--color-neg-bg)" }}>
            <FontAwesomeIcon icon={faLock} className="w-5 h-5" style={{ color: "var(--color-neg)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: "var(--color-neg)" }}>Désactivation et suppression</p>
            <p className="text-xs mt-1 text-muted">Désactiver ou supprimer votre compte</p>
          </div>
          <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4 shrink-0 text-muted" />
        </Link>
      </div>

      {/* ─── DÉCONNEXION ─── */}
      <button onClick={handleLogout} disabled={loggingOut} className="btn-primary w-full justify-center" style={{ borderRadius: "16px" }}>
        <FontAwesomeIcon icon={loggingOut ? faSpinner : faRightFromBracket} className={`w-4 h-4 ${loggingOut ? "animate-spin" : ""}`} />
        {loggingOut ? "Déconnexion…" : "Déconnexion"}
      </button>
    </div>
  );
}
