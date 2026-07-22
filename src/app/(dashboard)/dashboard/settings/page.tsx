"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser, faShield, faBell, faCrown, faCircleInfo,
  faLock, faRightFromBracket, faChevronRight,
  faPhone, faMoneyBill, faCamera
} from "@fortawesome/free-solid-svg-icons";
import { useDashboard } from "../../layout";

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

  const phoneDisplay = user?.phone || "Non renseigné";

  const currencyDisplay = user?.currency === "EUR" ? "Euro (EUR)" : "CFA (FCFA)";

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  function FieldRow({ icon, label, value, href }: { icon: typeof faUser; label: string; value: string; href: string }) {
    return (
      <Link
        href={href}
        className="flex items-center gap-5 px-5 sm:px-6 py-5 transition-colors hover:bg-[var(--color-brand-subtle)]"
      >
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#EBF0F7" }}>
          <FontAwesomeIcon icon={icon} className="w-5 h-5" style={{ color: "#1B3A6B" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted mb-1">{label}</p>
          <p className="text-sm font-medium text-ink truncate">{value}</p>
        </div>
        <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4 shrink-0" style={{ color: "#94A3B8" }} />
      </Link>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-8">
      {/* Bandeau profil immersif */}
      <div
        className="rounded-2xl p-5 sm:p-6 mb-8"
        style={{ background: "linear-gradient(135deg, #0D1B35 0%, #132848 100%)" }}
      >
        <div className="flex items-center gap-4">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user?.name || "Avatar"}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover shrink-0"
              style={{ border: "3px solid #C9A84C" }}
            />
          ) : (
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "#1B3A6B", border: "3px solid #C9A84C" }}
            >
              <span className="text-xl sm:text-2xl font-bold" style={{ color: "#F5A623" }}>{initials}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-lg sm:text-xl font-bold text-white truncate">{user?.name}</p>
            <p className="text-xs sm:text-sm truncate mt-1" style={{ color: "#94A3B8" }}>{user?.email}</p>
          </div>
        </div>
        {isPremium && (
          <span
            className="inline-block mt-4 text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: "rgba(245,166,35,0.15)", color: "#F5A623", border: "1px solid rgba(245,166,35,0.3)" }}
          >
            {planLabel}
          </span>
        )}
      </div>

      {/* ─── INFORMATIONS PERSONNELLES ─── */}
      <p className="text-xs font-semibold uppercase tracking-wider mb-4 px-1" style={{ color: "#94A3B8" }}>
        Informations personnelles
      </p>

      <div className="space-y-3 mb-8">
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <FieldRow icon={faCamera} label="Photo de profil" value={user?.avatarUrl ? "Photo ajoutée" : "Pas de photo"} href="/dashboard/settings/profil" />
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <FieldRow icon={faUser} label="Nom complet" value={user?.name || "Non renseigné"} href="/dashboard/settings/profil" />
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <FieldRow icon={faPhone} label="Téléphone" value={phoneDisplay} href="/dashboard/settings/profil" />
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <FieldRow icon={faMoneyBill} label="Devise" value={currencyDisplay} href="/dashboard/settings/profil" />
        </div>
      </div>

      {/* ─── PARAMÈTRES ─── */}
      <p className="text-xs font-semibold uppercase tracking-wider mb-4 px-1" style={{ color: "#94A3B8" }}>
        Paramètres
      </p>

      <div className="space-y-3 mb-8">
        {[
          { label: "Connexion et sécurité", desc: "Email, mot de passe, sessions", icon: faShield, href: "/dashboard/settings/securite" },
          { label: "Notifications", desc: "Préférences par canal", icon: faBell, href: "/dashboard/settings/notifications" },
          { label: "Abonnement", desc: "Gérer votre plan", icon: faCrown, href: "/dashboard/settings/abonnement" },
          { label: "À propos", desc: "Version, liens utiles", icon: faCircleInfo, href: "/dashboard/settings/about" },
        ].map((item) => (
          <div key={item.href} className="rounded-2xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <Link
              href={item.href}
              className="flex items-center gap-5 px-5 sm:px-6 py-5 transition-colors hover:bg-[var(--color-brand-subtle)]"
            >
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
      <p className="text-xs font-semibold uppercase tracking-wider mb-4 px-1" style={{ color: "#94A3B8" }}>
        Zone sensible
      </p>

      <div className="rounded-2xl overflow-hidden mb-8" style={{ background: "var(--color-surface)", border: "2px solid #B94A3E" }}>
        <Link
          href="/dashboard/settings/danger"
          className="flex items-center gap-5 px-5 sm:px-6 py-5 transition-colors hover:bg-red-50 active:bg-red-50"
        >
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
      <button
        onClick={handleLogout}
        className="w-full py-4 rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
        style={{ background: "#1B3A6B", color: "white" }}
      >
        <FontAwesomeIcon icon={faRightFromBracket} className="w-4 h-4" />
        Déconnexion
      </button>
    </div>
  );
}
