"use client";

import { useState, useEffect, useMemo } from "react";
import { useDashboard } from "../../layout";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash, faShield, faCrown, faCircleCheck, faLock, faEye, faDownload, faXmark, faSearch, faArrowUp, faArrowDown, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency, formatDate, getCountryByCode, getCountryName } from "@/lib/utils";
import FlagImg from "@/components/ui/FlagImg";
import CustomSelect from "@/components/ui/CustomSelect";
import ConfirmModal from "@/components/ConfirmModal";
import type { UserData } from "@/types/admin";

const AVATAR_COLORS: Record<string, { bg: string; text: string }> = {
  super_admin: { bg: "bg-brand", text: "text-gold" },
  admin: { bg: "bg-gold-light", text: "text-gold" },
  user: { bg: "bg-pos-bg", text: "text-pos" },
};

function getAvatarStyle(role: string) {
  return AVATAR_COLORS[role] || AVATAR_COLORS.user;
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

const PAGE_SIZE = 20;

export default function AdminUsers() {
  const { user } = useDashboard();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCurrency, setFilterCurrency] = useState("all");
  const [filterCountry, setFilterCountry] = useState("all");
  const [sortKey, setSortKey] = useState<string>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);

  useEffect(() => {
    document.title = "Utilisateurs — Administration — Akwetche";
  }, []);

  useEffect(() => {
    if (user && user.role === "user") router.push("/dashboard");
  }, [user, router]);

  useEffect(() => {
    fetch("/api/admin/users")
      .then(r => r.ok ? r.json() : { users: [] })
      .then(data => setUsers(data.users || []))
      .finally(() => setLoading(false));
  }, []);

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

  function downloadUserReport() {
    const headers = ["Nom", "Email", "Rôle", "Plan", "Statut", "Transactions", "Produits", "Ventes", "Date d'inscription"];
    const rows = filtered.map((u) => [
      u.name, u.email, u.role,
      u.role !== "user" ? "Admin" : u.subscription?.status === "active" || u.plan === "premium" ? "Premium" : "Gratuit",
      u.lockedUntil && new Date(u.lockedUntil) > new Date() ? "Verrouillé" : u.emailVerified ? "Actif" : "En attente",
      u._count.transactions, u._count.products, u._count.sales,
      new Date(u.createdAt).toLocaleDateString("fr-FR"),
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `utilisateurs_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortIcon({ k }: { k: string }) {
    if (sortKey !== k) return null;
    return <FontAwesomeIcon icon={sortDir === "asc" ? faArrowUp : faArrowDown} className="w-2.5 h-2.5 ml-1" />;
  }

  const currencies = useMemo(() => {
    const s = new Set(users.map(u => u.baseCurrency || u.currency || "XOF").filter(Boolean));
    return Array.from(s).sort();
  }, [users]);

  const countries = useMemo(() => {
    const s = new Set(users.map(u => u.countryCode).filter(Boolean) as string[]);
    return Array.from(s).sort();
  }, [users]);

  const filtered = useMemo(() => {
    let result = [...users];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }

    if (filterPlan !== "all") {
      result = result.filter(u => getPlanValue(u) === filterPlan);
    }

    if (filterStatus !== "all") {
      result = result.filter(u => getStatusValue(u) === filterStatus);
    }

    if (filterCurrency !== "all") {
      result = result.filter(u => (u.baseCurrency || u.currency || "XOF") === filterCurrency);
    }

    if (filterCountry !== "all") {
      result = result.filter(u => u.countryCode === filterCountry);
    }

    result.sort((a, b) => {
      let va: any, vb: any;
      switch (sortKey) {
        case "createdAt": va = a.createdAt; vb = b.createdAt; break;
        case "transactions": va = a._count.transactions; vb = b._count.transactions; break;
        case "name": va = a.name.toLowerCase(); vb = b.name.toLowerCase(); break;
        default: va = a.createdAt; vb = b.createdAt;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [users, search, filterPlan, filterStatus, filterCurrency, filterCountry, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function getPlanValue(u: UserData): string {
    if (u.role !== "user") return "admin";
    if (u.subscription?.status === "active") return "premium";
    if (u.subscription?.status === "expired") return "expired";
    return "free";
  }

  function getStatusValue(u: UserData): string {
    if (u.lockedUntil && new Date(u.lockedUntil) > new Date()) return "locked";
    if (!u.emailVerified) return "unverified";
    return "active";
  }

  if (!user || user.role === "user") return null;

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-7 w-40 bg-stone/30 rounded-lg" />
        <div className="h-10 w-full bg-stone/20 rounded-xl" />
        <div className="bg-bg-card rounded-[18px] border border-border p-5 space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-14 w-full bg-stone/20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-text-1">Utilisateurs</h1>
          <p className="text-text-3 text-sm mt-0.5">{users.length} inscrits</p>
        </div>
        <button onClick={downloadUserReport} className="flex items-center gap-1.5 text-xs text-brand font-medium hover:opacity-80 px-3 py-2 rounded-xl border border-border">
          <FontAwesomeIcon icon={faDownload} className="w-3 h-3" />
          Rapport CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-bg-card rounded-[18px] border border-border p-4 space-y-3">
        <div className="relative">
          <FontAwesomeIcon icon={faSearch} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Rechercher par nom ou email..."
            className="input-field pl-10 text-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-[calc(50%-0.25rem)] sm:w-auto sm:min-w-[130px]">
            <CustomSelect
              options={[
                { value: "all", label: "Tous plans" },
                { value: "admin", label: "Admin" },
                { value: "premium", label: "Premium" },
                { value: "free", label: "Gratuit" },
                { value: "expired", label: "Expiré" },
              ]}
              value={filterPlan}
              onChange={(v) => { setFilterPlan(v); setPage(0); }}
            />
          </div>
          <div className="w-[calc(50%-0.25rem)] sm:w-auto sm:min-w-[130px]">
            <CustomSelect
              options={[
                { value: "all", label: "Tous statuts" },
                { value: "active", label: "Actif" },
                { value: "unverified", label: "Non vérifié" },
                { value: "locked", label: "Verrouillé" },
              ]}
              value={filterStatus}
              onChange={(v) => { setFilterStatus(v); setPage(0); }}
            />
          </div>
          <div className="w-[calc(50%-0.25rem)] sm:w-auto sm:min-w-[120px]">
            <CustomSelect
              options={[
                { value: "all", label: "Toutes devises" },
                ...currencies.map(c => ({ value: c, label: c })),
              ]}
              value={filterCurrency}
              onChange={(v) => { setFilterCurrency(v); setPage(0); }}
            />
          </div>
          <div className="w-[calc(50%-0.25rem)] sm:w-auto sm:min-w-[130px]">
            <CustomSelect
              options={[
                { value: "all", label: "Tous pays" },
                ...countries.map(c => ({ value: c, label: getCountryName(c) || c })),
              ]}
              value={filterCountry}
              onChange={(v) => { setFilterCountry(v); setPage(0); }}
            />
          </div>
        </div>
      </div>

      {/* Users list */}
      <div className="bg-bg-card rounded-[18px] border border-border overflow-hidden">
        <div className="divide-y divide-border">
          {paged.map((u, i) => {
            const avatar = getAvatarStyle(u.role);
            const initial = (u.name || u.email).charAt(0).toUpperCase();
            return (
              <div key={u.id} className={`px-5 py-4 transition-colors ${i % 2 === 1 ? "bg-surface-raised" : ""} hover:bg-sand/50`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${avatar.bg} flex items-center justify-center shrink-0`}>
                    <span className={`font-display font-extrabold text-sm ${avatar.text}`}>{initial}</span>
                  </div>
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
          {paged.length === 0 && (
            <p className="p-5 text-sm text-text-3 text-center">Aucun utilisateur trouvé</p>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-3">{filtered.length} résultat(s) — Page {page + 1}/{totalPages}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-border text-text-3 hover:bg-sand disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="w-3 h-3" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-border text-text-3 hover:bg-sand disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <FontAwesomeIcon icon={faChevronRight} className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  <p className="text-neg">Compte verrouillé jusqu'au {new Date(selectedUser.lockedUntil).toLocaleString("fr-FR")}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      <ConfirmModal
        open={confirmDeleteUser !== null}
        title="Supprimer cet utilisateur ?"
        message="Toutes les données de cet utilisateur (transactions, produits, ventes, abonnements) seront définitivement supprimées. Cette action est irréversible."
        confirmLabel="Oui, supprimer"
        onConfirm={() => deleteUser(confirmDeleteUser!)}
        onCancel={() => setConfirmDeleteUser(null)}
      />
    </div>
  );
}
