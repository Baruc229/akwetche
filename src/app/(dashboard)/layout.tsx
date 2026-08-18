"use client";

import { useState, useEffect, useCallback, useMemo, createContext, useContext } from "react";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useRouter } from "next/navigation";
import { resolveCurrency, setActiveCurrency, setActiveBaseCurrency, resetActiveCurrency, type CurrencyCode } from "@/lib/currency";
import ExpirationBanner from "@/components/subscription/ExpirationBanner";
import ExpiredModal from "@/components/subscription/ExpiredModal";
import QuickTransactionModal from "@/components/QuickTransactionModal";
import HelpPanel from "@/components/HelpPanel";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import BottomNav from "@/components/layout/BottomNav";
import NotificationsDrawer from "@/components/layout/NotificationsDrawer";
import QuickActionsSheet from "@/components/layout/QuickActionsSheet";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock } from '@fortawesome/free-solid-svg-icons';

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
  avatarUrl?: string | null;
  plan?: string;
  status?: string;
  activityActivated?: boolean;
  tontineAccess?: boolean;
  recoitCommissions?: boolean;
  commissionScopeDefault?: string;
  emailVerified?: string | null;
  adminNotificationPref?: string;
  notificationPrefs?: Record<string, { email?: boolean; inApp?: boolean }>;
  onboardingCompleted?: boolean;
  subscription?: { status: string; amount: number; currency: string; endDate: string; daysRemaining?: number; label?: string; variant?: string } | null;
};

type DashboardContextType = {
  user: UserData | null;
  setUser: (u: UserData | null) => void;
  commercialMode: boolean;
  setCommercialMode: (v: boolean) => void;
  currency: CurrencyCode;
  baseCurrency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  refreshKey: number;
  triggerRefresh: () => void;
};

const DashboardContext = createContext<DashboardContextType>({
  user: null,
  setUser: () => {},
  commercialMode: false,
  setCommercialMode: () => {},
  currency: "XOF",
  baseCurrency: "XOF",
  setCurrency: () => {},
  refreshKey: 0,
  triggerRefresh: () => {},
});

export const useDashboard = () => useContext(DashboardContext);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [commercialMode, setCommercialMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>("XOF");
  const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>("XOF");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("akwetche_sidebar_collapsed") === "true";
    return false;
  });
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [quickTxOpen, setQuickTxOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  useScrollLock(sidebarOpen);
  const triggerRefresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const handleSetCurrency = useCallback((c: CurrencyCode) => {
    setActiveCurrency(c);
    setDisplayCurrency(c);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      localStorage.setItem("akwetche_sidebar_collapsed", String(!prev));
      return !prev;
    });
  }, []);

  useEffect(() => {
    const sessionFlag = localStorage.getItem("akwetche_session");
    fetch("/api/auth/me")
      .then((res) => { if (!res.ok) throw new Error("Not authenticated"); return res.json(); })
      .then((data) => {
        if (!data.user.emailVerified) { localStorage.removeItem("akwetche_session"); router.push("/verify-email-pending"); return; }
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
          if (!data.user.activityActivated) fetch("/api/auth/activate-activity", { method: "POST" }).catch(() => {});
        }
      })
      .catch(() => { localStorage.removeItem("akwetche_session"); router.push(sessionFlag ? "/login?expired=1" : "/login"); })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (user && (user.plan === "premium" || user.role !== "user")) {
      localStorage.setItem("akwetche_commercial", String(commercialMode));
    }
  }, [commercialMode, user]);

  useEffect(() => {
    if (!user) return;
    const monthKey = `akwetche_recurring_${new Date().getFullYear()}-${new Date().getMonth() + 1}`;
    if (localStorage.getItem(monthKey) === "done") return;
    fetch("/api/recurring/generate", { method: "POST" })
      .catch(() => {})
      .finally(() => localStorage.setItem(monthKey, "done"));
  }, [user]);

  const handleLogout = useCallback(async () => {
    resetActiveCurrency();
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }, [router]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=50");
      if (res.ok) { const data = await res.json(); setUnread(data.unread); }
    } catch {}
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  useEffect(() => {
    if (sidebarOpen && window.innerWidth < 1024) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.removeProperty("position");
        document.body.style.removeProperty("top");
        document.body.style.removeProperty("width");
        document.body.style.removeProperty("overflow");
        window.scrollTo(0, scrollY);
      };
    }
  }, [sidebarOpen]);

  const ctxValue = useMemo(() => ({ user, setUser, commercialMode, setCommercialMode, currency: displayCurrency, baseCurrency, setCurrency: handleSetCurrency, refreshKey, triggerRefresh }), [user, commercialMode, displayCurrency, baseCurrency, handleSetCurrency, refreshKey, triggerRefresh]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background:'var(--color-bg)'}}>
        <div className="w-8 h-8 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--color-bg)" }}>
        <div className="max-w-sm w-full text-center" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "1rem", padding: "2rem" }}>
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-brand-subtle)] flex items-center justify-center mx-auto mb-4">
            <FontAwesomeIcon icon={faLock} className="w-7 h-7 text-[var(--color-brand)]" />
          </div>
          <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--color-fg)", fontFamily: "var(--font-heading)" }}>
            Session expirée
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--color-muted)", fontFamily: "var(--font-body)" }}>
            Votre session a expiré. Reconnectez-vous pour continuer à utiliser Akwetche.
          </p>
          <button
            onClick={() => { localStorage.removeItem("akwetche_session"); router.push("/login?expired=1"); }}
            className="w-full py-2.5 rounded-xl font-medium"
            style={{ background: "var(--color-brand)", color: "#fff" }}
          >
            Se reconnecter
          </button>
        </div>
      </div>
    );
  }

  const subStatus = user?.subscription;
  const showExpiredModal = subStatus?.status === "expired" || (subStatus?.status === "active" && (subStatus?.daysRemaining ?? 999) <= 0);

  return (
    <DashboardContext.Provider value={ctxValue}>
      <div className="min-h-screen flex flex-col lg:flex-row" style={{background:'var(--color-bg)'}}>
        <Sidebar
          collapsed={sidebarCollapsed}
          open={sidebarOpen}
          onToggle={toggleSidebar}
          onClose={() => setSidebarOpen(false)}
          onHelpOpen={() => setHelpOpen(true)}
        />

        {sidebarOpen && <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        <div className={`flex-1 min-w-0 flex flex-col transition-[margin-left] duration-200 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
          <Topbar
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={toggleSidebar}
            onOpenMobileSidebar={() => setSidebarOpen(true)}
            unread={unread}
            onOpenNotifications={() => setNotifDrawerOpen(true)}
            onQuickTxOpen={() => setQuickTxOpen(true)}
            onHelpOpen={() => setHelpOpen(true)}
            onLogout={handleLogout}
          />

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

          {!sidebarOpen && <BottomNav onQuickMenuOpen={() => setQuickMenuOpen(true)} onOpenSidebar={() => setSidebarOpen(true)} />}

          <footer className="no-print border-t px-4 md:px-6 lg:px-8 py-3 pb-16 lg:pb-3" style={{borderColor:'var(--color-border)', background:'var(--color-surface)'}}>
            <p className="text-xs text-center" style={{color:'var(--color-muted)', fontFamily:'var(--font-body)'}}>
              &copy; {new Date().getFullYear()} Akwetche — Tous droits réservés.
            </p>
          </footer>
        </div>
      </div>

      <NotificationsDrawer open={notifDrawerOpen} onClose={() => setNotifDrawerOpen(false)} onUnreadChange={setUnread} />
      <QuickActionsSheet open={quickMenuOpen} onClose={() => setQuickMenuOpen(false)} onQuickTxOpen={() => setQuickTxOpen(true)} />
      <QuickTransactionModal open={quickTxOpen} onClose={() => setQuickTxOpen(false)} onSuccess={triggerRefresh} />
      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />
    </DashboardContext.Provider>
  );
}
