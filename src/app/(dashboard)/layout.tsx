"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGauge, faArrowsUpDown, faBagShopping, faChartBar, faGear, faRightFromBracket, faBox, faArrowTrendUp, faBars, faXmark, faChevronRight, faShield, faComments, faHouse, faCircleCheck, faLock } from '@fortawesome/free-solid-svg-icons';
import Link from "next/link";
import { resolveCurrency, setActiveCurrency, setActiveBaseCurrency, type CurrencyCode } from "@/lib/currency";
import ExpirationBanner from "@/components/subscription/ExpirationBanner";
import ExpiredModal from "@/components/subscription/ExpiredModal";
import NotificationBell from "@/components/NotificationBell";

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
};

const DashboardContext = createContext<DashboardContextType>({
 user: null,
 setUser: () => {},
 commercialMode: false,
 currency: "XOF",
});

export const useDashboard = () => useContext(DashboardContext);

const navItems = [
  { href: "/dashboard", label: "Accueil", icon: faGauge },
  { href: "/dashboard/transactions", label: "Historique", icon: faArrowsUpDown },
  { href: "/dashboard/reports", label: "Bilans", icon: faChartBar },
];

const commercialNavItems = [
  { href: "/dashboard/products", label: "Produits", icon: faBox },
  { href: "/dashboard/sales", label: "Ventes", icon: faArrowTrendUp },
  { href: "/dashboard/stock", label: "Stock", icon: faBagShopping },
];

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
  setActiveCurrency(resolveCurrency(data.user?.currency || data.user?.baseCurrency));
  setActiveBaseCurrency((data.user?.baseCurrency || "XOF") as CurrencyCode);
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

 async function handleLogout() {
 await fetch("/api/auth/logout", { method: "POST" });
 router.push("/");
 }

  if (loading) {
  return (
  <div className="min-h-screen flex items-center justify-center bg-[#F2EDE4]">
  <div className="w-8 h-8 border-2 border-[#1C3A2F] border-t-transparent rounded-full animate-spin" />
  </div>
  );
  }

  if (!user) return null;

  const isPremium = user?.plan === "premium" || user?.role !== "user";
  const isFreeLocked = user?.role === "user" && user?.plan !== "premium" && user?.subscription?.status !== "active";

  const subStatus = user?.subscription;
  const showExpiredModal = subStatus?.status === "expired" || (subStatus?.status === "active" && (subStatus?.daysRemaining ?? 999) <= 0);

  return (
  <DashboardContext.Provider
    value={{ user, setUser, commercialMode, currency: resolveCurrency(user?.currency) }}
  >
    <div className="min-h-screen bg-[#F2EDE4] flex flex-col lg:flex-row">
    <aside
      className={`fixed top-0 left-0 z-40 w-64 bg-white border-r border-[#E0D8CC] transition-transform duration-200 lg:translate-x-0 flex flex-col h-dvh lg:h-screen max-h-screen overflow-hidden pb-14 lg:pb-0 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b border-[#E0D8CC] shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1C3A2F] rounded-xl flex items-center justify-center shadow-sm">
            <img src="/akwetche-symbole.png" alt="Akwetche" className="w-4 h-4" />
          </div>
          <span className="text-lg font-bold text-[#1C3A2F] font-[family-name:var(--font-dm-sans)]">
            Akwetche
          </span>
        </Link>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden text-[#9BA89D] hover:text-[#9BA89D]"
        >
          <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 border-b border-[#E0D8CC] shrink-0">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm text-[#9BA89D] font-[family-name:var(--font-inter)]">Connecté en tant que</p>
            <p className="text-sm font-medium text-[#1A1A1A] truncate font-[family-name:var(--font-inter)]">
              {user.name}
            </p>
          </div>
          <div className="hidden lg:block">
            <NotificationBell />
          </div>
        </div>
      </div>

      {/* Zone principale — navigation scrollable */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all font-[family-name:var(--font-inter)] ${
                isActive
                  ? "bg-[#F7F0D6] text-[#1C3A2F] font-medium"
                  : "text-[#9BA89D] hover:bg-[#F2EDE4] hover:text-[#1A1A1A]"
              }`}
            >
              <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
              {item.label}
              {isActive && (
                <FontAwesomeIcon icon={faChevronRight} className="w-3.5 h-3.5 ml-auto text-[#1C3A2F]" />
              )}
            </Link>
          );
        })}

        {commercialMode && (
          <>
            <div className="pt-3 mt-3 border-t border-[#E0D8CC]">
              <p className="px-3 text-xs font-semibold text-[#9BA89D] uppercase tracking-wider font-[family-name:var(--font-inter)]">
                Activité
              </p>
            </div>
            {commercialNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 ml-2 py-2 rounded-xl text-sm transition-all font-[family-name:var(--font-inter)] ${
                    isActive
                      ? "bg-[#F7F0D6] text-[#C9A84C] font-medium"
                      : "text-[#9BA89D] hover:bg-[#F2EDE4] hover:text-[#1A1A1A]"
                  }`}
                >
                  <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
                  {item.label}
                  {isActive && (
                    <FontAwesomeIcon icon={faChevronRight} className="w-3.5 h-3.5 ml-auto text-[#C9A84C]" />
                  )}
                </Link>
              );
            })}
          </>
        )}

        <div className="pt-3 mt-3 border-t border-[#E0D8CC]">
          {user && user.role !== "user" && (
            <Link
              href="/admin"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all font-[family-name:var(--font-inter)] ${
                pathname === "/admin"
                  ? "bg-[#F7F0D6] text-[#1C3A2F] font-medium"
                  : "text-[#9BA89D] hover:bg-[#F2EDE4] hover:text-[#1A1A1A]"
              }`}
            >
              <FontAwesomeIcon icon={faShield} className="w-4 h-4" />
              Administration
              {pathname === "/admin" && (
                <FontAwesomeIcon icon={faChevronRight} className="w-3.5 h-3.5 ml-auto text-[#1C3A2F]" />
              )}
            </Link>
          )}
          <Link
            href="/dashboard/settings"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all font-[family-name:var(--font-inter)] ${
              pathname === "/dashboard/settings"
                ? "bg-[#F7F0D6] text-[#1C3A2F] font-medium"
                : "text-[#9BA89D] hover:bg-[#F2EDE4] hover:text-[#1A1A1A]"
            }`}
          >
            <FontAwesomeIcon icon={faGear} className="w-4 h-4" />
            Paramètres
            {pathname === "/dashboard/settings" && (
              <FontAwesomeIcon icon={faChevronRight} className="w-3.5 h-3.5 ml-auto text-[#1C3A2F]" />
            )}
          </Link>
        </div>

        {isPremium && (
          <div className="pt-3 mt-3 border-t border-[#E0D8CC]">
            <label className="flex items-center gap-3 px-3 py-2.5 text-sm text-[#9BA89D] cursor-pointer hover:bg-[#F2EDE4] rounded-xl transition-all font-[family-name:var(--font-inter)]">
              <input
                type="checkbox"
                checked={commercialMode}
                onChange={(e) => {
                  setCommercialMode(e.target.checked);
                  if (e.target.checked && !user?.activityActivated) {
                    fetch("/api/auth/activate-activity", { method: "POST" }).catch(() => {});
                  }
                }}
                className="w-4 h-4 rounded border-[#E0D8CC] text-[#1C3A2F] focus:ring-[#1C3A2F]"
              />
              <FontAwesomeIcon icon={faBagShopping} className="w-4 h-4" />
              Activité commerciale
            </label>
          </div>
        )}
      </nav>

      {/* Zone secondaire épinglée — Déconnexion */}
      <div className="shrink-0 border-t border-[#E0D8CC] py-3 px-3 space-y-1 bg-white">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full text-sm text-[#9BA89D] hover:bg-[#FCECEA] hover:text-[#B94A3E] rounded-xl transition-all font-[family-name:var(--font-inter)]"
        >
          <FontAwesomeIcon icon={faRightFromBracket} className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </aside>

  {sidebarOpen && (
  <div
  className="fixed inset-0 bg-black/20 z-30 lg:hidden"
  onClick={() => setSidebarOpen(false)}
  />
  )}

  <div className="flex-1 min-w-0 lg:ml-64 flex flex-col">
    <header className="sticky top-0 z-20 bg-white border-b-2 border-[#E0D8CC]/60 px-4 py-2.5 flex items-center gap-3 lg:hidden">
      <button
        onClick={() => setSidebarOpen(true)}
        className="text-[#1A1A1A] hover:text-[#1C3A2F]"
      >
        <FontAwesomeIcon icon={faBars} className="w-7 h-7" />
      </button>
      <Link href="/dashboard" className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-[#1C3A2F] rounded-xl flex items-center justify-center shadow-sm">
          <img src="/akwetche-symbole.png" alt="Akwetche" className="w-4 h-4" />
        </div>
        <span className="text-lg font-bold text-[#1C3A2F] font-[family-name:var(--font-dm-sans)]">Akwetche</span>
      </Link>
      <div className="ml-auto">
        <NotificationBell />
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

    {/* Navigation inférieure (mobile) — redesign */}
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden safe-area-bottom" style={{ backgroundColor: "rgba(242,237,228,0.95)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
      <div className="flex items-center justify-around px-1 py-1 max-w-lg mx-auto">
        {[
          { href: "/dashboard", label: "Accueil", icon: faHouse },
          { href: "/dashboard/products", label: "Produits", icon: faBox, locked: isFreeLocked, lockedHref: "/payment" },
          { href: "/dashboard/transactions", label: "Transactions", icon: faArrowsUpDown },
          { href: "/dashboard/reports", label: "Bilans", icon: faChartBar },
          { href: "/dashboard/settings", label: "Paramètres", icon: faGear },
        ].map((item: any) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          if (item.locked) {
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.lockedHref)}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1.5"
              >
                <FontAwesomeIcon icon={faLock} className="text-xl text-[#9BA89D]" />
                <span className="text-[10px] font-medium text-[#9BA89D] truncate max-w-full font-[family-name:var(--font-inter)]">{item.label}</span>
              </button>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1.5"
            >
              <FontAwesomeIcon
                icon={item.icon}
                className={`text-xl ${isActive ? "text-[#1C3A2F]" : "text-[#9BA89D]"}`}
                style={{ stroke: isActive ? "#1C3A2F" : "none", strokeWidth: isActive ? "0.5" : "0" }}
              />
              <span className={`text-[10px] font-medium truncate max-w-full font-[family-name:var(--font-inter)] ${
                isActive ? "text-[#1C3A2F]" : "text-[#9BA89D]"
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>

    <footer className="border-t border-[#E0D8CC] bg-white px-4 md:px-6 lg:px-8 py-3 pb-16 lg:pb-3">
      <p className="text-xs text-[#9BA89D] text-center font-[family-name:var(--font-inter)]">
        &copy; {new Date().getFullYear()} Akwetche — Tous droits réservés.
      </p>
    </footer>
  </div>
 </div>
 </DashboardContext.Provider>
 );
}
