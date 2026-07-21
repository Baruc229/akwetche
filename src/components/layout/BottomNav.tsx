"use client";

import { usePathname, useRouter } from "next/navigation";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse, faArrowsUpDown, faChartBar, faPlus, faBars, faCashRegister } from '@fortawesome/free-solid-svg-icons';
import Link from "next/link";
import { useDashboard } from "@/app/(dashboard)/layout";

const CREATE_ROUTES = [
  "/dashboard/transactions",
  "/dashboard/products",
  "/dashboard/sales",
  "/dashboard/tontines",
  "/dashboard/recurring/expenses",
  "/dashboard/recurring/income",
];

type Props = {
  onQuickMenuOpen: () => void;
  onOpenSidebar: () => void;
};

export default function BottomNav({ onQuickMenuOpen, onOpenSidebar }: Props) {
  const { commercialMode } = useDashboard();
  const pathname = usePathname();
  const router = useRouter();

  const fourthSlot = commercialMode
    ? { href: "/dashboard/sales", label: "Ventes", icon: faCashRegister }
    : { href: "/dashboard/reports", label: "Bilans", icon: faChartBar };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden" style={{background:'var(--color-surface)', borderTop:'1px solid var(--color-border)', padding:'6px 0 calc(6px + env(safe-area-inset-bottom))'}}>
      <div className="flex items-center">
        {([
          { href: "/dashboard", label: "Accueil", icon: faHouse },
          { href: "/dashboard/transactions", label: "Transactions", icon: faArrowsUpDown },
        ] as const).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className="flex-1 flex flex-col items-center gap-[3px] py-[6px] px-1" style={{color: isActive ? 'var(--color-brand)' : 'var(--color-muted)', fontSize:'10.5px', fontWeight: isActive ? 600 : 500, fontFamily:'var(--font-body)'}}>
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
              if (isHome || !hasCreate) { onQuickMenuOpen(); } else { router.push(pathname + "?action=create"); }
            }}
            className="absolute left-1/2 -translate-x-1/2 bottom-0 w-12 h-12 rounded-full bg-[var(--color-brand)] text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform hover:opacity-90"
            style={{marginBottom:'-4px'}}
            aria-label="Action rapide"
          >
            <FontAwesomeIcon icon={faPlus} className="w-5 h-5" />
          </button>
        </div>

        {/* 4th slot: contextuel (Ventes si commercialMode, sinon Bilans) */}
        {(() => {
          const isActive = pathname === fourthSlot.href || pathname.startsWith(fourthSlot.href);
          return (
            <Link href={fourthSlot.href} className="flex-1 flex flex-col items-center gap-[3px] py-[6px] px-1" style={{color: isActive ? 'var(--color-brand)' : 'var(--color-muted)', fontSize:'10.5px', fontWeight: isActive ? 600 : 500, fontFamily:'var(--font-body)'}}>
              <FontAwesomeIcon icon={fourthSlot.icon} className="w-5 h-5" />
              <span>{fourthSlot.label}</span>
            </Link>
          );
        })()}

        {/* Menu button → opens sidebar */}
        <button onClick={onOpenSidebar} className="flex-1 flex flex-col items-center gap-[3px] py-[6px] px-1 cursor-pointer border-none" style={{color:'var(--color-muted)', fontSize:'10.5px', fontWeight:500, fontFamily:'var(--font-body)', background:'transparent'}}>
          <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
          <span>Menu</span>
        </button>
      </div>
    </nav>
  );
}
