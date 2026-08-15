"use client";

import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faBagShopping, faBox, faPeopleGroup, faArrowTrendDown, faArrowTrendUp, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useDashboard } from "@/app/(dashboard)/layout";
import { useScrollLock } from "@/hooks/useScrollLock";

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
  open: boolean;
  onClose: () => void;
  onQuickTxOpen: () => void;
};

export default function QuickActionsSheet({ open, onClose, onQuickTxOpen }: Props) {
  const { commercialMode, user } = useDashboard();
  const router = useRouter();
  useScrollLock(open);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 lg:hidden bg-black/40 animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-[var(--color-surface)] rounded-t-2xl max-h-[70vh] overflow-y-auto animate-slide-up shadow-xl pb-[max(env(safe-area-inset-bottom),16px)]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h3 className="text-base font-semibold text-ink">Actions rapides</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-muted hover:text-ink rounded-lg hover:bg-[var(--color-surface-raised)] transition-colors">
            <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 space-y-1">
          <QuickActionBtn icon={faPlus} label="Nouvelle transaction" hint="Sans navigation" onClick={() => { onClose(); onQuickTxOpen(); }} />
          {commercialMode && (
            <>
              <QuickActionBtn icon={faBagShopping} label="Nouvelle vente" hint="Naviguer →" onClick={() => { onClose(); router.push("/dashboard/sales?action=create"); }} />
              <QuickActionBtn icon={faBox} label="Nouveau produit" hint="Naviguer →" onClick={() => { onClose(); router.push("/dashboard/products?action=create"); }} />
            </>
          )}
          {user && (user.role !== "user" || user.tontineAccess) && (
            <QuickActionBtn icon={faPeopleGroup} label="Cotisation tontine" hint="Naviguer →" onClick={() => { onClose(); router.push("/dashboard/tontines?action=create"); }} />
          )}
          <QuickActionBtn icon={faArrowTrendDown} label="Dépense récurrente" hint="Naviguer →" onClick={() => { onClose(); router.push("/dashboard/recurring/expenses?action=create"); }} />
          <QuickActionBtn icon={faArrowTrendUp} label="Revenu récurrent" hint="Naviguer →" onClick={() => { onClose(); router.push("/dashboard/recurring/income?action=create"); }} />
        </div>
      </div>
    </>
  );
}
