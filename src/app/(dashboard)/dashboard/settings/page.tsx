"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser, faShield, faBell, faCrown, faCircleInfo,
  faLock, faRightFromBracket, faChevronRight,
  faPhone, faMoneyBill, faIdCard, faSpinner
} from "@fortawesome/free-solid-svg-icons";
import { useDashboard } from "../../layout";
import UserAvatar from "@/components/settings/UserAvatar";

export default function ComptePage() {
  const { user } = useDashboard();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

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
      <div className="rounded-2xl p-5 sm:p-6 mb-8" style={{ background: "linear-gradient(135deg, var(--color-brand-dark) 0%, var(--color-brand) 100%)" }}>
        <div className="flex items-center gap-4">
          <UserAvatar name={user?.name} avatarUrl={user?.avatarUrl} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="text-lg sm:text-xl font-bold text-white truncate">{user?.name}</p>
            <p className="text-xs sm:text-sm truncate mt-1" style={{ color: "var(--color-placeholder)" }}>{user?.email}</p>
          </div>
        </div>
        {isPremium && (
          <span className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "rgba(245,166,35,0.15)", color: "var(--color-gold)", border: "1px solid rgba(245,166,35,0.3)" }}>
            <FontAwesomeIcon icon={faCrown} className="w-3 h-3" />
            {planLabel}
          </span>
        )}
      </div>

      {/* ─── RÉSUMÉ RAPIDE ─── */}
      <p className="text-label mb-4 px-1">Résumé</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Nom", value: user?.name || "—", icon: faUser },
          { label: "Téléphone", value: user?.phone || "—", icon: faPhone },
          { label: "Devise", value: currencyDisplay, icon: faMoneyBill },
          { label: "Pays", value: user?.countryCode || "—", icon: faIdCard },
        ].map((item) => (
          <div key={item.label} className="card-compact text-center">
            <FontAwesomeIcon icon={item.icon} className="w-4 h-4 mb-1.5 text-muted" />
            <p className="text-[10px] text-muted uppercase tracking-wider">{item.label}</p>
            <p className="text-sm font-medium text-ink truncate mt-0.5">{item.value}</p>
          </div>
        ))}
      </div>

      {/* ─── PARAMÈTRES ─── */}
      <p className="text-label mb-4 px-1">Paramètres</p>
      <div className="space-y-3 mb-8">
        {[
          { label: "Profil", desc: "Nom, téléphone, pays, devise, soldes initiaux", icon: faUser, href: "/dashboard/settings/profil" },
          { label: "Connexion et sécurité", desc: "Email, mot de passe, sessions", icon: faShield, href: "/dashboard/settings/securite" },
          { label: "Notifications", desc: "Préférences par canal", icon: faBell, href: "/dashboard/settings/notifications" },
          { label: "Abonnement", desc: "Gérer votre plan", icon: faCrown, href: "/dashboard/settings/abonnement" },
          { label: "À propos", desc: "Version, liens utiles", icon: faCircleInfo, href: "/dashboard/settings/about" },
        ].map((item) => (
          <div key={item.href} className="card" style={{ padding: 0 }}>
            <Link href={item.href} className="flex items-center gap-5 px-5 sm:px-6 py-5 transition-colors hover:bg-[var(--color-brand-subtle)]">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--color-brand-subtle)" }}>
                <FontAwesomeIcon icon={item.icon} className="w-5 h-5" style={{ color: "var(--color-brand)" }} />
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
