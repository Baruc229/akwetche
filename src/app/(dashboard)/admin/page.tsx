"use client";

import { useState, useEffect } from "react";
import { useDashboard } from "../layout";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUsers, faFileLines, faBagShopping, faDollarSign, faTrash, faShield, faRightToBracket, faTriangleExclamation, faCircleCheck, faCircleXmark, faPlus, faXmark, faCrown, faEye, faCalendarDays, faDownload, faArrowRight, faLock } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency, formatDate, getCountryByCode, getCountryName } from "@/lib/utils";
import CustomSelect from "@/components/ui/CustomSelect";
import FlagImg from "@/components/ui/FlagImg";

type AdminSubHistory = {
  id: number;
  status: string;
  provider: string;
  method: string;
  amount: number;
  currency: string;
  startDate: string;
  endDate: string;
  createdAt: string;
};

type UserData = {
  id: number;
  name: string;
  email: string;
  role: string;
  plan: string;
  status: string;
  initialBalance: number;
  currency: string;
  baseCurrency?: string;
  countryCode?: string | null;
  phone?: string | null;
  createdAt: string;
  emailVerified: string | null;
  loginAttempts: number;
  lockedUntil: string | null;
  _count: { transactions: number; products: number; sales: number; loginLogs: number };
  subscription: { status: string; amount: number; currency: string; endDate: string } | null;
  subscriptionHistory?: AdminSubHistory[];
};

type LoginLog = {
  id: number;
  ip: string;
  userAgent: string;
  success: boolean;
  reason: string;
  createdAt: string;
  user: { name: string; email: string } | null;
};

type Stats = {
  totalUsers: number;
  totalTransactions: number;
  totalSales: number;
  totalProducts: number;
  totalRevenue: number;
  activeSubscriptions: number;
  usersToday: number;
  loginAttemptsToday: number;
  failedLoginsToday: number;
  recentLogs: LoginLog[];
  usersByCountry?: { countryCode: string | null; _count: number }[];
  usersByCurrency?: { baseCurrency: string; _count: number }[];
  revenueByCurrency?: { XOF: number; EUR: number };
  subscriptionRevenue?: number;
};

const AVATAR_COLORS: Record<string, { bg: string; text: string }> = {
  super_admin: { bg: "bg-brand", text: "text-gold" },
  admin: { bg: "bg-gold-light", text: "text-gold" },
  user: { bg: "bg-pos-bg", text: "text-pos" },
};

function getAvatarStyle(role: string) {
  return AVATAR_COLORS[role] || AVATAR_COLORS.user;
}

function ConfirmSheet({ open, title, message, confirmLabel, onConfirm, onCancel }: {
  open: boolean; title: string; message: string; confirmLabel: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40 animate-fade-in" />
      <div className="relative bg-surface rounded-t-[20px] w-full max-w-lg shadow-xl animate-slide-up max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 pb-2">
          <h3 className="font-display font-bold text-base text-neg">{title}</h3>
          <p className="text-[13px] text-muted mt-1.5 leading-relaxed">{message}</p>
        </div>
        <div className="p-5 pt-3 space-y-2">
          <button onClick={onConfirm} className="btn-danger w-full justify-center text-sm py-3 rounded-xl">
            {confirmLabel}
          </button>
          <button onClick={onCancel} className="w-full bg-bg text-muted font-medium text-sm py-3 rounded-xl border border-border hover:bg-border/30 transition-colors">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useDashboard();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<number | null>(null);
  const [confirmClearLogs, setConfirmClearLogs] = useState(false);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", password: "", plan: "free", role: "admin" });
  const [addAdminError, setAddAdminError] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [allLogs, setAllLogs] = useState<LoginLog[]>([]);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);

  useEffect(() => {
    document.title = "Administration — Akwetche";
  }, []);

  useEffect(() => {
    if (user && user.role === "user") router.push("/dashboard");
  }, [user, router]);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/users").then(r => r.ok ? r.json() : { users: [] }),
      fetch("/api/admin/stats").then(r => r.ok ? r.json() : null),
    ]).then(([usersData, statsData]) => {
      setUsers(usersData.users || []);
      setStats(statsData);
    }).finally(() => setLoading(false));
  }, []);

  async function loadAllLogs() {
    setLogsLoading(true);
    try {
      const res = await fetch("/api/admin/login-logs");
      const data = await res.json();
      setAllLogs(data.logs || []);
      setShowAllLogs(true);
    } catch {}
    finally { setLogsLoading(false); }
  }

  async function clearLogs() {
    setConfirmClearLogs(false);
    setClearingLogs(true);
    try {
      await fetch("/api/admin/login-logs", { method: "DELETE" });
      setAllLogs([]);
      setStats(prev => prev ? { ...prev, recentLogs: [], loginAttemptsToday: 0, failedLoginsToday: 0 } : null);
    } catch {}
    finally { setClearingLogs(false); }
  }

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    setAddAdminError("");
    setAddingAdmin(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAdmin),
      });
      const data = await res.json();
      if (!res.ok) { setAddAdminError(data.error); return; }
      setShowAddAdmin(false);
      setNewAdmin({ name: "", email: "", password: "", plan: "free", role: "admin" });
      const [usersData] = await Promise.all([
        fetch("/api/admin/users").then(r => r.json()),
      ]);
      setUsers(usersData.users || []);
    } catch { setAddAdminError("Erreur"); }
    finally { setAddingAdmin(false); }
  }

  async function loadUserHistory(u: UserData) {
    try {
      const res = await fetch(`/api/admin/users?id=${u.id}`);
      const data = await res.json();
      if (data.user) {
        setSelectedUser({ ...u, subscriptionHistory: data.user.subscriptionHistory || [] });
      } else {
        setSelectedUser(u);
      }
    } catch {
      setSelectedUser(u);
    }
  }

  async function changeRole(id: number, role: string) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role }),
    });
    setUsers(users.map(u => u.id === id ? { ...u, role } : u));
    if (selectedUser?.id === id) setSelectedUser({ ...selectedUser, role });
  }

  async function deleteUser(id: number) {
    setConfirmDeleteUser(null);
    await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setUsers(users.filter(u => u.id !== id));
    if (selectedUser?.id === id) setSelectedUser(null);
  }

  function downloadUserReport() {
    const headers = ["Nom", "Email", "Rôle", "Plan", "Statut", "Transactions", "Produits", "Ventes", "Date d'inscription"];
    const rows = users.map((u) => [
      u.name, u.email, u.role,
      u.role !== "user" ? "Admin" : u.subscription?.status === "active" || u.plan === "premium" ? "Premium" : "Gratuit",
      u.lockedUntil && new Date(u.lockedUntil) > new Date() ? "Verrouillé" : u.emailVerified ? "Actif" : "En attente",
      u._count.transactions, u._count.products, u._count.sales,
      new Date(u.createdAt).toLocaleDateString("fr-FR"),
    ]);
    const headerRow = ["Nom", "Email", "Rôle", "Plan", "Statut", "Transactions", "Produits", "Ventes", "Date d'inscription"];
    const csv = [headerRow.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `utilisateurs_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function getPlanBadge(u: UserData) {
    if (u.role !== "user") {
      return <span className="badge badge-brand"><FontAwesomeIcon icon={faShield} className="w-2.5 h-2.5" />Admin</span>;
    }
    if (u.subscription?.status === "active") {
      return <span className="badge badge-pos"><FontAwesomeIcon icon={faCrown} className="w-2.5 h-2.5" />Premium</span>;
    }
    if (u.subscription?.status === "expired") {
      return <span className="badge badge-neg"><FontAwesomeIcon icon={faCrown} className="w-2.5 h-2.5" />Expiré</span>;
    }
    return <span className="badge badge-muted">Gratuit</span>;
  }

  function getStatusBadge(u: UserData) {
    if (u.lockedUntil && new Date(u.lockedUntil) > new Date()) {
      return <span className="badge badge-neg"><FontAwesomeIcon icon={faLock} className="w-2.5 h-2.5" />Verrouillé</span>;
    }
    if (!u.emailVerified) {
      return <span className="badge badge-warn"><FontAwesomeIcon icon={faCircleCheck} className="w-2.5 h-2.5" />Non vérifié</span>;
    }
    return <span className="badge badge-pos"><FontAwesomeIcon icon={faCircleCheck} className="w-2.5 h-2.5" />Actif</span>;
  }

  function getRoleBadge(u: UserData) {
    if (u.role === "super_admin") return <span className="badge" style={{ background: "var(--color-brand)", color: "white" }}>Super admin</span>;
    if (u.role === "admin") return <span className="badge badge-brand">Admin</span>;
    return null;
  }

  if (!user || user.role === "user") return null;

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2"><div className="h-7 w-32 bg-stone/30 rounded-lg" /><div className="h-4 w-44 bg-stone/20 rounded-lg" /></div>
          <div className="h-9 w-28 bg-stone/30 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="bg-bg-card rounded-2xl border border-border p-4 space-y-2"><div className="w-8 h-8 bg-stone/20 rounded-xl" /><div className="h-3 w-20 bg-stone/30 rounded-lg" /><div className="h-6 w-16 bg-stone/20 rounded-lg" /></div>)}
        </div>
        <div className="bg-bg-card rounded-[18px] border border-border p-5 space-y-3">
          <div className="h-4 w-40 bg-stone/30 rounded-lg" />
          <div className="h-12 w-full bg-stone/20 rounded-xl" />
          <div className="h-12 w-full bg-stone/20 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-text-1">Administration</h1>
          <p className="text-text-3 text-sm mt-0.5">Gestion de la plateforme</p>
        </div>
        {user?.role === "super_admin" && (
          <button
            onClick={() => setShowAddAdmin(true)}
            className="inline-flex items-center gap-2 bg-brand text-white font-sans font-bold text-[13px] px-4 py-[10px] rounded-xl hover:opacity-90 transition-opacity"
          >
            <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" />
            Admin
          </button>
        )}
      </div>

      {/* Failed logins alert */}
      {stats && stats.failedLoginsToday > 0 && (
        <div className="alert-inline neg">
          <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 shrink-0" />
          <span>{stats.failedLoginsToday} tentative(s) échouée(s) aujourd&apos;hui sur {stats.loginAttemptsToday} totales</span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Utilisateurs", value: stats?.totalUsers || 0, sub: stats?.usersToday ?? 0, icon: faUsers, bg: "bg-pos-bg", iconColor: "text-pos" },
          { label: "Transactions", value: stats?.totalTransactions || 0, sub: 0, icon: faFileLines, bg: "bg-gold-light", iconColor: "text-gold" },
          { label: "Produits", value: stats?.totalProducts || 0, sub: 0, icon: faBagShopping, bg: "bg-brand-subtle", iconColor: "text-brand" },
          { label: "Revenus", value: formatCurrency(stats?.totalRevenue || 0), sub: 0, icon: faDollarSign, bg: "bg-pos-bg", iconColor: "text-pos" },
          { label: "Abonnés", value: stats?.activeSubscriptions ?? 0, sub: 0, icon: faCrown, bg: "bg-gold-light", iconColor: "text-gold" },
          { label: "Tentatives", value: stats?.loginAttemptsToday ?? 0, sub: 0, icon: faRightToBracket, bg: "bg-neg-bg", iconColor: "text-neg" },
        ].map((s) => (
          <div key={s.label} className="card-inset">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <FontAwesomeIcon icon={s.icon} className={`w-[18px] h-[18px] ${s.iconColor}`} />
            </div>
            <p className="text-label mb-1">{s.label}</p>
            <p className="text-amount text-2xl text-ink">{s.value}</p>
            {(s.sub > 0 || s.label === "Utilisateurs") && (
              <p className={`text-[11px] font-medium mt-1 ${s.sub > 0 ? "text-pos" : "text-muted"}`}>
                {s.sub > 0 ? `+${s.sub}` : "0"} aujourd'hui
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Répartitions: Pays + Devise */}
      {(stats?.usersByCountry && stats.usersByCountry.length > 0) || (stats?.usersByCurrency && stats.usersByCurrency.length > 0) ? (
        <div className="bg-bg-card rounded-[18px] border border-border p-5">
          {stats?.usersByCountry && stats.usersByCountry.length > 0 && (
            <>
              <span className="text-[9px] font-bold uppercase tracking-widest text-text-3">Par pays</span>
              <div className="flex flex-wrap gap-2 mt-2 mb-5">
                {stats.usersByCountry.map((c) => (
                  <div key={c.countryCode || "unknown"} className="flex items-center gap-2 bg-bg border border-border rounded-xl px-3 py-2">
                    <span className="font-display font-bold text-lg text-text-1">{c._count}</span>
                    <span className="flex items-center gap-1 text-sm text-text-3">
                      <FlagImg code={c.countryCode || ""} className="w-4 h-4 rounded-sm inline-block" />
                      {getCountryName(c.countryCode || "") || "Inconnu"}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
          {stats?.usersByCurrency && stats.usersByCurrency.length > 0 && (
            <>
              <span className="text-[9px] font-bold uppercase tracking-widest text-text-3">Par devise</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {stats.usersByCurrency.map((c) => {
                  const isXOF = c.baseCurrency === "XOF";
                  return (
                    <div key={c.baseCurrency} className={`flex items-center gap-2 rounded-xl px-3 py-2 ${isXOF ? "bg-gold-light" : "bg-pos-bg"}`}>
                      <span className="font-display font-bold text-lg text-ink">{c._count}</span>
                      <span className={`text-sm font-semibold ${isXOF ? "text-gold" : "text-pos"}`}>{c.baseCurrency}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ) : null}

      {/* Subscription revenue summary */}
      {stats && (stats.activeSubscriptions > 0 || (stats.subscriptionRevenue ?? 0) > 0) && (
        <div className="bg-bg-card rounded-[18px] border border-border p-5">
          <span className="text-[9px] font-bold uppercase tracking-widest text-text-3">Abonnements payants</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
            <div className="bg-bg rounded-xl p-3">
              <p className="text-[11.5px] text-text-3">Actifs</p>
              <p className="font-display font-bold text-2xl text-pos mt-0.5">{stats.activeSubscriptions}</p>
            </div>
            {stats.subscriptionRevenue !== undefined && (
              <div className="bg-bg rounded-xl p-3">
                <p className="text-[11.5px] text-text-3">Revenu mensuel</p>
                <p className="font-display font-bold text-2xl text-pos mt-0.5">{formatCurrency(stats.subscriptionRevenue)}</p>
              </div>
            )}
            {stats.revenueByCurrency && (
              <div className="bg-bg rounded-xl p-3">
                <p className="text-[11.5px] text-text-3">Revenu total ventes</p>
                <p className="font-display font-bold text-2xl text-pos mt-0.5">{formatCurrency(stats.totalRevenue)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Users list */}
      <div className="bg-bg-card rounded-[18px] border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-text-1">Utilisateurs</h2>
          <button onClick={downloadUserReport} className="flex items-center gap-1.5 text-xs text-brand font-medium hover:opacity-80">
            <FontAwesomeIcon icon={faDownload} className="w-3 h-3" />
            Rapport
          </button>
        </div>
        <div className="divide-y divide-border">
          {users.map((u, i) => {
            const avatar = getAvatarStyle(u.role);
            const initial = (u.name || u.email).charAt(0).toUpperCase();
            return (
              <div key={u.id} className={`px-5 py-4 transition-colors ${i % 2 === 1 ? "bg-surface-raised" : ""} hover:bg-sand/50`}>
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-xl ${avatar.bg} flex items-center justify-center shrink-0`}>
                    <span className={`font-display font-extrabold text-sm ${avatar.text}`}>{initial}</span>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-sans font-bold text-[13.5px] text-text-1 truncate">{u.name}</span>
                      {getRoleBadge(u)}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {getPlanBadge(u)}
                      {getStatusBadge(u)}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-text-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                        {formatDate(u.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                        {u._count.transactions} tx
                      </span>
                      <span className="flex items-center gap-1">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                        {u._count.loginLogs} logs
                      </span>
                      {u.countryCode && (
                        <span className="flex items-center gap-1">
                          <FlagImg code={u.countryCode} className="w-3.5 h-3.5 rounded-sm" />
                          {getCountryByCode(u.countryCode)?.name?.slice(0, 12) || u.countryCode}
                        </span>
                      )}
                      <span className="font-medium">{u.baseCurrency || u.currency || "XOF"}</span>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    {user?.role === "super_admin" && u.id !== user.id && (
                      <>
                        <select
                          value={u.role}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => changeRole(u.id, e.target.value)}
                          className="text-[10px] border border-border rounded-lg px-1.5 py-1 bg-white text-ink focus:outline-none focus:border-brand"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super admin</option>
                        </select>
                        {u.role !== "super_admin" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteUser(u.id); }}
                            className="w-8 h-8 flex items-center justify-center rounded-xl border border-neg-border text-neg hover:bg-neg-bg transition-colors"
                            title="Supprimer"
                          >
                            <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => loadUserHistory(u)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl border border-border text-text-3 hover:bg-sand transition-colors"
                      title="Voir"
                    >
                      <FontAwesomeIcon icon={faEye} className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Login history */}
      <div className="bg-bg-card rounded-[18px] border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-text-1">Historique connexions</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setConfirmClearLogs(true)}
              disabled={clearingLogs}
              className="text-xs text-neg font-medium hover:opacity-80 disabled:opacity-50"
            >
              {clearingLogs ? "..." : "Vider"}
            </button>
            <button
              onClick={() => showAllLogs ? setShowAllLogs(false) : loadAllLogs()}
              className="text-xs text-brand font-medium hover:opacity-80"
            >
              {showAllLogs ? "Masquer" : logsLoading ? "..." : <>
                Voir tout
                <FontAwesomeIcon icon={faArrowRight} className="w-2.5 h-2.5 ml-1" />
              </>}
            </button>
          </div>
        </div>
        <div className="divide-y divide-border max-h-96 overflow-y-auto">
          {(stats?.recentLogs || []).map((log) => (
            <div key={log.id} className="flex items-center gap-3 px-5 py-3 hover:bg-sand/50 transition-colors text-xs">
              <FontAwesomeIcon icon={log.success ? faCircleCheck : faCircleXmark} className={`w-3.5 h-3.5 shrink-0 ${log.success ? "text-pos" : "text-neg"}`} />
              <span className="text-text-1 font-medium truncate flex-1 min-w-0">
                {log.user?.email || (log.reason.startsWith("user_not_found:") ? log.reason.slice("user_not_found:".length) : "Inconnu")}
              </span>
              <span className="text-text-3 shrink-0 hidden sm:inline">{new Date(log.createdAt).toLocaleString("fr-FR")}</span>
              <span className={`badge shrink-0 ${log.success ? "badge-pos" : "badge-neg"}`}>
                {log.success ? "Succès" : "Échec"}
              </span>
            </div>
          ))}
          {showAllLogs && allLogs.slice((stats?.recentLogs || []).length).map((log) => (
            <div key={log.id} className="flex items-center gap-3 px-5 py-3 hover:bg-sand/50 transition-colors text-xs">
              <FontAwesomeIcon icon={log.success ? faCircleCheck : faCircleXmark} className={`w-3.5 h-3.5 shrink-0 ${log.success ? "text-pos" : "text-neg"}`} />
              <span className="text-text-1 font-medium truncate flex-1 min-w-0">
                {log.user?.email || (log.reason.startsWith("user_not_found:") ? log.reason.slice("user_not_found:".length) : "Inconnu")}
              </span>
              <span className="text-text-3 shrink-0 hidden sm:inline">{new Date(log.createdAt).toLocaleString("fr-FR")}</span>
              <span className={`badge shrink-0 ${log.success ? "badge-pos" : "badge-neg"}`}>
                {log.success ? "Succès" : "Échec"}
              </span>
            </div>
          ))}
          {(!stats?.recentLogs || stats.recentLogs.length === 0) && !showAllLogs && (
            <p className="p-5 text-sm text-text-3 text-center">Aucune tentative de connexion</p>
          )}
          {showAllLogs && allLogs.length === 0 && (
            <p className="p-5 text-sm text-text-3 text-center">Aucune tentative de connexion</p>
          )}
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setSelectedUser(null)}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in" />
          <div className="relative bg-white rounded-t-[20px] sm:rounded-2xl w-full sm:max-w-lg shadow-xl animate-slide-up sm:animate-scale-in max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-5 py-4 border-b border-border rounded-t-[20px] sm:rounded-t-2xl">
              <h3 className="font-display font-semibold text-base text-text-1">Détails utilisateur</h3>
              <button onClick={() => setSelectedUser(null)} className="w-8 h-8 flex items-center justify-center text-text-3 hover:text-text-1 rounded-lg hover:bg-sand transition-colors">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${getAvatarStyle(selectedUser.role).bg}`}>
                  <span className={`font-display font-extrabold text-xl ${getAvatarStyle(selectedUser.role).text}`}>
                    {(selectedUser.name || selectedUser.email).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-lg text-text-1">{selectedUser.name}</p>
                  <p className="text-sm text-text-3">{selectedUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg rounded-xl p-3">
                  <p className="text-xs text-text-3">Rôle</p>
                  <p className="text-sm font-semibold text-text-1 capitalize">{selectedUser.role === "super_admin" ? "Super administrateur" : selectedUser.role === "admin" ? "Administrateur" : "Utilisateur"}</p>
                </div>
                <div className="bg-bg rounded-xl p-3">
                  <p className="text-xs text-text-3">Plan</p>
                  <p className="text-sm font-semibold text-text-1">
                    {selectedUser.role !== "user" ? "Admin (accès total)" : selectedUser.subscription?.status === "active" || selectedUser.plan === "premium" ? "Premium" : "Gratuit"}
                  </p>
                </div>
                <div className="bg-bg rounded-xl p-3">
                  <p className="text-xs text-text-3">Inscription</p>
                  <p className="text-sm font-semibold text-text-1">{new Date(selectedUser.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
                <div className="bg-bg rounded-xl p-3">
                  <p className="text-xs text-text-3">Statut</p>
                  <p className="text-sm font-semibold text-text-1">
                    {selectedUser.lockedUntil && new Date(selectedUser.lockedUntil) > new Date() ? "Verrouillé" : selectedUser.emailVerified ? "Actif" : "En attente"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-bg rounded-xl p-3 text-center">
                  <p className="font-display font-bold text-lg text-pos">{selectedUser._count.transactions}</p>
                  <p className="text-xs text-text-3">Transactions</p>
                </div>
                <div className="bg-bg rounded-xl p-3 text-center">
                  <p className="font-display font-bold text-lg text-gold">{selectedUser._count.products}</p>
                  <p className="text-xs text-text-3">Produits</p>
                </div>
                <div className="bg-bg rounded-xl p-3 text-center">
                  <p className="font-display font-bold text-lg text-brand">{selectedUser._count.sales}</p>
                  <p className="text-xs text-text-3">Ventes</p>
                </div>
              </div>

              {selectedUser.subscription && (
                <>
                  <div className={`rounded-xl p-3 ${selectedUser.subscription.status === "active" ? "bg-pos-bg" : "bg-neg-bg"}`}>
                    <div className="flex items-center justify-between text-sm">
                      <span className={selectedUser.subscription.status === "active" ? "text-pos" : "text-neg"}>Abonnement</span>
                      <span className={`font-semibold ${selectedUser.subscription.status === "active" ? "text-pos" : "text-neg"}`}>
                        {selectedUser.subscription.amount} {selectedUser.subscription.currency}/mois
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        selectedUser.subscription.status === "active" ? "text-pos bg-pos-bg" : "text-neg bg-neg-bg"
                      }`}>
                        {selectedUser.subscription.status === "active" ? "Actif" : selectedUser.subscription.status === "expired" ? "Expiré" : "Annulé"}
                      </span>
                      <span className="text-xs text-text-3">
                        Expire le {new Date(selectedUser.subscription.endDate).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    {selectedUser.subscriptionHistory && selectedUser.subscriptionHistory.length > 0 && (
                      <p className="text-[10px] text-text-3 mt-2">{selectedUser.subscriptionHistory.length} abonnement(s) précédent(s)</p>
                    )}
                  </div>
                  {selectedUser.subscriptionHistory && selectedUser.subscriptionHistory.length > 0 && (
                    <div className="bg-bg rounded-xl p-3">
                      <p className="text-xs font-semibold text-text-1 mb-2">Historique des abonnements</p>
                      <div className="space-y-2">
                        {selectedUser.subscriptionHistory.map((h) => (
                          <div key={h.id} className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${h.status === "active" ? "bg-pos" : "bg-muted"}`} />
                              <span className="text-text-3 capitalize">{h.status}</span>
                              <span className="text-text-3">—</span>
                              <span className="text-text-3">{h.amount} {h.currency}</span>
                            </div>
                            <span className="text-text-3">
                              {new Date(h.startDate).toLocaleDateString("fr-FR")} → {new Date(h.endDate).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="text-xs text-text-3 space-y-1">
                <p>Solde de départ : {formatCurrency(selectedUser.initialBalance)}</p>
                <p>Devise de base : {selectedUser.baseCurrency || selectedUser.currency || "XOF"}</p>
                {selectedUser.countryCode && <p className="flex items-center gap-1"><FlagImg code={selectedUser.countryCode} className="w-4 h-4 rounded-sm" /> Pays : {getCountryName(selectedUser.countryCode)}</p>}
                {selectedUser.phone && <p>Téléphone : {selectedUser.phone}</p>}
                {selectedUser.loginAttempts > 0 && <p>Tentatives échouées : {selectedUser.loginAttempts}</p>}
                {selectedUser.lockedUntil && new Date(selectedUser.lockedUntil) > new Date() && (
                  <p className="text-neg">Compte verrouillé jusqu&apos;au {new Date(selectedUser.lockedUntil).toLocaleString("fr-FR")}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Admin Modal */}
      {showAddAdmin && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowAddAdmin(false)}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in" />
          <div className="relative bg-white rounded-t-[20px] sm:rounded-2xl w-full sm:max-w-md shadow-xl animate-slide-up sm:animate-scale-in max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-5 py-4 border-b border-border rounded-t-[20px] sm:rounded-t-2xl">
              <h3 className="font-display font-semibold text-base text-text-1">Ajouter un administrateur</h3>
              <button onClick={() => setShowAddAdmin(false)} className="w-8 h-8 flex items-center justify-center text-text-3 hover:text-text-1 rounded-lg hover:bg-sand transition-colors">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div>
                  <label className="block text-[11.5px] font-sans font-medium text-text-3 mb-1.5">Nom</label>
                  <input type="text" value={newAdmin.name} onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="block text-[11.5px] font-sans font-medium text-text-3 mb-1.5">Email</label>
                  <input type="email" value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="block text-[11.5px] font-sans font-medium text-text-3 mb-1.5">Mot de passe</label>
                  <input type="password" value={newAdmin.password} onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })} className="input-field" required minLength={6} />
                </div>
                <div>
                  <label className="block text-[11.5px] font-sans font-medium text-text-3 mb-1.5">Rôle</label>
                  <CustomSelect
                    options={[{ value: "admin", label: "Admin" }, { value: "super_admin", label: "Super admin" }]}
                    value={newAdmin.role}
                    onChange={(v) => setNewAdmin({ ...newAdmin, role: v })}
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-sans font-medium text-text-3 mb-1.5">Plan</label>
                  <CustomSelect
                    options={[{ value: "free", label: "Gratuit" }, { value: "premium", label: "Premium" }]}
                    value={newAdmin.plan}
                    onChange={(v) => setNewAdmin({ ...newAdmin, plan: v })}
                  />
                </div>
                {addAdminError && <p className="text-neg text-sm bg-neg-bg p-3 rounded-xl">{addAdminError}</p>}
                <button type="submit" disabled={addingAdmin} className="w-full bg-brand text-white font-sans font-semibold text-sm py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
                  {addingAdmin ? "Création..." : "Créer l'administrateur"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete user */}
      <ConfirmSheet
        open={confirmDeleteUser !== null}
        title="Supprimer cet utilisateur ?"
        message="Toutes les données de cet utilisateur (transactions, produits, ventes, abonnements) seront définitivement supprimées. Cette action est irréversible."
        confirmLabel="Oui, supprimer"
        onConfirm={() => deleteUser(confirmDeleteUser!)}
        onCancel={() => setConfirmDeleteUser(null)}
      />

      {/* Confirm clear logs */}
      <ConfirmSheet
        open={confirmClearLogs}
        title="Vider l'historique ?"
        message="Toutes les tentatives de connexion seront définitivement supprimées."
        confirmLabel="Oui, vider"
        onConfirm={clearLogs}
        onCancel={() => setConfirmClearLogs(false)}
      />
    </div>
  );
}
