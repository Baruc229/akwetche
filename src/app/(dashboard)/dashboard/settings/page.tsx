"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser, faShield, faBell, faCrown, faCircleInfo,
  faLock, faRightFromBracket, faChevronRight
} from "@fortawesome/free-solid-svg-icons";
import { useDashboard } from "../../layout";

const MENU_ITEMS = [
  { key: "profil", label: "Informations sur le compte", desc: "Nom, soldes, pays, devise", icon: faUser, href: "/dashboard/settings/profil" },
  { key: "securite", label: "Connexion et sécurité", desc: "Mot de passe, sessions actives", icon: faShield, href: "/dashboard/settings/securite" },
  { key: "notifications", label: "Notifications", desc: "Préférences par canal", icon: faBell, href: "/dashboard/settings/notifications" },
  { key: "abonnement", label: "Abonnement", desc: "Gérer votre plan", icon: faCrown, href: "/dashboard/settings/abonnement" },
  { key: "about", label: "À propos", desc: "Version, liens utiles", icon: faCircleInfo, href: "/dashboard/settings/about" },
];

export default function ComptePage() {
  const { user } = useDashboard();
  const router = useRouter();

  useEffect(() => { document.title = "Compte — Akwetche"; }, []);

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
      {/* Bandeau profil immersif */}
      <div
        className="rounded-2xl p-4 sm:p-5 mb-6"
        style={{ background: "linear-gradient(135deg, #0D1B35 0%, #132848 100%)" }}
      >
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Avatar */}
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user?.name || "Avatar"}
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover shrink-0"
              style={{ border: "2px solid #C9A84C" }}
            />
          ) : (
            <div
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "#1B3A6B", border: "2px solid #C9A84C" }}
            >
              <span className="text-lg sm:text-xl font-bold" style={{ color: "#F5A623" }}>
                {initials}
              </span>
            </div>
          )}

          {/* Nom + email */}
          <div className="flex-1 min-w-0">
            <p className="text-base sm:text-lg font-bold text-white truncate">{user?.name}</p>
            <p className="text-xs sm:text-sm truncate" style={{ color: "#94A3B8" }}>{user?.email}</p>
          </div>

          {/* Badge plan — masqué sur très petit écran */}
          {isPremium && (
            <span
              className="hidden sm:inline text-xs font-semibold px-3 py-1 rounded-full shrink-0"
              style={{ background: "rgba(245,166,35,0.15)", color: "#F5A623", border: "1px solid rgba(245,166,35,0.3)" }}
            >
              {planLabel}
            </span>
          )}
        </div>
        {/* Badge visible en bas sur mobile */}
        {isPremium && (
          <span
            className="sm:hidden inline-block mt-3 text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: "rgba(245,166,35,0.15)", color: "#F5A623", border: "1px solid rgba(245,166,35,0.3)" }}
          >
            {planLabel}
          </span>
        )}
      </div>

      {/* Section label */}
      <p className="text-xs font-semibold uppercase tracking-wider mb-3 px-1" style={{ color: "#94A3B8" }}>
        Compte
      </p>

      {/* Carte-liste des entrées */}
      <div className="rounded-2xl overflow-hidden mb-6" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        {MENU_ITEMS.map((item, i) => (
          <Link
            key={item.key}
            href={item.href}
            className="flex items-center gap-3 sm:gap-4 px-4 py-3.5 sm:py-4 transition-colors hover:bg-[var(--color-brand-subtle)] active:bg-[var(--color-brand-subtle)]"
            style={i < MENU_ITEMS.length - 1 ? { borderBottom: "1px solid var(--color-border)" } : {}}
          >
            {/* Icône ronde */}
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "#EBF0F7" }}
            >
              <FontAwesomeIcon icon={item.icon} className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: "#1B3A6B" }} />
            </div>

            {/* Titre + sous-titre */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink truncate">{item.label}</p>
              <p className="text-xs mt-0.5 truncate" style={{ color: "#94A3B8" }}>{item.desc}</p>
            </div>

            {/* Chevron */}
            <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4 shrink-0" style={{ color: "#94A3B8" }} />
          </Link>
        ))}
      </div>

      {/* Carte danger — désactivation et suppression */}
      <div
        className="rounded-2xl overflow-hidden mb-6"
        style={{ background: "var(--color-surface)", border: "2px solid #B94A3E" }}
      >
        <Link
          href="/dashboard/settings/danger"
          className="flex items-center gap-3 sm:gap-4 px-4 py-3.5 sm:py-4 transition-colors hover:bg-red-50 active:bg-red-50"
        >
          <div
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "#FEE8E5" }}
          >
            <FontAwesomeIcon icon={faLock} className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: "#B94A3E" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: "#B94A3E" }}>Désactivation et suppression</p>
            <p className="text-xs mt-0.5 truncate" style={{ color: "#94A3B8" }}>Désactiver ou supprimer votre compte</p>
          </div>
          <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4 shrink-0" style={{ color: "#94A3B8" }} />
        </Link>
      </div>

      {/* Bouton Déconnexion */}
      <button
        onClick={handleLogout}
        className="w-full py-3 sm:py-3.5 rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
        style={{ background: "#1B3A6B", color: "white" }}
      >
        <FontAwesomeIcon icon={faRightFromBracket} className="w-4 h-4" />
        Déconnexion
      </button>
    </div>
  );
}
