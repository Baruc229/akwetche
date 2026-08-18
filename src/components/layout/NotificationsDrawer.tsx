"use client";

import { useState, useEffect, useMemo } from "react";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faBell, faSpinner, faCrown, faBox, faCartShopping, faArrowTrendUp, faArrowsUpDown, faShield, faUserGear } from '@fortawesome/free-solid-svg-icons';
import { type IconDefinition } from '@fortawesome/fontawesome-svg-core';

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
  subscription: faCrown, product: faBox, sale: faCartShopping,
  stock: faArrowTrendUp, transaction: faArrowsUpDown, admin: faShield, role: faUserGear, system: faBell,
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 172800) return "Hier";
  return `Il y a ${Math.floor(diff / 86400)} jours`;
}

type Props = {
  open: boolean;
  onClose: () => void;
  onUnreadChange: (count: number) => void;
};

export default function NotificationsDrawer({ open, onClose, onUnreadChange }: Props) {
  useScrollLock(open);
  const router = useRouter();
  const [notifTab, setNotifTab] = useState<"new" | "unread" | "read">("unread");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const [markingAll, setMarkingAll] = useState(false);
  const [confirmDeleteNotif, setConfirmDeleteNotif] = useState<Notification | null>(null);

  const [now, setNow] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/notifications?limit=50");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setNotifications(data.notifications);
            setUnread(data.unread);
            setNow(Date.now());
            onUnreadChange(data.unread);
          }
        }
      } catch {}
    }
    load();
    const interval = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [onUnreadChange]);

  const notifFiltered = useMemo(() => {
    const day = 86400000;
    return notifications.filter(n => {
      if (notifTab === "new") return !n.read && (now - new Date(n.createdAt).getTime()) < day;
      if (notifTab === "unread") return !n.read;
      return n.read;
    });
  }, [notifications, notifTab, now]);

  async function markAsRead(n: Notification) {
    if (n.read) return;
    setBusyIds(prev => new Set(prev).add(n.id));
    try {
      const res = await fetch(`/api/notifications/${n.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ read: true }) });
      if (!res.ok) throw new Error("Échec");
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      setUnread(prev => Math.max(0, prev - 1));
    } catch {} finally { setBusyIds(prev => { const s = new Set(prev); s.delete(n.id); return s; }); }
  }

  async function handleReadAll() {
    setMarkingAll(true);
    try {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      if (!res.ok) throw new Error("Échec");
      setNotifications(n => n.map(n => ({ ...n, read: true })));
      setUnread(0);
    } catch {} finally { setMarkingAll(false); }
  }

  async function handleDeleteNotif(n: Notification) {
    setConfirmDeleteNotif(null);
    setBusyIds(prev => new Set(prev).add(n.id));
    if (!n.read) setUnread(prev => Math.max(0, prev - 1));
    setNotifications(prev => prev.filter(x => x.id !== n.id));
    try { await fetch(`/api/notifications/${n.id}`, { method: "DELETE" }); } catch {} finally { setBusyIds(prev => { const s = new Set(prev); s.delete(n.id); return s; }); }
  }

  function handleClickNotif(n: Notification) {
    markAsRead(n);
    onClose();
    if (n.link) router.push(n.link);
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/20 animate-fade-in" onClick={onClose} />
      <div className="fixed top-0 right-0 z-[70] h-full w-[380px] max-w-full animate-drawer-right flex flex-col" style={{background:'var(--color-surface)', boxShadow:'-4px 0 24px rgba(0,0,0,0.10)'}}>
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{borderBottom:'1px solid var(--color-border)'}}>
          <h2 className="text-base font-semibold" style={{color:'var(--color-ink)', fontFamily:'var(--font-display)'}}>Notifications</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors" style={{color:'var(--color-muted)'}}>
            <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-1 px-4 py-3 shrink-0" style={{borderBottom:'1px solid var(--color-border)'}}>
          {([{key:"new",label:"Nouveau"},{key:"unread",label:"Non lu"},{key:"read",label:"Lu"}] as const).map(tab => (
            <button key={tab.key} onClick={() => setNotifTab(tab.key)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style={{ background: notifTab === tab.key ? 'var(--color-brand-subtle)' : 'transparent', color: notifTab === tab.key ? 'var(--color-brand)' : 'var(--color-muted)', fontWeight: notifTab === tab.key ? 600 : 500 }}>
              {tab.label}
              {tab.key === "unread" && unread > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{background:'var(--color-brand)', color:'white'}}>{unread}</span>}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]">
          {notifFiltered.length === 0 && <div className="flex items-center justify-center py-12 text-sm" style={{color:'var(--color-muted)'}}>Aucune notification</div>}
          {notifFiltered.map(n => {
            const Icon = NOTIF_ICONS[n.type] || faBell;
            const isBusy = busyIds.has(n.id);
            return (
              <div key={n.id} onClick={() => !isBusy && handleClickNotif(n)} className="notif-item" style={!n.read ? {background:'var(--color-brand-subtle)'} : {}}>
                <div className="notif-icon" style={{background: !n.read ? 'rgba(27,58,107,0.10)' : 'var(--color-surface-raised)'}}>
                  {isBusy ? <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" style={{color:'var(--color-muted)'}} /> : <FontAwesomeIcon icon={Icon} className="w-4 h-4" style={{color: !n.read ? 'var(--color-brand)' : 'var(--color-muted)'}} />}
                </div>
                <div className="notif-body">
                  <p className="notif-message">{n.message}</p>
                  <p className="notif-time">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && <div className="notif-unread-dot" />}
                <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteNotif(n); }} className="shrink-0 ml-1 transition-colors" style={{color:'var(--color-muted)'}} title="Supprimer">
                  <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
        {unread > 0 && (
          <div className="shrink-0 px-4 py-3" style={{borderTop:'1px solid var(--color-border)'}}>
            <button onClick={handleReadAll} disabled={markingAll} className="w-full py-2 rounded-lg text-xs font-semibold transition-all" style={{background:'var(--color-brand-subtle)', color:'var(--color-brand)'}}>
              {markingAll ? 'Mise à jour...' : 'Tout marquer comme lu'}
            </button>
          </div>
        )}
      </div>

      {confirmDeleteNotif !== null && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/25 animate-fade-in" onClick={() => setConfirmDeleteNotif(null)}>
          <div className="bg-[var(--color-surface)] rounded-2xl p-6 w-full max-w-sm shadow-xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-2" style={{color:'var(--color-ink)'}}>Supprimer cette notification ?</h3>
            <p className="text-sm mb-5" style={{color:'var(--color-muted)'}}>Cette notification sera définitivement supprimée.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDeleteNotif(null)} className="btn-ghost">Annuler</button>
              <button onClick={() => handleDeleteNotif(confirmDeleteNotif)} className="btn-danger text-sm">Oui, supprimer</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .notif-item { display:flex; align-items:flex-start; gap:12px; padding:14px 16px; cursor:pointer; border-bottom:1px solid var(--color-border); transition:background 0.12s; }
        .notif-item:hover { background:var(--color-surface-raised); }
        .notif-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .notif-body { flex:1; min-width:0; }
        .notif-message { font-size:13px; font-weight:500; line-height:1.4; color:var(--color-ink); }
        .notif-time { font-size:11.5px; color:var(--color-muted); margin-top:3px; }
        .notif-unread-dot { width:7px; height:7px; border-radius:50%; background:var(--color-brand); flex-shrink:0; margin-top:5px; }
      `}</style>
    </>
  );
}
