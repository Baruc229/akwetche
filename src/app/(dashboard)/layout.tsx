"use client";

import { useState, useEffect, useCallback, useMemo, createContext, useContext, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGauge, faArrowsUpDown, faChartBar, faGear, faBox, faArrowTrendUp, faBars, faXmark, faChevronDown, faShield, faHouse, faBell, faSpinner, faCrown, faCartShopping, faUserGear, faBagShopping, faStar, faArrowRightFromBracket, faOutdent, faIndent, faTag, faSackDollar, faArrowTrendDown, faCashRegister, faWarehouse, faPeopleGroup, faPlus, faCircleQuestion } from '@fortawesome/free-solid-svg-icons';
import { type IconDefinition } from '@fortawesome/fontawesome-svg-core';
import Link from "next/link";
import { resolveCurrency, setActiveCurrency, setActiveBaseCurrency, type CurrencyCode } from "@/lib/currency";
import ExpirationBanner from "@/components/subscription/ExpirationBanner";
import ExpiredModal from "@/components/subscription/ExpiredModal";
import QuickTransactionModal from "@/components/QuickTransactionModal";
import HelpPanel from "@/components/HelpPanel";

type UserData = {
  id: number;
  name: string;
  email: string;
  initialBalance: number;
  initialBalanceActivity?: number;
  role?: string;
  currency?: string;
  baseCurrency?: string;
  countryCode?: string | null;
  phone?: string | null;
  plan?: string;
  status?: string;
  activityActivated?: boolean;
  emailVerified?: string | null;
  adminNotificationPref?: string;
  onboardingCompleted?: boolean;
  subscription?: { status: string; amount: number; currency: string; endDate: string; daysRemaining?: number; label?: string; variant?: string } | null;
};

type DashboardContextType = {
 user: UserData | null;
 setUser: (u: UserData | null) => void;
 commercialMode: boolean;
 currency: CurrencyCode;
 baseCurrency: CurrencyCode;
 setCurrency: (c: CurrencyCode) => void;
};

const DashboardContext = createContext<DashboardContextType>({
 user: null,
 setUser: () => {},
 commercialMode: false,
 currency: "XOF",
 baseCurrency: "XOF",
 setCurrency: () => {},
});

export const useDashboard = () => useContext(DashboardContext);

const CREATE_ROUTES = [
  "/dashboard/transactions",
  "/dashboard/products",
  "/dashboard/sales",
  "/dashboard/tontines",
  "/dashboard/recurring/expenses",
  "/dashboard/recurring/income",
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Tableau de bord',
  '/dashboard/transactions': 'Transactions',
  '/dashboard/products': 'Produits',
  '/dashboard/sales': 'Ventes',
  '/dashboard/stock': 'Stock',
  '/dashboard/reports': 'Bilans',
  '/dashboard/history': 'Historique & Analyse',
  '/dashboard/settings': 'Paramètres',
  '/dashboard/recurring/expenses': 'Dépenses récurrentes',
  '/dashboard/recurring/income': 'Revenus récurrents',
  '/admin': 'Administration',
};

type Notification = {
  id: number;
  type: string;
  message: string;
  link: string;
  read: boolean;
  createdAt: string;
  actor: { id: number; name: string } | null;
};

const NOTIF_ICONS: Record<string, IconDefinition> = {
  subscription: faCrown,
  product: faBox,
  sale: faCartShopping,
  stock: faArrowTrendUp,
  transaction: faArrowsUpDown,
  admin: faShield,
  role: faUserGear,
  system: faBell,
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 172800) return "Hier";
  return `Il y a ${Math.floor(diff / 86400)} jours`;
}

function QuickActionBtn({ icon, label, hint, onClick }: { icon: IconDefinition; label: string; hint: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all hover:bg-[var(--color-brand-subtle)] text-left" style={{color:'var(--color-ink)'}}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{background:'var(--color-brand-subtle)'}}>
        <FontAwesomeIcon icon={icon} className="w-4 h-4" style={{color:'var(--color-brand)'}} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{label}</p>
        <p className="text-xs" style={{color:'var(--color-muted)'}}>{hint}</p>
      </div>
    </button>
  );
}

export default function DashboardLayout({
 children,
}: {
 children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserData | null>(null);
  const [commercialMode, setCommercialMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>("XOF");
  const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>("XOF");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("akwetche_sidebar_collapsed") === "true";
    }
    return false;
  });
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<"new" | "unread" | "read">("unread");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const [markingAll, setMarkingAll] = useState(false);
  const [confirmDeleteNotif, setConfirmDeleteNotif] = useState<Notification | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [quickTxOpen, setQuickTxOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [savingCurrency, setSavingCurrency] = useState(false);
  const quickMenuRef = useRef<HTMLDivElement>(null);
  const quickSheetRef = useRef<HTMLDivElement>(null);

  const handleSetCurrency = useCallback((c: CurrencyCode) => {
    setActiveCurrency(c);
    setDisplayCurrency(c);
  }, []);

  const handleTopbarCurrencyToggle = useCallback(async () => {
    if (savingCurrency) return;
    const next: CurrencyCode = displayCurrency === "EUR" ? "XOF" : "EUR";
    setSavingCurrency(true);
    setActiveCurrency(next);
    setDisplayCurrency(next);
    try {
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: next }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch {} finally {
      setSavingCurrency(false);
    }
  }, [displayCurrency, savingCurrency]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("akwetche_sidebar_collapsed", String(next));
      return next;
    });
  }, []);

  const fetchNotificationsRef = useRef<() => void>(() => {});

  const doFetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=50");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnread(data.unread);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotificationsRef.current = doFetchNotifications;
  }, [doFetchNotifications]);

  useEffect(() => {
    fetchNotificationsRef.current();
    const interval = setInterval(() => fetchNotificationsRef.current(), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
      const inDesktopMenu = quickMenuRef.current?.contains(e.target as Node) ?? false;
      const inMobileSheet = quickSheetRef.current?.contains(e.target as Node) ?? false;
      if (!inDesktopMenu && !inMobileSheet) {
        setQuickMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

 useEffect(() => {
 const sessionFlag = localStorage.getItem("akwetche_session");
 fetch("/api/auth/me")
 .then((res) => {
 if (!res.ok) throw new Error("Not authenticated");
 return res.json();
 })
 .then((data) => {
 if (!data.user.emailVerified) {
 localStorage.removeItem("akwetche_session");
 router.push("/verify-email-pending");
 return;
 }
  localStorage.setItem("akwetche_session", "true");
  setUser(data.user);
    const initialCurrency = resolveCurrency(data.user?.currency || data.user?.baseCurrency);
    const initialBase = (data.user?.baseCurrency || "XOF") as CurrencyCode;
    setActiveCurrency(initialCurrency);
    setDisplayCurrency(initialCurrency);
    setActiveBaseCurrency(initialBase);
    setBaseCurrency(initialBase);
 const isPremium = data.user.plan === "premium" || data.user.role !== "user";
 if (isPremium) {
 const saved = localStorage.getItem("akwetche_commercial");
 setCommercialMode(saved === "true" || saved === null);
 if (!data.user.activityActivated) {
 fetch("/api/auth/activate-activity", { method: "POST" }).catch(() => {});
 }
 }
 })
 .catch(() => {
 localStorage.removeItem("akwetche_session");
 router.push(sessionFlag ? "/login?expired=1" : "/login");
 })
 .finally(() => setLoading(false));
 }, [router]);

  useEffect(() => {
  if (user && (user.plan === "premium" || user.role !== "user")) {
  localStorage.setItem("akwetche_commercial", String(commercialMode));
  }
  }, [commercialMode, user]);

  useEffect(() => {
    if (user) {
      fetch("/api/recurring/generate", { method: "POST" }).catch(() => {});
    }
  }, [user]);

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }, [router]);

  async function markAsRead(n: Notification) {
    if (n.read) return;
    setBusyIds(prev => new Set(prev).add(n.id));
    try {
      const res = await fetch(`/api/notifications/${n.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      if (!res.ok) throw new Error("Échec");
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      setUnread(prev => Math.max(0, prev - 1));
    } catch {} finally {
      setBusyIds(prev => { const s = new Set(prev); s.delete(n.id); return s; });
    }
  }

  async function handleReadAll() {
    setMarkingAll(true);
    try {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      if (!res.ok) throw new Error("Échec");
      setNotifications(n => n.map(n => ({ ...n, read: true })));
      setUnread(0);
    } catch {} finally {
      setMarkingAll(false);
    }
  }

  async function handleDeleteNotif(n: Notification) {
    setConfirmDeleteNotif(null);
    setBusyIds(prev => new Set(prev).add(n.id));
    if (!n.read) setUnread(prev => Math.max(0, prev - 1));
    setNotifications(prev => prev.filter(x => x.id !== n.id));
    try {
      await fetch(`/api/notifications/${n.id}`, { method: "DELETE" });
    } catch {} finally {
      setBusyIds(prev => { const s = new Set(prev); s.delete(n.id); return s; });
    }
  }

  function handleClickNotif(n: Notification) {
    markAsRead(n);
    setNotifDrawerOpen(false);
    if (n.link) router.push(n.link);
  }

  const [now] = useState(() => Date.now());
  const notifFiltered = useMemo(() => {
    const day = 86400000;
    return notifications.filter(n => {
      if (notifTab === "new") return !n.read && (now - new Date(n.createdAt).getTime()) < day;
      if (notifTab === "unread") return !n.read;
      return n.read;
    });
  }, [notifications, notifTab, now]);

    const ctxValue = useMemo(() => ({ user, setUser, commercialMode, currency: displayCurrency, baseCurrency, setCurrency: handleSetCurrency }), [user, commercialMode, displayCurrency, baseCurrency, handleSetCurrency]);

   if (loading) {
   return (
   <div className="min-h-screen flex items-center justify-center" style={{background:'var(--color-bg)'}}>
   <div className="w-8 h-8 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
   </div>
   );
   }

   if (!user) return null;

   const isPremium = user?.plan === "premium" || user?.role !== "user";
   const isFreeLocked = user?.role === "user" && user?.plan !== "premium" && user?.subscription?.status !== "active";

   const subStatus = user?.subscription;
   const showExpiredModal = subStatus?.status === "expired" || (subStatus?.status === "active" && (subStatus?.daysRemaining ?? 999) <= 0);

    const navItems = [
      { href: "/dashboard", label: "Accueil", icon: faGauge },
      { href: "/dashboard/transactions", label: "Transactions", icon: faArrowsUpDown },
      { href: "/dashboard/categories", label: "Catégories", icon: faTag },
      { href: "/dashboard/recurring/expenses", label: "Dép. récurrentes", icon: faArrowTrendDown },
      { href: "/dashboard/recurring/income", label: "Rev. récurrents", icon: faArrowTrendUp },
      { href: "/dashboard/budgets", label: "Budgets", icon: faSackDollar },
      { href: "/dashboard/reports", label: "Bilans", icon: faChartBar },
    ];

    const tontineNavItems = [
      { href: "/dashboard/tontines", label: "Tontines", icon: faPeopleGroup },
    ];

    const commercialNavItems = [
      { href: "/dashboard/products", label: "Produits", icon: faBox },
       { href: "/dashboard/sales", label: "Ventes", icon: faCashRegister },
       { href: "/dashboard/stock", label: "Stock", icon: faWarehouse },
    ];

   const pageTitle = Object.entries(PAGE_TITLES).find(([path]) => pathname === path || (path !== '/admin' && path !== '/dashboard' && pathname.startsWith(path)))?.[1] || 'Akwetche';

   const avatarInitial = user.name?.charAt(0)?.toUpperCase() || '?';

  return (
   <DashboardContext.Provider value={ctxValue}>
    <div className="min-h-screen flex flex-col lg:flex-row" style={{background:'var(--color-bg)'}}>
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 flex flex-col h-dvh lg:h-screen max-h-screen overflow-hidden transition-all duration-200
          ${sidebarCollapsed ? 'w-16' : 'w-60'}
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{background:'var(--color-brand)', boxShadow:'2px 0 20px rgba(0,0,0,0.12)'}}
      >
        {/* Logo */}
        <div className={`flex items-center shrink-0 ${sidebarCollapsed ? 'justify-center p-3' : 'justify-between px-4 py-4'}`}>
          <Link href="/dashboard" className={`flex items-center gap-2 ${sidebarCollapsed ? '' : ''}`}>
            <div className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/15" style={{background:'#0D1B35'}}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/akwetche-symbole.svg" alt="Akwetche" className="w-5 h-5" />
            </div>
            <span className={`text-lg font-bold text-white font-[family-name:var(--font-display)] transition-all duration-200 overflow-hidden whitespace-nowrap inline-block ${sidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>Akwetche</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/50 hover:text-white">
            <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className={`flex-1 px-3 py-2 space-y-1 sidebar-scroll min-h-0 overflow-hidden overscroll-contain scroll-smooth pb-6 ${sidebarCollapsed ? 'sidebar-scroll--collapsed' : 'overflow-y-auto'}`} style={{ WebkitOverflowScrolling: 'touch' as unknown as undefined, touchAction: 'pan-y' }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <div key={item.href} className="relative group">
                  <Link
                    href={item.href}
                    onClick={() => { setSidebarOpen(false); }}
                    className={`flex items-center rounded-lg text-sm transition-all whitespace-nowrap overflow-hidden ${
                      sidebarCollapsed ? 'justify-center p-[10px] gap-0' : 'px-3 py-[9px] gap-[10px]'
                    } ${
                      isActive
                        ? 'text-white font-semibold'
                        : 'text-white/52 hover:text-white/90 hover:bg-white/7'
                    }`}
                    style={isActive ? {background:'rgba(255,255,255,0.13)', borderLeft:'3px solid var(--color-gold)', paddingLeft: sidebarCollapsed ? '10px' : '9px'} : {}}
                  >
                    <FontAwesomeIcon icon={item.icon} className="w-[15px] h-[15px] shrink-0" />
                    <span className={`transition-all duration-200 overflow-hidden whitespace-nowrap inline-block ${sidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>{item.label}</span>
                  </Link>
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none translate-x-[-6px] group-hover:translate-x-0 sidebar-tooltip" style={{background:'var(--color-ink)', color:'white'}}>
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}

          {/* Section Activité */}
          <div className={`${commercialMode ? '' : 'hidden'}`}>
            <div className={`pt-3 mt-3 ${!sidebarCollapsed ? 'px-3' : ''}`} style={{borderTop:'1px solid rgba(255,255,255,0.10)'}}>
              {!sidebarCollapsed && (
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Activité</p>
              )}
            </div>
            {commercialNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <div key={item.href} className="relative group">
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center rounded-lg text-sm transition-all whitespace-nowrap overflow-hidden ${
                      sidebarCollapsed ? 'justify-center p-[10px] gap-0' : 'px-3 py-[9px] gap-[10px]'
                    } ${
                      isActive
                        ? 'text-white font-semibold'
                        : 'text-white/52 hover:text-white/90 hover:bg-white/7'
                    }`}
                    style={isActive ? {background:'rgba(255,255,255,0.13)', borderLeft:'3px solid var(--color-gold)', paddingLeft: sidebarCollapsed ? '10px' : '9px'} : {}}
                  >
                    <FontAwesomeIcon icon={item.icon} className="w-[15px] h-[15px] shrink-0" />
                    <span className={`transition-all duration-200 overflow-hidden whitespace-nowrap inline-block ${sidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>{item.label}</span>
                  </Link>
                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none translate-x-[-6px] group-hover:translate-x-0 sidebar-tooltip" style={{background:'var(--color-ink)', color:'white'}}>
                      {item.label}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Section Tontines */}
          <>
            <div className={`pt-3 mt-3 ${!sidebarCollapsed ? 'px-3' : ''}`} style={{borderTop:'1px solid rgba(255,255,255,0.10)'}}>
              {!sidebarCollapsed && (
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Tontines</p>
              )}
            </div>
            {tontineNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <div key={item.href} className="relative group">
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center rounded-lg text-sm transition-all whitespace-nowrap overflow-hidden ${
                      sidebarCollapsed ? 'justify-center p-[10px] gap-0' : 'px-3 py-[9px] gap-[10px]'
                    } ${
                      isActive
                        ? 'text-white font-semibold'
                        : 'text-white/52 hover:text-white/90 hover:bg-white/7'
                    }`}
                    style={isActive ? {background:'rgba(255,255,255,0.13)', borderLeft:'3px solid var(--color-gold)', paddingLeft: sidebarCollapsed ? '10px' : '9px'} : {}}
                  >
                    <FontAwesomeIcon icon={item.icon} className="w-[15px] h-[15px] shrink-0" />
                    <span className={`transition-all duration-200 overflow-hidden whitespace-nowrap inline-block ${sidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>{item.label}</span>
                  </Link>
                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none translate-x-[-6px] group-hover:translate-x-0 sidebar-tooltip" style={{background:'var(--color-ink)', color:'white'}}>
                      {item.label}
                    </div>
                  )}
                </div>
              );
            })}
          </>

          {/* Section Admin */}
          <div className={`${user && user.role !== "user" ? '' : 'hidden'}`} style={{ minHeight: 0 }}>
            <div className="relative group">
              <Link
                href="/admin"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center rounded-lg text-sm transition-all whitespace-nowrap overflow-hidden ${
                  sidebarCollapsed ? 'justify-center p-[10px] gap-0' : 'px-3 py-[9px] gap-[10px]'
                } ${
                  pathname === '/admin'
                    ? 'text-white font-semibold'
                    : 'text-white/52 hover:text-white/90 hover:bg-white/7'
                }`}
                style={pathname === '/admin' ? {background:'rgba(255,255,255,0.13)', borderLeft:'3px solid var(--color-gold)', paddingLeft: sidebarCollapsed ? '10px' : '9px'} : {}}
              >
                <FontAwesomeIcon icon={faShield} className="w-[15px] h-[15px] shrink-0" />
                <span className={`transition-all duration-200 overflow-hidden whitespace-nowrap inline-block ${sidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>Administration</span>
              </Link>
              {sidebarCollapsed && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none translate-x-[-6px] group-hover:translate-x-0 sidebar-tooltip" style={{background:'var(--color-ink)', color:'white'}}>
                  Administration
                </div>
              )}
            </div>
          </div>

          {/* Bottom section — sticky dans le nav pour rester fixe sur mobile ET desktop */}
          <div className={`sticky bottom-0 -mx-3 px-3 pb-2 pt-3 ${!sidebarCollapsed ? 'border-t border-white/10' : ''}`} style={{background:'var(--color-brand)'}}>
            {!sidebarCollapsed && isPremium && (
              <label className="flex items-center gap-3 px-3 py-2 text-sm text-white/52 cursor-pointer hover:bg-white/7 rounded-lg transition-all">
                <div className="relative shrink-0">
                  <input
                    type="checkbox"
                    checked={commercialMode}
                    onChange={(e) => {
                      setCommercialMode(e.target.checked);
                      if (e.target.checked && !user?.activityActivated) {
                        fetch("/api/auth/activate-activity", { method: "POST" }).catch(() => {});
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 rounded-full bg-white/15 peer-checked:bg-[#C9A84C] transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white/60 peer-checked:translate-x-4 transition-transform" />
                </div>
                <FontAwesomeIcon icon={faBagShopping} className="w-4 h-4" />
                Mode activité
              </label>
            )}
          </div>
        </nav>
      </aside>

      {/* Sidebar overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content area */}
      <div className={`flex-1 min-w-0 flex flex-col transition-all duration-200 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
        {/* Topbar */}
        <header className="sticky top-0 z-20" style={{background:'var(--color-surface)', borderBottom:'1px solid var(--color-border)'}}>
          <div className="flex items-center justify-between h-[58px] px-4 md:px-6">
            {/* Left: sidebar toggle + page title */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-brand-subtle)] transition-all"
                aria-label="Menu"
              >
                <FontAwesomeIcon icon={faOutdent} className="w-4 h-4" />
              </button>
              <button
                onClick={toggleSidebar}
                className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-brand-subtle)] transition-all"
                title={sidebarCollapsed ? 'Agrandir la sidebar' : 'Réduire la sidebar'}
              >
                <FontAwesomeIcon icon={sidebarCollapsed ? faIndent : faOutdent} className="w-4 h-4" />
              </button>
              <h1 className="text-lg font-semibold" style={{fontFamily:'var(--font-display)', color:'var(--color-ink)'}}>{pageTitle}</h1>
            </div>

            {/* Right: quick action + bell + avatar */}
            <div className="flex items-center gap-2">
              {/* Quick action button (desktop) */}
              <div className="relative hidden lg:block" ref={quickMenuRef}>
                <button
                  onClick={() => setQuickMenuOpen(!quickMenuOpen)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg transition-all hover:bg-[var(--color-brand-subtle)]"
                  style={{color:'var(--color-muted)'}}
                  aria-label="Action rapide"
                >
                  <FontAwesomeIcon icon={faPlus} className="w-[18px] h-[18px]" />
                </button>
                {quickMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 z-[100] bg-[var(--color-surface)] rounded-xl shadow-xl border border-[var(--color-border)] overflow-hidden animate-scale-in" style={{transformOrigin:'top right'}}>
                    <div className="p-1.5">
                      <QuickActionBtn
                        icon={faPlus}
                        label="Nouvelle transaction"
                        hint="Sans navigation"
                        onClick={() => { setQuickMenuOpen(false); setQuickTxOpen(true); }}
                      />
                      {commercialMode && (
                        <>
                          <QuickActionBtn
                            icon={faBagShopping}
                            label="Nouvelle vente"
                            hint="Naviguer →"
                            onClick={() => { setQuickMenuOpen(false); router.push("/dashboard/sales?action=create"); }}
                          />
                          <QuickActionBtn
                            icon={faBox}
                            label="Nouveau produit"
                            hint="Naviguer →"
                            onClick={() => { setQuickMenuOpen(false); router.push("/dashboard/products?action=create"); }}
                          />
                        </>
                      )}
                      <QuickActionBtn
                        icon={faPeopleGroup}
                        label="Cotisation tontine"
                        hint="Naviguer →"
                        onClick={() => { setQuickMenuOpen(false); router.push("/dashboard/tontines?action=create"); }}
                      />
                      <QuickActionBtn
                        icon={faArrowTrendDown}
                        label="Dépense récurrente"
                        hint="Naviguer →"
                        onClick={() => { setQuickMenuOpen(false); router.push("/dashboard/recurring/expenses?action=create"); }}
                      />
                      <QuickActionBtn
                        icon={faArrowTrendUp}
                        label="Revenu récurrent"
                        hint="Naviguer →"
                        onClick={() => { setQuickMenuOpen(false); router.push("/dashboard/recurring/income?action=create"); }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setNotifDrawerOpen(true)}
                className="relative p-2 rounded-lg transition-all"
                style={{color:'var(--color-muted)'}}
                aria-label="Notifications"
              >
                <FontAwesomeIcon icon={faBell} className="w-5 h-5" />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 text-[10px] font-bold flex items-center justify-center rounded-full min-w-[18px] min-h-[18px] leading-none" style={{background:'var(--color-neg)', color:'white'}}>
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
              <button
                onClick={() => setHelpOpen(true)}
                className="p-2 rounded-lg transition-all"
                style={{color:'var(--color-muted)'}}
                aria-label="Aide"
                title="Comprendre les calculs"
              >
                <FontAwesomeIcon icon={faCircleQuestion} className="w-5 h-5" />
              </button>

              {/* Currency toggle */}
              <div className="hidden md:flex items-center rounded-lg overflow-hidden" style={{border:'1px solid var(--color-border)'}}>
                <button
                  onClick={displayCurrency === "XOF" ? undefined : handleTopbarCurrencyToggle}
                  disabled={savingCurrency}
                  className="px-2.5 py-1.5 text-xs font-semibold transition-all"
                  style={{
                    background: displayCurrency === "XOF" ? 'var(--color-brand)' : 'transparent',
                    color: displayCurrency === "XOF" ? 'white' : 'var(--color-muted)',
                  }}
                >
                  {savingCurrency && displayCurrency === "EUR" ? <FontAwesomeIcon icon={faSpinner} className="w-3 h-3 animate-spin" /> : "FCFA"}
                </button>
                <button
                  onClick={displayCurrency === "EUR" ? undefined : handleTopbarCurrencyToggle}
                  disabled={savingCurrency}
                  className="px-2.5 py-1.5 text-xs font-semibold transition-all"
                  style={{
                    background: displayCurrency === "EUR" ? 'var(--color-brand)' : 'transparent',
                    color: displayCurrency === "EUR" ? 'white' : 'var(--color-muted)',
                  }}
                >
                  {savingCurrency && displayCurrency === "XOF" ? <FontAwesomeIcon icon={faSpinner} className="w-3 h-3 animate-spin" /> : "EUR"}
                </button>
              </div>

              {/* Account avatar */}
              <div className="relative" ref={accountMenuRef}>
                <button
                  onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                  className="flex items-center gap-1.5 px-1 py-1 rounded-lg transition-all hover:bg-[var(--color-brand-subtle)] cursor-pointer"
                >
                  <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-sm font-bold" style={{background:'var(--color-gold)', color:'var(--color-brand)', outline: accountMenuOpen ? '2px solid var(--color-brand)' : '2px solid transparent', outlineOffset: '2px'}}>
                    {avatarInitial}
                  </div>
                  <FontAwesomeIcon icon={faChevronDown} className="w-3 h-3 text-muted transition-transform" style={{transform: accountMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)'}} />
                </button>

                {accountMenuOpen && (
                  <div className="account-menu">
                    <div className="p-4" style={{borderBottom:'1px solid var(--color-border)', background:'var(--color-surface-raised)'}}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0" style={{background:'var(--color-gold)', color:'var(--color-brand)'}}>
                          {avatarInitial}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{color:'var(--color-ink)'}}>{user.name}</p>
                          <p className="text-xs truncate" style={{color:'var(--color-muted)'}}>{user.email}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="badge" style={user.plan === 'premium' || user.role !== 'user' ? {background:'var(--color-gold-light)', color:'#92400E'} : {background:'var(--color-brand-subtle)', color:'var(--color-brand)'}}>
                          {user.plan === 'premium' || user.role !== 'user' ? 'Premium' : 'Gratuit'}
                        </span>
                        {user.subscription?.status === 'active' && (
                          <span className="badge badge-pos">✓ Actif</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <button onClick={() => { setAccountMenuOpen(false); router.push('/dashboard/settings'); }} className="account-menu-item">
                        <FontAwesomeIcon icon={faGear} className="w-4 h-4" />
                        Paramètres du compte
                      </button>
                      {user && user.role !== "user" && (
                        <button onClick={() => { setAccountMenuOpen(false); router.push('/admin'); }} className="account-menu-item">
                          <FontAwesomeIcon icon={faShield} className="w-4 h-4" />
                          Administration
                        </button>
                      )}
                      {isFreeLocked && (
                        <>
                          <div className="account-menu-divider" />
                          <button onClick={() => { setAccountMenuOpen(false); router.push('/payment'); }} className="account-menu-item upgrade">
                            <FontAwesomeIcon icon={faStar} className="w-4 h-4" />
                            Passer à Premium →
                          </button>
                        </>
                      )}
                      <div className="account-menu-divider" />
                      <button onClick={() => { setAccountMenuOpen(false); handleLogout(); }} className="account-menu-item danger">
                        <FontAwesomeIcon icon={faArrowRightFromBracket} className="w-4 h-4" />
                        Déconnexion
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {subStatus && (
          <ExpirationBanner
            daysRemaining={subStatus.daysRemaining ?? 0}
            status={subStatus.status}
            label={subStatus.label ?? ""}
            variant={(subStatus.variant as "active" | "warning" | "critical" | "expired") || "active"}
          />
        )}

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full pb-20 lg:pb-0">
          {children}
        </main>

        {showExpiredModal && <ExpiredModal />}

        {/* Mobile bottom nav — 4 items + FAB central */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden" style={{background:'var(--color-surface)', borderTop:'1px solid var(--color-border)', padding:'6px 0 calc(6px + env(safe-area-inset-bottom))'}}>
          <div className="flex items-center">
            {([
              { href: "/dashboard", label: "Accueil", icon: faHouse },
              { href: "/dashboard/transactions", label: "Transactions", icon: faArrowsUpDown },
            ] as const).map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex-1 flex flex-col items-center gap-[3px] py-[6px] px-1"
                  style={{color: isActive ? 'var(--color-brand)' : 'var(--color-muted)', fontSize:'10.5px', fontWeight: isActive ? 600 : 500, fontFamily:'var(--font-body)'}}
                >
                  <FontAwesomeIcon icon={item.icon} className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            {/* Central FAB */}
            <div className="flex-none relative" style={{width:'56px'}}>
              <button
                onClick={() => {
                  const isHome = pathname === "/dashboard";
                  const hasCreate = CREATE_ROUTES.some(r => pathname === r || pathname.startsWith(r + "/"));
                  if (isHome || !hasCreate) {
                    setQuickMenuOpen(true);
                  } else {
                    router.push(pathname + "?action=create");
                  }
                }}
                className="absolute left-1/2 -translate-x-1/2 bottom-0 w-12 h-12 rounded-full bg-[var(--color-brand)] text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform hover:opacity-90"
                style={{marginBottom:'-4px'}}
                aria-label="Action rapide"
              >
                <FontAwesomeIcon icon={faPlus} className="w-5 h-5" />
              </button>
            </div>
            {([
              { href: "/dashboard/reports", label: "Bilans", icon: faChartBar },
              { href: "#menu", label: "Menu", icon: faBars },
            ] as const).map((item) => {
              if (item.href === "#menu") {
                return (
                  <button
                    key={item.href}
                    onClick={() => setSidebarOpen(true)}
                    className="flex-1 flex flex-col items-center gap-[3px] py-[6px] px-1 cursor-pointer border-none"
                    style={{color:'var(--color-muted)', fontSize:'10.5px', fontWeight:500, fontFamily:'var(--font-body)', background:'transparent'}}
                  >
                    <FontAwesomeIcon icon={item.icon} className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              }
              const isActive = pathname === item.href || pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex-1 flex flex-col items-center gap-[3px] py-[6px] px-1"
                  style={{color: isActive ? 'var(--color-brand)' : 'var(--color-muted)', fontSize:'10.5px', fontWeight: isActive ? 600 : 500, fontFamily:'var(--font-body)'}}
                >
                  <FontAwesomeIcon icon={item.icon} className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <footer className="no-print border-t px-4 md:px-6 lg:px-8 py-3 pb-16 lg:pb-3" style={{borderColor:'var(--color-border)', background:'var(--color-surface)'}}>
          <p className="text-xs text-center" style={{color:'var(--color-muted)', fontFamily:'var(--font-body)'}}>
            &copy; {new Date().getFullYear()} Akwetche — Tous droits réservés.
          </p>
        </footer>
      </div>
    </div>

    {/* Notification Drawer */}
    {notifDrawerOpen && (
      <>
        <div className="fixed inset-0 z-[60] bg-black/20 animate-fade-in" onClick={() => setNotifDrawerOpen(false)} />
        <div className="fixed top-0 right-0 z-[70] h-full w-[380px] max-w-full animate-drawer-right flex flex-col" style={{background:'var(--color-surface)', boxShadow:'-4px 0 24px rgba(0,0,0,0.10)'}}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{borderBottom:'1px solid var(--color-border)'}}>
            <h2 className="text-base font-semibold" style={{color:'var(--color-ink)', fontFamily:'var(--font-display)'}}>Notifications</h2>
            <button
              onClick={() => setNotifDrawerOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{color:'var(--color-muted)'}}
            >
              <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-4 py-3 shrink-0" style={{borderBottom:'1px solid var(--color-border)'}}>
            {([{key:"new",label:"Nouveau"},{key:"unread",label:"Non lu"},{key:"read",label:"Lu"}] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setNotifTab(tab.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: notifTab === tab.key ? 'var(--color-brand-subtle)' : 'transparent',
                  color: notifTab === tab.key ? 'var(--color-brand)' : 'var(--color-muted)',
                  fontWeight: notifTab === tab.key ? 600 : 500,
                }}
              >
                {tab.label}
                {tab.key === "unread" && unread > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{background:'var(--color-brand)', color:'white'}}>{unread}</span>
                )}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {notifFiltered.length === 0 && (
              <div className="flex items-center justify-center py-12 text-sm" style={{color:'var(--color-muted)'}}>
                Aucune notification
              </div>
            )}
            {notifFiltered.map(n => {
              const Icon = NOTIF_ICONS[n.type] || faBell;
              const isBusy = busyIds.has(n.id);
              return (
                <div
                  key={n.id}
                  onClick={() => !isBusy && handleClickNotif(n)}
                  className="notif-item"
                  style={!n.read ? {background:'var(--color-brand-subtle)'} : {}}
                >
                  <div className="notif-icon" style={{background: !n.read ? 'rgba(27,58,107,0.10)' : 'var(--color-surface-raised)'}}>
                    {isBusy ? (
                      <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" style={{color:'var(--color-muted)'}} />
                    ) : (
                      <FontAwesomeIcon icon={Icon} className="w-4 h-4" style={{color: !n.read ? 'var(--color-brand)' : 'var(--color-muted)'}} />
                    )}
                  </div>
                  <div className="notif-body">
                    <p className="notif-message">{n.message}</p>
                    <p className="notif-time">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.read && <div className="notif-unread-dot" />}
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteNotif(n); }}
                    className="shrink-0 ml-1 transition-colors"
                    style={{color:'var(--color-muted)'}}
                    title="Supprimer"
                  >
                    <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          {unread > 0 && (
            <div className="shrink-0 px-4 py-3" style={{borderTop:'1px solid var(--color-border)'}}>
              <button
                onClick={handleReadAll}
                disabled={markingAll}
                className="w-full py-2 rounded-lg text-xs font-semibold transition-all"
                style={{background:'var(--color-brand-subtle)', color:'var(--color-brand)'}}
              >
                {markingAll ? 'Mise à jour...' : 'Tout marquer comme lu'}
              </button>
            </div>
          )}
        </div>
      </>
    )}

    {/* Confirm delete notification */}
    {confirmDeleteNotif !== null && (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/25 animate-fade-in" onClick={() => setConfirmDeleteNotif(null)}>
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl animate-scale-in" onClick={e => e.stopPropagation()}>
          <h3 className="text-base font-semibold mb-2" style={{color:'var(--color-ink)'}}>Supprimer cette notification ?</h3>
          <p className="text-sm mb-5" style={{color:'var(--color-muted)'}}>Cette notification sera définitivement supprimée.</p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setConfirmDeleteNotif(null)} className="btn-ghost">Annuler</button>
            <button onClick={() => handleDeleteNotif(confirmDeleteNotif)} className="btn-danger text-sm">Oui, supprimer</button>
          </div>
        </div>
      </div>
    )}

    {/* Mobile bottom sheet — actions rapides */}
    {quickMenuOpen && (
      <>
        <div className="fixed inset-0 z-50 lg:hidden bg-black/40 animate-fade-in" onClick={() => setQuickMenuOpen(false)} />
        <div ref={quickSheetRef} className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-[var(--color-surface)] rounded-t-2xl max-h-[70vh] overflow-y-auto animate-slide-up shadow-xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
            <h3 className="text-base font-semibold text-ink">Actions rapides</h3>
            <button onClick={() => setQuickMenuOpen(false)} className="w-8 h-8 flex items-center justify-center text-muted hover:text-ink rounded-lg hover:bg-[var(--color-surface-raised)] transition-colors">
              <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3 space-y-1">
            <QuickActionBtn
              icon={faPlus}
              label="Nouvelle transaction"
              hint="Sans navigation"
              onClick={() => { setQuickMenuOpen(false); setQuickTxOpen(true); }}
            />
            {commercialMode && (
              <>
                <QuickActionBtn
                  icon={faBagShopping}
                  label="Nouvelle vente"
                  hint="Naviguer →"
                  onClick={() => { setQuickMenuOpen(false); router.push("/dashboard/sales?action=create"); }}
                />
                <QuickActionBtn
                  icon={faBox}
                  label="Nouveau produit"
                  hint="Naviguer →"
                  onClick={() => { setQuickMenuOpen(false); router.push("/dashboard/products?action=create"); }}
                />
              </>
            )}
            <QuickActionBtn
              icon={faPeopleGroup}
              label="Cotisation tontine"
              hint="Naviguer →"
              onClick={() => { setQuickMenuOpen(false); router.push("/dashboard/tontines?action=create"); }}
            />
            <QuickActionBtn
              icon={faArrowTrendDown}
              label="Dépense récurrente"
              hint="Naviguer →"
              onClick={() => { setQuickMenuOpen(false); router.push("/dashboard/recurring/expenses?action=create"); }}
            />
            <QuickActionBtn
              icon={faArrowTrendUp}
              label="Revenu récurrent"
              hint="Naviguer →"
              onClick={() => { setQuickMenuOpen(false); router.push("/dashboard/recurring/income?action=create"); }}
            />
          </div>
        </div>
      </>
    )}

    {/* Quick transaction modal (overlay, sans navigation) */}
    <QuickTransactionModal
      open={quickTxOpen}
      onClose={() => setQuickTxOpen(false)}
      onSuccess={() => doFetchNotifications()}
    />

    {/* Help panel */}
    <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />

    <style>{`
      /* Sidebar scrollbar hidden */
      .sidebar-scroll { scrollbar-width: none; }
      .sidebar-scroll::-webkit-scrollbar { width: 0; }
      .sidebar-scroll--collapsed { overflow-y: auto; }

      /* Tooltip hover delay for collapsed sidebar */
      .sidebar-tooltip { transition-delay: 0ms; }
      .group:hover .sidebar-tooltip { transition-delay: 250ms; }

      .account-menu {
        position:absolute; right:0; top:calc(100% + 8px);
        width:260px; z-index:100; overflow:hidden;
        background:var(--color-surface);
        border:1px solid var(--color-border);
        border-radius:14px;
        box-shadow:0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06);
        animation:scaleIn 0.18s cubic-bezier(0.16,1,0.3,1) forwards;
        transform-origin:top right;
      }
      .account-menu-item {
        display:flex; align-items:center; gap:10px; width:100%;
        padding:11px 16px; border:none; background:transparent;
        font-size:13.5px; font-weight:500; cursor:pointer;
        font-family:var(--font-body); text-align:left;
        transition:background 0.11s;
        color:var(--color-body);
      }
      .account-menu-item:hover { background:var(--color-surface-raised); color:var(--color-ink); }
      .account-menu-item.upgrade { color:var(--color-brand); font-weight:600; }
      .account-menu-item.upgrade:hover { background:var(--color-brand-subtle); }
      .account-menu-item.danger { color:var(--color-neg); }
      .account-menu-item.danger:hover { background:var(--color-neg-bg); }
      .account-menu-divider { height:1px; background:var(--color-border); margin:4px 0; }

      .notif-item {
        display:flex; align-items:flex-start; gap:12px;
        padding:14px 16px; cursor:pointer;
        border-bottom:1px solid var(--color-border);
        transition:background 0.12s;
      }
      .notif-item:hover { background:var(--color-surface-raised); }
      .notif-item.unread { background:var(--color-brand-subtle); }
      .notif-icon {
        width:36px; height:36px; border-radius:10px;
        display:flex; align-items:center; justify-content:center; flex-shrink:0;
      }
      .notif-body { flex:1; min-width:0; }
      .notif-message { font-size:13px; font-weight:500; line-height:1.4; color:var(--color-ink); }
      .notif-time { font-size:11.5px; color:var(--color-muted); margin-top:3px; }
      .notif-unread-dot {
        width:7px; height:7px; border-radius:50%;
        background:var(--color-brand); flex-shrink:0; margin-top:5px;
      }
    `}</style>
   </DashboardContext.Provider>
  );
}
