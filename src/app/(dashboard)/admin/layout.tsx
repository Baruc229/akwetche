"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGauge, faUsers, faCrown, faShield, faChartBar } from '@fortawesome/free-solid-svg-icons';

const ADMIN_TABS = [
  { href: "/admin", label: "Vue d'ensemble", icon: faGauge, exact: true },
  { href: "/admin/users", label: "Utilisateurs", icon: faUsers, exact: false },
  { href: "/admin/subscriptions", label: "Abonnements", icon: faCrown, exact: false },
  { href: "/admin/security", label: "Sécurité", icon: faShield, exact: false },
  { href: "/admin/analytics", label: "Analytiques", icon: faChartBar, exact: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  function isActive(tab: typeof ADMIN_TABS[number]) {
    if (tab.exact) return pathname === tab.href;
    return pathname.startsWith(tab.href);
  }

  return (
    <div className="space-y-5 pb-6">
      {/* Tabs navigation */}
      <div className="flex items-center gap-1 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
        {ADMIN_TABS.map((tab) => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                active
                  ? 'text-white'
                  : 'text-text-3 hover:text-text-1 hover:bg-sand'
              }`}
              style={active ? { background: 'var(--color-brand)' } : {}}
            >
              <FontAwesomeIcon icon={tab.icon} className="w-3.5 h-3.5" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
