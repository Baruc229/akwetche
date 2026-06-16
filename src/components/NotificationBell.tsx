"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faCheck, faCrown, faBox, faCartShopping, faArrowTrendUp, faUserGear, faShield, faArrowsUpDown, faSpinner } from '@fortawesome/free-solid-svg-icons';
import Link from "next/link";
import { useRouter } from "next/navigation";

type Notification = {
  id: number;
  type: string;
  message: string;
  link: string;
  read: boolean;
  createdAt: string;
  actor: { id: number; name: string } | null;
};

const iconMap: Record<string, any> = {
  subscription: faCrown,
  product: faBox,
  sale: faCartShopping,
  stock: faArrowTrendUp,
  transaction: faArrowsUpDown,
  admin: faShield,
  role: faUserGear,
  system: faBell,
};

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const [markingAll, setMarkingAll] = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=10");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnread(data.unread);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const insideButton = ref.current?.contains(target);
      const insidePortal = portalRef.current?.contains(target);
      if (!insideButton && !insidePortal) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function openDropdown() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const gap = 6;
      const dropdownWidth = 320;
      const margin = 8;

      let top = rect.bottom + gap;
      let right = window.innerWidth - rect.right;

      if (right + dropdownWidth > window.innerWidth - margin) {
        right = Math.max(margin, window.innerWidth - rect.left - dropdownWidth);
      }
      if (top + 400 > window.innerHeight) {
        top = Math.max(margin, rect.top - 400);
      }

      setCoords({ top, right });
    }
    setLoading(true);
    fetchNotifications().finally(() => setLoading(false));
    setOpen(true);
  }

  async function handleReadAll() {
    setMarkingAll(true);
    const prevUnread = unread;
    const prevNotifs = [...notifications];
    try {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      if (!res.ok) throw new Error("Échec");
      setNotifications(n => n.map(n => ({ ...n, read: true })));
      setUnread(0);
    } catch {
      setUnread(prevUnread);
      setNotifications(prevNotifs);
    } finally {
      setMarkingAll(false);
    }
  }

  async function markAsRead(n: Notification) {
    if (n.read) return;
    setBusyIds(prev => new Set(prev).add(n.id));
    const prev = { notifications: [...notifications], unread };
    try {
      const res = await fetch(`/api/notifications/${n.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      if (!res.ok) throw new Error("Échec");
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      setUnread(prev => Math.max(0, prev - 1));
    } catch {
      setNotifications(prev.notifications);
      setUnread(prev.unread);
    } finally {
      setBusyIds(prev => { const s = new Set(prev); s.delete(n.id); return s; });
    }
  }

  async function handleClickNotif(n: Notification) {
    await markAsRead(n);
    setOpen(false);
    if (n.link) {
      router.push(n.link);
    }
  }

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        ref={btnRef}
        onClick={() => { if (open) { setOpen(false); } else { openDropdown(); } }}
        className="relative p-1.5 text-muted hover:text-ink hover:bg-sand rounded-lg transition-all"
        aria-label="Notifications"
      >
        <FontAwesomeIcon icon={faBell} className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full min-w-[18px] min-h-[18px] leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={portalRef}
          className="fixed z-[9999] w-80 min-w-[320px] bg-white rounded-xl shadow-lg border border-border overflow-hidden"
          style={{ top: coords.top, right: coords.right }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-sand/50">
            <span className="text-sm font-semibold text-ink">Notifications</span>
            {unread > 0 && (
              <button
                onClick={handleReadAll}
                disabled={markingAll}
                className="text-xs text-forest hover:text-forest-light font-medium transition-colors disabled:opacity-50"
              >
                {markingAll ? (
                  <span className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faSpinner} className="w-3 h-3 animate-spin" />
                    Mise à jour...
                  </span>
                ) : "Tout marquer lu"}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && notifications.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-forest border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <p className="text-sm text-muted text-center py-8">Aucune notification</p>
            )}

            {notifications.map((n) => {
              const Icon = iconMap[n.type] || faBell;
              const isBusy = busyIds.has(n.id);
              return (
                <div key={n.id}>
                  <div
                    onClick={() => !isBusy && handleClickNotif(n)}
                    className={`flex items-start gap-3 px-4 py-3 text-sm transition-colors cursor-pointer hover:bg-sand/50 ${!n.read ? "bg-forest/5" : ""} ${isBusy ? "opacity-50" : ""}`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${!n.read ? "bg-forest/10 text-forest" : "bg-sand text-muted"}`}>
                      {isBusy ? (
                        <FontAwesomeIcon icon={faSpinner} className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FontAwesomeIcon icon={Icon} className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-ink ${!n.read ? "font-medium" : ""}`}>{n.message}</p>
                      <p className="text-xs text-muted mt-0.5">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-forest shrink-0 mt-1.5" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

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
