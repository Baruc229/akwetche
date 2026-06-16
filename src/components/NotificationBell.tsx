"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faCheck, faCrown, faBox, faCartShopping, faArrowTrendUp, faUserGear, faShield } from '@fortawesome/free-solid-svg-icons';
import Link from "next/link";

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
  admin: faShield,
  role: faUserGear,
  system: faBell,
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=10");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnread(data.unread);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleReadAll() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setNotifications(n => n.map(n => ({ ...n, read: true })));
    setUnread(0);
  }

  async function handleClickNotif(n: Notification) {
    if (!n.read) {
      await fetch(`/api/notifications/${n.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ read: true }) });
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      setUnread(prev => Math.max(0, prev - 1));
    }
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
        className="relative p-1.5 text-muted hover:text-ink hover:bg-sand rounded-lg transition-all"
        aria-label="Notifications"
      >
        <FontAwesomeIcon icon={faBell} className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold w-4.5 h-4.5 flex items-center justify-center rounded-full min-w-[18px] min-h-[18px]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-border overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-sand/50">
            <span className="text-sm font-semibold text-ink">Notifications</span>
            {unread > 0 && (
              <button onClick={handleReadAll} className="text-xs text-forest hover:text-forest-light font-medium transition-colors">
                Tout marquer lu
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
              return (
                <div key={n.id}>
                  {n.link ? (
                    <Link
                      href={n.link}
                      onClick={() => handleClickNotif(n)}
                      className={`flex items-start gap-3 px-4 py-3 text-sm transition-colors hover:bg-sand/50 ${!n.read ? "bg-forest/5" : ""}`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${!n.read ? "bg-forest/10 text-forest" : "bg-sand text-muted"}`}>
                        <FontAwesomeIcon icon={Icon} className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-ink ${!n.read ? "font-medium" : ""}`}>{n.message}</p>
                        <p className="text-xs text-muted mt-0.5">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-forest shrink-0 mt-1.5" />}
                    </Link>
                  ) : (
                    <div
                      onClick={() => handleClickNotif(n)}
                      className={`flex items-start gap-3 px-4 py-3 text-sm transition-colors cursor-pointer hover:bg-sand/50 ${!n.read ? "bg-forest/5" : ""}`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${!n.read ? "bg-forest/10 text-forest" : "bg-sand text-muted"}`}>
                        <FontAwesomeIcon icon={Icon} className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-ink ${!n.read ? "font-medium" : ""}`}>{n.message}</p>
                        <p className="text-xs text-muted mt-0.5">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-forest shrink-0 mt-1.5" />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
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
