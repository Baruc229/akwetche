"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Wallet,
  LayoutDashboard,
  ArrowUpDown,
  ShoppingBag,
  BarChart3,
  Settings,
  LogOut,
  Package,
  TrendingUp,
  Menu,
  X,
  ChevronRight,
  Shield,
  MessageCircle,
  Home,
} from "lucide-react";
import Link from "next/link";
import { resolveCurrency, setActiveCurrency } from "@/lib/currency";
import type { CurrencyCode } from "@/lib/currency";

type UserData = {
  id: number;
  name: string;
  email: string;
  initialBalance: number;
  initialBalanceActivity?: number;
  role?: string;
  currency?: string;
  plan?: string;
  status?: string;
  activityActivated?: boolean;
  emailVerified?: string | null;
  subscription?: { status: string; amount: number; currency: string; endDate: string } | null;
};

type DashboardContextType = {
  user: UserData | null;
  setUser: (u: UserData | null) => void;
  commercialMode: boolean;
  setCommercialMode: (v: boolean) => void;
  currency: CurrencyCode;
};

const DashboardContext = createContext<DashboardContextType>({
  user: null,
  setUser: () => {},
  commercialMode: false,
  setCommercialMode: () => {},
  currency: "XOF",
});

export const useDashboard = () => useContext(DashboardContext);

const navItems = [
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "Historique", icon: ArrowUpDown },
  { href: "/dashboard/reports", label: "Bilans", icon: BarChart3 },
];

const commercialNavItems = [
  { href: "/dashboard/products", label: "Produits", icon: Package },
  { href: "/dashboard/sales", label: "Ventes", icon: TrendingUp },
  { href: "/dashboard/stock", label: "Stock", icon: ShoppingBag },
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
    const saved = localStorage.getItem("akwetche_commercial");
    const isMobile = window.innerWidth < 1024;

    if (saved === "true") {
      setCommercialMode(true);
      if (user?.plan === "premium" && !user?.activityActivated) {
        fetch("/api/auth/activate-activity", { method: "POST" }).catch(() => {});
      }
    } else if (saved === null && isMobile && user?.plan === "premium") {
      setCommercialMode(true);
      localStorage.setItem("akwetche_commercial", "true");
      if (!user?.activityActivated) {
        fetch("/api/auth/activate-activity", { method: "POST" }).catch(() => {});
      }
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem("akwetche_commercial", String(commercialMode));
  }, [commercialMode]);

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
        setActiveCurrency(resolveCurrency(data.user?.currency));
      })
      .catch(() => {
        localStorage.removeItem("akwetche_session");
        router.push(sessionFlag ? "/login?expired=1" : "/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <DashboardContext.Provider
      value={{ user, setUser, commercialMode, setCommercialMode, currency: resolveCurrency(user?.currency) }}
    >
      <div className="min-h-screen bg-stone-50 flex">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-stone-200 transform transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-auto flex flex-col overflow-hidden ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between p-4 border-b border-stone-200 shrink-0">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-sm">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-emerald-700">
                Akwetche
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-stone-400 hover:text-stone-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 border-b border-stone-100 shrink-0">
            <p className="text-sm text-stone-500">Connecté en tant que</p>
            <p className="text-sm font-medium text-stone-800 truncate">
              {user.name}
            </p>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 font-medium"
                      : "text-stone-600 hover:bg-stone-50 hover:text-stone-800"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                  {isActive && (
                    <ChevronRight className="w-3.5 h-3.5 ml-auto text-emerald-400" />
                  )}
                </Link>
              );
            })}

            {commercialMode && (
              <>
                <div className="pt-3 mt-3 border-t border-stone-100">
                  <p className="px-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">
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
                      className={`flex items-center gap-3 px-3 ml-2 py-2 rounded-xl text-sm transition-all ${
                        isActive
                          ? "bg-amber-50 text-amber-700 font-medium"
                          : "text-stone-600 hover:bg-stone-50 hover:text-stone-800"
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                      {isActive && (
                        <ChevronRight className="w-3.5 h-3.5 ml-auto text-amber-400" />
                      )}
                    </Link>
                  );
                })}
              </>
            )}

            <div className="pt-3 mt-3 border-t border-stone-100">
              {user && user.role !== "user" && (
                <Link
                  href="/admin"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    pathname === "/admin"
                      ? "bg-emerald-50 text-emerald-700 font-medium"
                      : "text-stone-600 hover:bg-stone-50 hover:text-stone-800"
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Administration
                  {pathname === "/admin" && (
                    <ChevronRight className="w-3.5 h-3.5 ml-auto text-emerald-400" />
                  )}
                </Link>
              )}
              <Link
                href="/dashboard/settings"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  pathname === "/dashboard/settings"
                    ? "bg-emerald-50 text-emerald-700 font-medium"
                    : "text-stone-600 hover:bg-stone-50 hover:text-stone-800"
                }`}
              >
                <Settings className="w-4 h-4" />
                Paramètres
                {pathname === "/dashboard/settings" && (
                  <ChevronRight className="w-3.5 h-3.5 ml-auto text-emerald-400" />
                )}
              </Link>
            </div>

            {(user?.plan === "premium" || user?.role !== "user") ? (
              <div className="pt-3 mt-3 border-t border-stone-100">
                <label className="flex items-center gap-3 px-3 py-2.5 text-sm text-stone-600 cursor-pointer hover:bg-stone-50 rounded-xl transition-all">
                  <input
                    type="checkbox"
                    checked={commercialMode}
                    onChange={(e) => {
                      setCommercialMode(e.target.checked);
                      if (e.target.checked) {
                        fetch("/api/auth/activate-activity", { method: "POST" }).catch(() => {});
                      }
                    }}
                    className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <ShoppingBag className="w-4 h-4" />
                  Activité commerciale
                </label>
              </div>
            ) : (
              <div className="pt-3 mt-3 border-t border-stone-100">
                <div className="flex items-center gap-3 px-3 py-2.5 text-sm text-stone-400 opacity-60">
                  <input type="checkbox" disabled className="w-4 h-4 rounded border-stone-200 bg-stone-100" />
                  <ShoppingBag className="w-4 h-4" />
                  Activité commerciale
                  <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded ml-auto">Premium</span>
                </div>
              </div>
            )}
          </nav>

          <div className="shrink-0 p-3 border-t border-stone-200 bg-white">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 w-full text-sm text-stone-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
            >
              <LogOut className="w-4 h-4" />
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

        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b border-stone-200 px-4 py-3 flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-stone-600 hover:text-stone-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-emerald-800">Akwetche</span>
            </Link>
          </header>

          <main className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto min-h-[calc(100vh-8rem)] pb-20 lg:pb-0">
            {children}
          </main>

          {/* Navigation inférieure (mobile) */}
          <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-stone-200 lg:hidden safe-area-bottom">
            <div className="flex items-center gap-0 px-1 py-1 overflow-x-auto flex-nowrap scrollbar-hide">
              {[
                { href: "/dashboard", label: "Accueil", icon: Home },
                ...(commercialMode ? [{ href: "/dashboard/products", label: "Produits", icon: Package }] : []),
                { href: "/dashboard/transactions", label: "Transactions", icon: ArrowUpDown },
                ...(commercialMode ? [{ href: "/dashboard/sales", label: "Ventes", icon: TrendingUp }] : []),
                ...(commercialMode ? [{ href: "/dashboard/stock", label: "Stock", icon: ShoppingBag }] : []),
                { href: "/dashboard/reports", label: "Bilans", icon: BarChart3 },
                { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
              ].map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex flex-col items-center gap-0.5 py-1.5 px-2.5 min-w-0 shrink-0 rounded-xl text-[10px] font-medium transition-all ${
                      isActive
                        ? "text-emerald-600"
                        : "text-stone-400 hover:text-stone-600"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <footer className="border-t border-stone-200 bg-white px-4 md:px-6 lg:px-8 py-3 pb-20 lg:pb-3">
            <p className="text-xs text-stone-400 text-center">
              &copy; {new Date().getFullYear()} Akwetche — Tous droits réservés.
            </p>
          </footer>
        </div>
      </div>
    </DashboardContext.Provider>
  );
}
