"use client";

import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGauge, faGear, faArrowRightArrowLeft, faChartBar, faBox, faArrowTrendUp, faArrowTrendDown, faCashRegister, faWarehouse, faPeopleGroup, faShield, faXmark, faBagShopping, faCircleQuestion, faTag, faSackDollar } from '@fortawesome/free-solid-svg-icons';
import Link from "next/link";
import { useDashboard } from "@/app/(dashboard)/layout";

type Props = {
  collapsed: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onHelpOpen: () => void;
};

const navItems = [
  { href: "/dashboard", label: "Accueil", icon: faGauge },
  { href: "/dashboard/transactions", label: "Transactions", icon: faArrowRightArrowLeft },
  { href: "/dashboard/categories", label: "Catégories", icon: faTag },
  { href: "/dashboard/recurring/expenses", label: "Dép. récurrentes", icon: faArrowTrendDown },
  { href: "/dashboard/recurring/income", label: "Rev. récurrents", icon: faArrowTrendUp },
  { href: "/dashboard/budgets", label: "Budgets", icon: faSackDollar },
  { href: "/dashboard/reports", label: "Bilans", icon: faChartBar },
  { href: "/dashboard/settings", label: "Paramètres", icon: faGear },
];

const tontineNavItems = [
  { href: "/dashboard/tontines", label: "Tontines", icon: faPeopleGroup },
];

const commercialNavItems = [
  { href: "/dashboard/products", label: "Produits", icon: faBox },
  { href: "/dashboard/sales", label: "Ventes", icon: faCashRegister },
  { href: "/dashboard/stock", label: "Stock", icon: faWarehouse },
];

/* eslint-disable @typescript-eslint/no-unused-vars */
export default function Sidebar({ collapsed, open, onToggle, onClose, onHelpOpen }: Props) {
  const { user, commercialMode, setCommercialMode } = useDashboard();
  const pathname = usePathname();
  const isPremium = user?.plan === "premium" || user?.role !== "user";

  function NavItem({ item }: { item: { href: string; label: string; icon: any } }) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const isActive = pathname === item.href;
    return (
      <div className="relative group">
        <Link
          href={item.href}
          onClick={onClose}
          className={`flex items-center rounded-lg text-sm transition-all whitespace-nowrap overflow-hidden ${
            collapsed ? 'justify-center p-[12px] gap-0' : 'px-3 py-[12px] gap-[10px]'
          } ${
            isActive
              ? 'text-white font-semibold'
              : 'text-white/52 hover:text-white/90 hover:bg-white/7'
          }`}
          style={isActive ? {background:'rgba(255,255,255,0.13)', borderLeft:'3px solid rgba(255,255,255,0.5)', paddingLeft: collapsed ? '7px' : '9px'} : {}}
        >
          <FontAwesomeIcon icon={item.icon} className="w-[15px] h-[15px] shrink-0" />
          <span className={`transition-all duration-200 overflow-hidden whitespace-nowrap inline-block ${collapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>{item.label}</span>
        </Link>
        {collapsed && (
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none translate-x-[-6px] group-hover:translate-x-0 sidebar-tooltip" style={{background:'var(--color-brand-dark)', color:'white'}}>
            {item.label}
          </div>
        )}
      </div>
    );
  }

  return (
    <aside
      className={`fixed top-0 left-0 z-40 flex flex-col h-dvh lg:h-screen max-h-screen overflow-hidden transition-all duration-200
        ${collapsed ? 'w-16' : 'w-60'}
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      style={{background:'var(--color-brand)'}}
    >
      <div className={`flex items-center shrink-0 ${collapsed ? 'justify-center p-3' : 'justify-between px-4 py-4'}`}>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/15" style={{background:'var(--color-brand-dark)'}}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/akwetche-symbole.svg" alt="Akwetche" className="w-5 h-5" />
          </div>
          <span className={`text-lg font-bold text-white font-[family-name:var(--font-display)] transition-all duration-200 overflow-hidden whitespace-nowrap inline-block ${collapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>Akwetche</span>
        </Link>
        <div className={`flex items-center gap-1 ${collapsed ? 'hidden' : ''}`}>
          <button onClick={onHelpOpen} className="flex items-center justify-center w-8 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all" title="Comprendre les calculs">
            <FontAwesomeIcon icon={faCircleQuestion} className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all">
            <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
          </button>
        </div>
        {collapsed && (
          <button onClick={onClose} className="lg:hidden absolute top-2 right-2 flex items-center justify-center w-8 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all" title="Fermer le menu">
            <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className={`flex-1 px-3 py-2 space-y-1 sidebar-scroll min-h-0 overscroll-contain ${collapsed ? 'sidebar-scroll--collapsed' : 'overflow-y-auto'}`} style={{ WebkitOverflowScrolling: 'touch' as unknown as undefined, touchAction: 'pan-y' }}>
        {navItems.map((item) => <NavItem key={item.href} item={item} />)}

        <div className={`${commercialMode ? '' : 'hidden'}`}>
          <div className={`pt-3 mt-3 ${!collapsed ? 'px-3' : ''}`} style={{borderTop:'1px solid rgba(255,255,255,0.10)'}}>
            {!collapsed && <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Activité</p>}
          </div>
          {commercialNavItems.map((item) => <NavItem key={item.href} item={item} />)}
        </div>

        {user && (user.role !== "user" || user.tontineAccess) && (
          <div className={`pt-3 mt-3 ${!collapsed ? 'px-3' : ''}`} style={{borderTop:'1px solid rgba(255,255,255,0.10)'}}>
            {!collapsed && <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Tontines</p>}
          </div>
        )}
        {user && (user.role !== "user" || user.tontineAccess) && tontineNavItems.map((item) => <NavItem key={item.href} item={item} />)}

        {user && user.role !== "user" && (
          <div className={`${user.role !== "user" ? '' : 'hidden'}`} style={{ minHeight: 0 }}>
            <div className="relative group">
              <Link href="/admin" onClick={onClose} className={`flex items-center rounded-lg text-sm transition-all whitespace-nowrap overflow-hidden ${collapsed ? 'justify-center p-[12px] gap-0' : 'px-3 py-[12px] gap-[10px]'} ${pathname === '/admin' ? 'text-white font-semibold' : 'text-white/52 hover:text-white/90 hover:bg-white/7'}`} style={pathname === '/admin' ? {background:'rgba(255,255,255,0.13)', borderLeft:'3px solid rgba(255,255,255,0.5)', paddingLeft: collapsed ? '7px' : '9px'} : {}}>
                <FontAwesomeIcon icon={faShield} className="w-[15px] h-[15px] shrink-0" />
                <span className={`transition-all duration-200 overflow-hidden whitespace-nowrap inline-block ${collapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>Administration</span>
              </Link>
              {collapsed && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none translate-x-[-6px] group-hover:translate-x-0 sidebar-tooltip" style={{background:'var(--color-brand-dark)', color:'white'}}>Administration</div>
              )}
            </div>
          </div>
        )}

        {/* Commercial mode toggle — expanded */}
        <div className={`sticky bottom-0 -mx-3 px-3 pb-2 pt-3 ${!collapsed ? 'border-t border-white/10' : ''}`} style={{background:'var(--color-brand)'}}>
          {!collapsed && isPremium && (
            <label className="flex items-center gap-3 px-3 py-2 text-sm text-white/52 cursor-pointer hover:bg-white/7 rounded-lg transition-all">
              <div className="relative shrink-0">
                <input type="checkbox" checked={commercialMode} onChange={(e) => { setCommercialMode(e.target.checked); if (e.target.checked && !user?.activityActivated) { fetch("/api/auth/activate-activity", { method: "POST" }).catch(() => {}); } }} className="sr-only peer" />
                <div className="w-9 h-5 rounded-full bg-white/15 peer-checked:bg-[var(--color-gold)] transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white/60 peer-checked:translate-x-4 transition-transform" />
              </div>
              <FontAwesomeIcon icon={faBagShopping} className="w-4 h-4" />
              Mode activité
            </label>
          )}

          {/* Commercial mode toggle — collapsed: icon only */}
          {collapsed && isPremium && (
            <div className="relative group flex justify-center">
              <button
                onClick={() => { setCommercialMode(!commercialMode); if (!commercialMode && !user?.activityActivated) { fetch("/api/auth/activate-activity", { method: "POST" }).catch(() => {}); } }}
                className="relative flex items-center justify-center w-11 h-11 rounded-lg transition-all hover:bg-white/10"
                style={{ color: commercialMode ? 'var(--color-gold)' : 'rgba(255,255,255,0.4)' }}
                title={commercialMode ? "Désactiver mode activité" : "Activer mode activité"}
                aria-pressed={commercialMode}
              >
                <FontAwesomeIcon icon={faBagShopping} className="w-[18px] h-[18px]" />
                {commercialMode && (
                  <span className="absolute w-1.5 h-1.5 rounded-full" style={{ top: '13px', right: '13px', background: 'var(--color-gold)' }} aria-hidden="true" />
                )}
              </button>
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none translate-x-[-6px] group-hover:translate-x-0 sidebar-tooltip" style={{background:'var(--color-gold)', color:'var(--color-brand)'}}>
                {commercialMode ? "Mode activité ON" : "Mode activité OFF"}
              </div>
            </div>
          )}
        </div>
      </nav>

      <style>{`
        .sidebar-scroll { scrollbar-width: none; }
        .sidebar-scroll::-webkit-scrollbar { width: 0; }
        .sidebar-scroll--collapsed { overflow-y: auto; }
        .sidebar-tooltip { transition-delay: 0ms; }
        .group:hover .sidebar-tooltip { transition-delay: 250ms; }
      `}</style>
    </aside>
  );
}
