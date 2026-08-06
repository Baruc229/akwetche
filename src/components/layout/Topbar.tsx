"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faBell, faGear, faShield, faStar, faArrowRightFromBracket, faChevronDown, faOutdent, faIndent, faCoins, faSpinner, faBagShopping, faBox, faPeopleGroup, faArrowTrendDown, faArrowTrendUp } from '@fortawesome/free-solid-svg-icons';
import { useDashboard } from "@/app/(dashboard)/layout";

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

type QuickActionBtnProps = { icon: any; label: string; hint: string; onClick: () => void }; // eslint-disable-line @typescript-eslint/no-explicit-any

function QuickActionBtn({ icon, label, hint, onClick }: QuickActionBtnProps) {
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

type Props = {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileSidebar: () => void;
  unread: number;
  onOpenNotifications: () => void;
  onQuickTxOpen: () => void;
  onHelpOpen: () => void;
  onLogout: () => void;
};

/* eslint-disable @typescript-eslint/no-unused-vars */
export default function Topbar({ sidebarCollapsed, onToggleSidebar, onOpenMobileSidebar, unread, onOpenNotifications, onQuickTxOpen, onHelpOpen, onLogout }: Props) {
  const { user, commercialMode, currency, setCurrency, setUser } = useDashboard();
  const router = useRouter();
  const pathname = usePathname();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [savingCurrency, setSavingCurrency] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const quickMenuRef = useRef<HTMLDivElement>(null);

  const pageTitle = Object.entries(PAGE_TITLES).find(([path]) => pathname === path || (path !== '/admin' && path !== '/dashboard' && pathname.startsWith(path)))?.[1] || 'Akwetche';
  const avatarInitial = user?.name?.charAt(0)?.toUpperCase() || '?';
  const isPremium = user?.plan === "premium" || user?.role !== "user";
  const isFreeLocked = user?.role === "user" && user?.plan !== "premium" && user?.subscription?.status !== "active";

  const handleCurrencyToggle = useCallback(async () => {
    if (savingCurrency) return;
    const next = currency === "EUR" ? "XOF" : "EUR";
    setSavingCurrency(true);
    setCurrency(next);
    try {
      const res = await fetch("/api/user", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currency: next }) });
      if (res.ok) { const data = await res.json(); setUser(data.user); }
    } catch {} finally { setSavingCurrency(false); }
  }, [currency, savingCurrency, setCurrency]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) setAccountMenuOpen(false);
      if (quickMenuRef.current && !quickMenuRef.current.contains(e.target as Node)) setQuickMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="sticky top-0 z-20" style={{background:'var(--color-surface)', borderBottom:'1px solid var(--color-border)'}}>
      <div className="flex items-center justify-between h-[58px] px-4 md:px-6">
        <div className="flex items-center gap-2">
          <button onClick={onOpenMobileSidebar} className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-brand-subtle)] transition-all" aria-label="Menu">
            <FontAwesomeIcon icon={faOutdent} className="w-4 h-4" />
          </button>
          <button onClick={onToggleSidebar} className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-brand-subtle)] transition-all" title={sidebarCollapsed ? 'Agrandir la sidebar' : 'Réduire la sidebar'}>
            <FontAwesomeIcon icon={sidebarCollapsed ? faIndent : faOutdent} className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-semibold" style={{fontFamily:'var(--font-display)', color:'var(--color-ink)'}}>{pageTitle}</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick action dropdown — desktop */}
          <div className="relative hidden lg:block" ref={quickMenuRef}>
            <button onClick={() => setQuickMenuOpen(!quickMenuOpen)} className="w-9 h-9 flex items-center justify-center rounded-lg transition-all hover:bg-[var(--color-brand-subtle)]" style={{color:'var(--color-muted)'}} aria-label="Action rapide">
              <FontAwesomeIcon icon={faPlus} className="w-[18px] h-[18px]" />
            </button>
            {quickMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 z-[100] bg-[var(--color-surface)] rounded-xl shadow-xl border border-[var(--color-border)] overflow-hidden animate-scale-in" style={{transformOrigin:'top right'}}>
                <div className="p-1.5">
                  <QuickActionBtn icon={faPlus} label="Nouvelle transaction" hint="Sans navigation" onClick={() => { setQuickMenuOpen(false); onQuickTxOpen(); }} />
                  {commercialMode && (
                    <>
                      <QuickActionBtn icon={faBagShopping} label="Nouvelle vente" hint="Naviguer →" onClick={() => { setQuickMenuOpen(false); router.push("/dashboard/sales?action=create"); }} />
                      <QuickActionBtn icon={faBox} label="Nouveau produit" hint="Naviguer →" onClick={() => { setQuickMenuOpen(false); router.push("/dashboard/products?action=create"); }} />
                    </>
                  )}
                  {user && (user.role !== "user" || user.tontineAccess) && (
                    <QuickActionBtn icon={faPeopleGroup} label="Cotisation tontine" hint="Naviguer →" onClick={() => { setQuickMenuOpen(false); router.push("/dashboard/tontines?action=create"); }} />
                  )}
                  <QuickActionBtn icon={faArrowTrendDown} label="Dépense récurrente" hint="Naviguer →" onClick={() => { setQuickMenuOpen(false); router.push("/dashboard/recurring/expenses?action=create"); }} />
                  <QuickActionBtn icon={faArrowTrendUp} label="Revenu récurrent" hint="Naviguer →" onClick={() => { setQuickMenuOpen(false); router.push("/dashboard/recurring/income?action=create"); }} />
                </div>
              </div>
            )}
          </div>

          {/* Notification bell */}
          <button onClick={onOpenNotifications} className="relative p-2 rounded-lg transition-all" style={{color:'var(--color-muted)'}} aria-label="Notifications">
            <FontAwesomeIcon icon={faBell} className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 text-[10px] font-bold flex items-center justify-center rounded-full min-w-[18px] min-h-[18px] leading-none" style={{background:'var(--color-neg)', color:'white'}}>
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {/* Currency toggle — desktop */}
          <div className="hidden md:flex items-center rounded-lg overflow-hidden" style={{border:'1px solid var(--color-border)'}}>
            <button onClick={currency === "XOF" ? undefined : handleCurrencyToggle} disabled={savingCurrency} className="px-2.5 py-1.5 text-xs font-semibold transition-all" style={{ background: currency === "XOF" ? 'var(--color-brand)' : 'transparent', color: currency === "XOF" ? 'white' : 'var(--color-muted)' }}>
              {savingCurrency && currency === "EUR" ? <FontAwesomeIcon icon={faSpinner} className="w-3 h-3 animate-spin" /> : "FCFA"}
            </button>
            <button onClick={currency === "EUR" ? undefined : handleCurrencyToggle} disabled={savingCurrency} className="px-2.5 py-1.5 text-xs font-semibold transition-all" style={{ background: currency === "EUR" ? 'var(--color-brand)' : 'transparent', color: currency === "EUR" ? 'white' : 'var(--color-muted)' }}>
              {savingCurrency && currency === "XOF" ? <FontAwesomeIcon icon={faSpinner} className="w-3 h-3 animate-spin" /> : "EUR"}
            </button>
          </div>

          {/* Currency toggle — mobile */}
          <button onClick={handleCurrencyToggle} disabled={savingCurrency} className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg transition-all" style={{color:'var(--color-muted)'}} title={`Basculer en ${currency === "EUR" ? "FCFA" : "EUR"}`}>
            {savingCurrency ? <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" /> : <FontAwesomeIcon icon={faCoins} className="w-4 h-4" />}
          </button>

          {/* Account avatar */}
          <div className="relative" ref={accountMenuRef}>
            <button onClick={() => setAccountMenuOpen(!accountMenuOpen)} className="flex items-center gap-1.5 px-1 py-1 rounded-lg transition-all hover:bg-[var(--color-brand-subtle)] cursor-pointer">
              <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-sm font-bold overflow-hidden shrink-0" style={{background: user?.avatarUrl ? 'transparent' : 'var(--color-gold)', color: 'var(--color-brand)', outline: accountMenuOpen ? '2px solid var(--color-brand)' : '2px solid transparent', outlineOffset: '2px'}}>
                {user?.avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={user.avatarUrl} alt={user?.name || ""} className="w-full h-full object-cover" />
                ) : avatarInitial}
              </div>
              <FontAwesomeIcon icon={faChevronDown} className="w-3 h-3 text-muted transition-transform" style={{transform: accountMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)'}} />
            </button>
            {accountMenuOpen && (
              <div className="account-menu">
                <div className="p-4" style={{borderBottom:'1px solid var(--color-border)', background:'var(--color-surface-raised)'}}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0 overflow-hidden" style={{background: user?.avatarUrl ? 'transparent' : 'var(--color-gold)', color: 'var(--color-brand)'}}>
                      {user?.avatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={user.avatarUrl} alt={user?.name || ""} className="w-full h-full object-cover" />
                      ) : avatarInitial}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{color:'var(--color-ink)'}}>{user?.name}</p>
                      <p className="text-xs truncate" style={{color:'var(--color-muted)'}}>{user?.email}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="badge" style={isPremium ? {background:'var(--color-gold-light)', color:'#92400E'} : {background:'var(--color-brand-subtle)', color:'var(--color-brand)'}}>
                      {isPremium ? 'Premium' : 'Gratuit'}
                    </span>
                    {user?.subscription?.status === 'active' && <span className="badge badge-pos">✓ Actif</span>}
                  </div>
                </div>
                <div>
                  <button onClick={() => { setAccountMenuOpen(false); router.push('/dashboard/settings'); }} className="account-menu-item">
                    <FontAwesomeIcon icon={faGear} className="w-4 h-4" /> Paramètres du compte
                  </button>
                  {user && user.role !== "user" && (
                    <button onClick={() => { setAccountMenuOpen(false); router.push('/admin'); }} className="account-menu-item">
                      <FontAwesomeIcon icon={faShield} className="w-4 h-4" /> Administration
                    </button>
                  )}
                  {isFreeLocked && (
                    <>
                      <div className="account-menu-divider" />
                      <button onClick={() => { setAccountMenuOpen(false); router.push('/payment'); }} className="account-menu-item upgrade">
                        <FontAwesomeIcon icon={faStar} className="w-4 h-4" /> Passer à Premium →
                      </button>
                    </>
                  )}
                  <div className="account-menu-divider" />
                  <button onClick={() => { setAccountMenuOpen(false); onLogout(); }} className="account-menu-item danger">
                    <FontAwesomeIcon icon={faArrowRightFromBracket} className="w-4 h-4" /> Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .account-menu { position:absolute; right:0; top:calc(100% + 8px); width:260px; z-index:100; overflow:hidden; background:var(--color-surface); border:1px solid var(--color-border); border-radius:14px; box-shadow:0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06); animation:scaleIn 0.18s cubic-bezier(0.16,1,0.3,1) forwards; transform-origin:top right; }
        .account-menu-item { display:flex; align-items:center; gap:10px; width:100%; padding:11px 16px; border:none; background:transparent; font-size:13.5px; font-weight:500; cursor:pointer; font-family:var(--font-body); text-align:left; transition:background 0.11s; color:var(--color-body); }
        .account-menu-item:hover { background:var(--color-surface-raised); color:var(--color-ink); }
        .account-menu-item.upgrade { color:var(--color-brand); font-weight:600; }
        .account-menu-item.upgrade:hover { background:var(--color-brand-subtle); }
        .account-menu-item.danger { color:var(--color-neg); }
        .account-menu-item.danger:hover { background:var(--color-neg-bg); }
        .account-menu-divider { height:1px; background:var(--color-border); margin:4px 0; }
      `}</style>
    </header>
  );
}
