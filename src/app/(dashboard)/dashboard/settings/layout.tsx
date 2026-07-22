"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCrown, faUser, faShield, faBell, faTag, faCircleInfo, faTriangleExclamation,
  faChevronDown, faChevronRight
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

const TABS: { key: string; label: string; icon: IconDefinition }[] = [
  { key: "abonnement", label: "Abonnement", icon: faCrown },
  { key: "profil", label: "Profil", icon: faUser },
  { key: "securite", label: "Connexion et sécurité", icon: faShield },
  { key: "notifications", label: "Notifications", icon: faBell },
  { key: "categories", label: "Catégories", icon: faTag },
  { key: "about", label: "À propos", icon: faCircleInfo },
  { key: "danger", label: "Danger", icon: faTriangleExclamation },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeKey = (() => {
    const parts = pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (TABS.some(t => t.key === last)) return last;
    return "profil";
  })();

  const activeLabel = TABS.find(t => t.key === activeKey)?.label || "Paramètres";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Paramètres</h1>
        <p className="text-muted text-sm mt-0.5">Gérez votre profil et vos paramètres</p>
      </div>

      {/* Mobile: current page link with dropdown */}
      <div className="lg:hidden mb-4 relative">
        <Link
          href="#"
          onClick={(e) => { e.preventDefault(); setMobileOpen(!mobileOpen); }}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-brand)" }}
        >
          {activeLabel}
          <FontAwesomeIcon icon={faChevronDown} className="w-3 h-3 transition-transform" style={{ transform: mobileOpen ? "rotate(180deg)" : "rotate(0)", color: "var(--color-muted)" }} />
        </Link>
        {mobileOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50 shadow-xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            {TABS.map(tab => (
              <Link
                key={tab.key}
                href={`/dashboard/settings/${tab.key === "profil" ? "profil" : tab.key}`}
                onClick={() => setMobileOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all"
                style={{
                  background: activeKey === tab.key ? "var(--color-brand-subtle)" : "transparent",
                  color: activeKey === tab.key ? "var(--color-brand)" : "var(--color-ink)",
                  fontWeight: activeKey === tab.key ? 600 : 500,
                }}
              >
                <FontAwesomeIcon icon={tab.icon} className="w-4 h-4" style={{ color: activeKey === tab.key ? "var(--color-brand)" : "var(--color-muted)" }} />
                {tab.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-6">
        {/* Desktop sidebar */}
        <nav className="hidden lg:block w-52 shrink-0">
          <div className="sticky top-24 space-y-0.5">
            {TABS.map(tab => (
              <Link
                key={tab.key}
                href={`/dashboard/settings/${tab.key === "profil" ? "profil" : tab.key}`}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: activeKey === tab.key ? "var(--color-brand-subtle)" : "transparent",
                  color: activeKey === tab.key ? "var(--color-brand)" : "var(--color-muted)",
                  fontWeight: activeKey === tab.key ? 600 : 500,
                }}
              >
                <FontAwesomeIcon icon={tab.icon} className="w-4 h-4" />
                {tab.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-6 max-w-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}
