"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWallet, faGauge, faArrowsUpDown, faBagShopping, faChartBar, faGear, faRightFromBracket, faBox, faArrowTrendUp, faBars, faXmark, faChevronRight, faShield, faComments, faHouse, faCircleCheck, faLock } from '@fortawesome/free-solid-svg-icons';
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
 setActiveCurrency(resolveCurrency(data.user?.currency));
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
 <div className="min-h-screen flex items-center justify-center bg-sand">
 <div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" />
 </div>
 );
 }

 if (!user) return null;

 const isPremium = user?.plan === "premium" || user?.role !== "user";
 const isFreeLocked = user?.role === "user" && user?.plan !== "premium" && user?.subscription?.status !== "active";

 return (
 <DashboardContext.Provider
 value={{ user, setUser, commercialMode, currency: resolveCurrency(user?.currency) }}
 >
 <div className="min-h-screen bg-sand flex">
 <aside
 className={`fixed top-0 left-0 z-40 w-64 bg-white border-r border-border transform transition-transform duration-200 lg:translate-x-0 flex flex-col overflow-y-auto lg:overflow-hidden sidebar-mobile ${
 sidebarOpen ? "translate-x-0" : "-translate-x-full"
 }`}
 >
 <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
 <Link href="/dashboard" className="flex items-center gap-2">
 <div className="w-8 h-8 bg-forest rounded-xl flex items-center justify-center shadow-sm">
 <FontAwesomeIcon icon={faWallet} className="w-4 h-4 text-white" />
 </div>
 <span className="text-lg font-bold text-forest">
 Akwetche
 </span>
 </Link>
 <button
 onClick={() => setSidebarOpen(false)}
 className="lg:hidden text-muted hover:text-muted"
 >
 <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
 </button>
 </div>

 <div className="p-4 border-b border-border shrink-0">
 <p className="text-sm text-muted">Connecté en tant que</p>
 <p className="text-sm font-medium text-ink truncate">
 {user.name}
 </p>
 </div>

 <nav className="lg:flex-1 lg:overflow-y-auto p-3 space-y-1">
 {navItems.map((item) => {
 const isActive = pathname === item.href;
 return (
 <Link
 key={item.href}
 href={item.href}
 onClick={() => setSidebarOpen(false)}
 className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
 isActive
 ? "bg-ochre-light text-forest font-medium"
 : "text-muted hover:bg-sand hover:text-ink"
 }`}
 >
 <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
 {item.label}
 {isActive && (
 <FontAwesomeIcon icon={faChevronRight} className="w-3.5 h-3.5 ml-auto text-forest-light" />
 )}
 </Link>
 );
 })}

 {commercialMode && (
 <>
 <div className="pt-3 mt-3 border-t border-border">
 <p className="px-3 text-xs font-semibold text-muted uppercase tracking-wider">
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
 ? "bg-ochre-light text-ochre font-medium"
 : "text-muted hover:bg-sand hover:text-ink"
 }`}
 >
 <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
 {item.label}
 {isActive && (
 <FontAwesomeIcon icon={faChevronRight} className="w-3.5 h-3.5 ml-auto text-ochre" />
 )}
 </Link>
 );
 })}
 </>
 )}

 <div className="pt-3 mt-3 border-t border-border">
 {user && user.role !== "user" && (
 <Link
 href="/admin"
 onClick={() => setSidebarOpen(false)}
 className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
 pathname === "/admin"
 ? "bg-ochre-light text-forest font-medium"
 : "text-muted hover:bg-sand hover:text-ink"
 }`}
 >
 <FontAwesomeIcon icon={faShield} className="w-4 h-4" />
 Administration
 {pathname === "/admin" && (
 <FontAwesomeIcon icon={faChevronRight} className="w-3.5 h-3.5 ml-auto text-forest-light" />
 )}
 </Link>
 )}
 <Link
 href="/dashboard/settings"
 onClick={() => setSidebarOpen(false)}
 className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
 pathname === "/dashboard/settings"
 ? "bg-ochre-light text-forest font-medium"
 : "text-muted hover:bg-sand hover:text-ink"
 }`}
 >
 <FontAwesomeIcon icon={faGear} className="w-4 h-4" />
 Paramètres
 {pathname === "/dashboard/settings" && (
 <FontAwesomeIcon icon={faChevronRight} className="w-3.5 h-3.5 ml-auto text-forest-light" />
 )}
 </Link>
 </div>

 {isPremium && (
 <div className="pt-3 mt-3 border-t border-border">
 <label className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted cursor-pointer hover:bg-sand rounded-xl transition-all">
 <input
 type="checkbox"
 checked={commercialMode}
 onChange={(e) => {
 setCommercialMode(e.target.checked);
 if (e.target.checked && !user?.activityActivated) {
 fetch("/api/auth/activate-activity", { method: "POST" }).catch(() => {});
 }
 }}
 className="w-4 h-4 rounded border-border text-forest focus:ring-forest"
 />
 <FontAwesomeIcon icon={faBagShopping} className="w-4 h-4" />
 Activité commerciale
 </label>
 </div>
 )}
 </nav>

 <div className="shrink-0 p-3 border-t border-border bg-white">
 <button
 onClick={handleLogout}
 className="flex items-center gap-3 px-3 py-2.5 w-full text-sm text-muted hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
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

 <div className="flex-1 min-w-0 lg:ml-64">
 <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3 lg:hidden">
 <button
 onClick={() => setSidebarOpen(true)}
 className="text-muted hover:text-ink"
 >
 <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
 </button>
 <Link href="/dashboard" className="flex items-center gap-2">
 <div className="w-7 h-7 bg-forest rounded-lg flex items-center justify-center">
 <FontAwesomeIcon icon={faWallet} className="w-3.5 h-3.5 text-white" />
 </div>
 <span className="font-bold text-forest">Akwetche</span>
 </Link>
 </header>

 <main className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto min-h-[calc(100vh-8rem)] pb-20 lg:pb-0">
 {children}
 </main>

 {/* Navigation inférieure (mobile) */}
 <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border lg:hidden safe-area-bottom">
 <div className="flex items-center gap-0 px-1 py-1 overflow-x-auto flex-nowrap scrollbar-hide">
 {[
  { href: "/dashboard", label: "Accueil", icon: faHouse },
  { href: "/dashboard/products", label: "Produits", icon: faBox, locked: isFreeLocked, lockedHref: "/payment" },
  { href: "/dashboard/transactions", label: "Transactions", icon: faArrowsUpDown },
  { href: "/dashboard/sales", label: "Ventes", icon: faArrowTrendUp, locked: isFreeLocked, lockedHref: "/payment" },
  { href: "/dashboard/reports", label: "Bilans", icon: faChartBar },
  { href: "/dashboard/settings", label: "Paramètres", icon: faGear },
 ].map((item: any) => {
 const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
 if (item.locked) {
 return (
 <button
 key={item.href}
 onClick={() => router.push(item.lockedHref)}
 className={`flex flex-col items-center gap-0.5 py-1.5 px-2.5 min-w-0 shrink-0 rounded-xl text-[10px] font-medium transition-all text-muted`}
 >
 <FontAwesomeIcon icon={faLock} className="w-5 h-5" />
 <span className="whitespace-nowrap">{item.label}</span>
 </button>
 );
 }
 return (
 <Link
 key={item.href}
 href={item.href}
 onClick={() => setSidebarOpen(false)}
 className={`flex flex-col items-center gap-0.5 py-1.5 px-2.5 min-w-0 shrink-0 rounded-xl text-[10px] font-medium transition-all ${
 isActive ? "text-forest" : "text-muted hover:text-muted"
 }`}
 >
 <FontAwesomeIcon icon={item.icon} className="w-5 h-5" />
 <span className="whitespace-nowrap">{item.label}</span>
 </Link>
 );
 })}
 </div>
 </nav>

 <footer className="border-t border-border bg-white px-4 md:px-6 lg:px-8 py-3 pb-20 lg:pb-3">
 <p className="text-xs text-muted text-center">
 &copy; {new Date().getFullYear()} Akwetche — Tous droits réservés.
 </p>
 </footer>
 </div>
 </div>
 </DashboardContext.Provider>
 );
}
