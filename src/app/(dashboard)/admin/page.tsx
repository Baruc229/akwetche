"use client";

import { useState, useEffect } from "react";
import { useDashboard } from "../layout";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUsers, faChartLine, faTrash, faShield, faDollarSign, faBagShopping, faFileLines, faCreditCard, faRightToBracket, faTriangleExclamation, faCircleCheck, faCircleXmark, faPlus, faXmark, faCrown, faStar, faEnvelope, faCalendarDays, faLock, faUnlock, faEye, faDownload } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency, formatDate } from "@/lib/utils";
import ConfirmModal from "@/components/ConfirmModal";
import CustomSelect from "@/components/ui/CustomSelect";

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
};

export default function AdminPage() {
 const { user } = useDashboard();
 const router = useRouter();
 const [users, setUsers] = useState<UserData[]>([]);
 const [stats, setStats] = useState<Stats | null>(null);
 const [loading, setLoading] = useState(true);
 const [confirmDeleteUser, setConfirmDeleteUser] = useState<number | null>(null);
 const [showAddAdmin, setShowAddAdmin] = useState(false);
 const [newAdmin, setNewAdmin] = useState({ name: "", email: "", password: "", plan: "free", role: "admin" });
 const [addAdminError, setAddAdminError] = useState("");
 const [addingAdmin, setAddingAdmin] = useState(false);
 const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
 const [allLogs, setAllLogs] = useState<LoginLog[]>([]);
 const [showAllLogs, setShowAllLogs] = useState(false);
 const [logsLoading, setLogsLoading] = useState(false);

 useEffect(() => {
 if (user && user.role === "user") router.push("/dashboard");
 }, [user, router]);

 useEffect(() => {
 Promise.all([
 fetch("/api/admin/users").then(r => r.json()),
 fetch("/api/admin/stats").then(r => r.json()),
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
 const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
 const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
 const link = document.createElement("a");
 link.href = URL.createObjectURL(blob);
 link.download = `utilisateurs_${new Date().toISOString().slice(0, 10)}.csv`;
 link.click();
 URL.revokeObjectURL(link.href);
 }

  function getPlanBadge(u: UserData) {
  if (u.role !== "user") {
  return <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-ochre-light text-forest px-1.5 py-0.5 rounded"><FontAwesomeIcon icon={faShield} className="w-2.5 h-2.5" />Admin</span>;
  }
  if (u.subscription?.status === "active") {
  return <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-ochre-light text-ochre px-1.5 py-0.5 rounded"><FontAwesomeIcon icon={faCrown} className="w-2.5 h-2.5" />Premium</span>;
  }
  if (u.subscription?.status === "expired") {
  return <span className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-red-100 text-red-600 px-1.5 py-0.5 rounded"><FontAwesomeIcon icon={faCrown} className="w-2.5 h-2.5" />Expiré</span>;
  }
  return <span className="inline-flex items-center text-[10px] font-medium bg-border text-muted px-1.5 py-0.5 rounded">Gratuit</span>;
  }

 function getStatusBadge(u: UserData) {
 if (u.lockedUntil && new Date(u.lockedUntil) > new Date()) {
 return <span className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-red-100 text-red-600 px-1.5 py-0.5 rounded"><FontAwesomeIcon icon={faLock} className="w-2.5 h-2.5" />Verrouillé</span>;
 }
 if (!u.emailVerified) {
 return <span className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-ochre-light text-ochre px-1.5 py-0.5 rounded"><FontAwesomeIcon icon={faEnvelope} className="w-2.5 h-2.5" />Non vérifié</span>;
 }
 return <span className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-ochre-light text-forest px-1.5 py-0.5 rounded"><FontAwesomeIcon icon={faCircleCheck} className="w-2.5 h-2.5" />Actif</span>;
 }

 function getRoleBadge(u: UserData) {
 if (u.role === "super_admin") return <span className="text-[10px] font-semibold bg-ochre-light text-ochre px-1.5 py-0.5 rounded">Super admin</span>;
 if (u.role === "admin") return <span className="text-[10px] font-semibold bg-ochre-light text-forest px-1.5 py-0.5 rounded">Admin</span>;
 return null;
 }

 if (!user || user.role === "user") return null;

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" />
 </div>
 );
 }

 return (
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div>
 <h1 className="text-2xl font-bold text-ink">Administration</h1>
 <p className="text-muted text-sm mt-0.5">Gestion de la plateforme</p>
 </div>
 {user?.role === "super_admin" && (
 <button
 onClick={() => setShowAddAdmin(true)}
 className="btn-primary flex items-center gap-2 text-sm py-2.5 self-start sm:self-auto"
 >
 <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
 Ajouter un admin
 </button>
 )}
 </div>

 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
  {[
          { label: "Utilisateurs", value: stats?.totalUsers || 0, icon: faUsers, color: "forest" },
          { label: "Nouveaux aujourd'hui", value: stats?.usersToday || 0, icon: faUsers, color: "forest-light" },
          { label: "Transactions", value: stats?.totalTransactions || 0, icon: faFileLines, color: "forest-light" },
          { label: "Ventes", value: stats?.totalSales || 0, icon: faBagShopping, color: "ochre" },
          { label: "Produits", value: stats?.totalProducts || 0, icon: faChartLine, color: "forest" },
          { label: "Revenus", value: formatCurrency(stats?.totalRevenue || 0), icon: faDollarSign, color: "forest" },
  { label: "Abonnements", value: stats?.activeSubscriptions || 0, icon: faCreditCard, color: "violet" },
  { label: "Tentatives login", value: stats?.loginAttemptsToday || 0, icon: faRightToBracket, color: "blue" },
 ].map((s) => (
 <div key={s.label} className="card p-4">
 <div className="w-8 h-8 rounded-lg bg-border flex items-center justify-center mb-2">
 <FontAwesomeIcon icon={s.icon} className="w-4 h-4 text-muted" />
 </div>
 <p className="text-xs text-muted">{s.label}</p>
 <p className="text-lg font-bold text-ink">{s.value}</p>
 </div>
 ))}
 </div>

 {stats && stats.failedLoginsToday > 0 && (
 <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
 <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 shrink-0" />
 <span>{stats.failedLoginsToday} tentative(s) échouée(s) aujourd'hui sur {stats.loginAttemptsToday} totales</span>
 </div>
 )}

 <div className="card overflow-hidden">
 <div className="p-4 border-b border-border">
 <div className="flex items-center justify-between">
 <h2 className="text-sm font-semibold text-ink">Historique des connexions</h2>
 <button
 onClick={() => showAllLogs ? setShowAllLogs(false) : loadAllLogs()}
 className="text-xs text-forest hover:text-forest font-medium"
 >
 {showAllLogs ? "Masquer" : logsLoading ? "Chargement..." : "Voir tout"}
 </button>
 </div>
 </div>
 <div className="divide-y divide-border max-h-96 overflow-y-auto">
 {(stats?.recentLogs || []).map((log) => (
 <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 hover:bg-sand text-xs gap-1">
 <div className="flex items-center gap-2 min-w-0">
 {log.success
 ? <FontAwesomeIcon icon={faCircleCheck} className="w-3.5 h-3.5 text-forest shrink-0" />
 : <FontAwesomeIcon icon={faCircleXmark} className="w-3.5 h-3.5 text-red-400 shrink-0" />
 }
 <span className="text-ink font-medium truncate">{log.user?.email || "Inconnu"}</span>
 <span className="text-muted truncate hidden sm:inline">{log.ip}</span>
 </div>
 <div className="flex items-center gap-2 sm:gap-3 text-muted shrink-0 ml-5 sm:ml-0">
 <span className="text-muted">{log.reason === "success" ? "Succès" : log.reason === "invalid_password" ? "Mot de passe incorrect" : log.reason === "account_locked" ? "Compte verrouillé" : log.reason === "user_not_found" ? "Utilisateur introuvable" : log.reason}</span>
 <span className="text-muted">{new Date(log.createdAt).toLocaleString("fr-FR")}</span>
 </div>
 </div>
 ))}
 {showAllLogs && allLogs.slice((stats?.recentLogs || []).length).map((log) => (
 <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 hover:bg-sand text-xs gap-1">
 <div className="flex items-center gap-2 min-w-0">
 {log.success
 ? <FontAwesomeIcon icon={faCircleCheck} className="w-3 h-3 text-forest shrink-0" />
 : <FontAwesomeIcon icon={faCircleXmark} className="w-3 h-3 text-red-400 shrink-0" />
 }
 <span className="text-ink font-medium truncate">{log.user?.email || "Inconnu"}</span>
 </div>
 <div className="flex items-center gap-2 sm:gap-3 text-muted shrink-0 ml-5 sm:ml-0 flex-wrap">
 <span className="text-muted">{log.reason === "success" ? "Succès" : log.reason === "invalid_password" ? "Mot de passe incorrect" : log.reason === "account_locked" ? "Compte verrouillé" : log.reason === "user_not_found" ? "Utilisateur introuvable" : log.reason}</span>
 {log.ip && <span className="text-muted hidden sm:inline">{log.ip}</span>}
 <span className="text-muted">{new Date(log.createdAt).toLocaleString("fr-FR")}</span>
 </div>
 </div>
 ))}
 {(!stats?.recentLogs || stats.recentLogs.length === 0) && !showAllLogs && (
 <p className="p-4 text-sm text-muted text-center">Aucune tentative de connexion</p>
 )}
 {showAllLogs && allLogs.length === 0 && (
 <p className="p-4 text-sm text-muted text-center">Aucune tentative de connexion</p>
 )}
 </div>
 {!showAllLogs && stats?.recentLogs && stats.recentLogs.length > 0 && (
 <div className="p-3 border-t border-border text-center">
 <button
 onClick={loadAllLogs}
 disabled={logsLoading}
 className="text-xs text-forest hover:text-forest font-medium disabled:opacity-50"
 >
 {logsLoading ? "Chargement..." : "Voir tout l'historique"}
 </button>
 </div>
 )}
 </div>

 <div className="card overflow-hidden">
 <div className="p-4 border-b border-border">
 <div className="flex items-center justify-between">
 <h2 className="text-sm font-semibold text-ink">Utilisateurs</h2>
 <button
 onClick={downloadUserReport}
 className="flex items-center gap-1.5 text-xs text-forest hover:text-forest font-medium"
 >
 <FontAwesomeIcon icon={faDownload} className="w-3.5 h-3.5" />
 Télécharger rapport
 </button>
 </div>
 </div>
 <div className="divide-y divide-border">
 {users.map((u) => (
          <div
          key={u.id}
          onClick={() => loadUserHistory(u)}
 className="p-4 hover:bg-sand transition-colors cursor-pointer"
 >
 <div className="flex items-start gap-3">
 <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${u.role === "super_admin" ? "bg-ochre-light" : u.role !== "user" ? "bg-ochre-light" : "bg-border"}`}>
 {u.role === "super_admin" ? <FontAwesomeIcon icon={faStar} className="w-4 h-4 text-ochre" /> : u.role !== "user" ? <FontAwesomeIcon icon={faShield} className="w-4 h-4 text-forest" /> : <FontAwesomeIcon icon={faUsers} className="w-4 h-4 text-muted" />}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <p className="text-sm font-medium text-ink truncate">{u.name}</p>
 {getRoleBadge(u)}
 </div>
 <p className="text-xs text-muted truncate">{u.email}</p>
 <div className="flex items-center gap-2 mt-1.5 flex-wrap">
 {getPlanBadge(u)}
 {getStatusBadge(u)}
 </div>
 <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted">
 <span className="flex items-center gap-1"><FontAwesomeIcon icon={faCalendarDays} className="w-3 h-3" />{formatDate(u.createdAt)}</span>
 <span className="flex items-center gap-1"><FontAwesomeIcon icon={faFileLines} className="w-3 h-3" />{u._count.transactions} tx</span>
 <span className="flex items-center gap-1"><FontAwesomeIcon icon={faRightToBracket} className="w-3 h-3" />{u._count.loginLogs} logs</span>
 </div>
 </div>
 <div className="flex items-center gap-2 shrink-0">
 {user?.role === "super_admin" && u.id !== user.id && (
 <>
 <select
 value={u.role}
 onClick={(e) => e.stopPropagation()}
 onChange={(e) => changeRole(u.id, e.target.value)}
 className="text-[10px] border border-border rounded-lg px-1.5 py-1 bg-white focus:ring-forest focus:border-forest"
 >
 <option value="user">User</option>
 <option value="admin">Admin</option>
 <option value="super_admin">Super admin</option>
 </select>
 {u.role !== "super_admin" && (
 <button
 onClick={(e) => { e.stopPropagation(); setConfirmDeleteUser(u.id); }}
 className="text-red-400 hover:text-red-600 transition-colors"
 >
 <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
 </button>
 )}
 </>
 )}
 <FontAwesomeIcon icon={faEye} className="w-3.5 h-3.5 text-muted ml-1" />
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* User Detail Modal */}
 {selectedUser && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 animate-fade-in" onClick={() => setSelectedUser(null)}>
 <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl animate-scale-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
 <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-white rounded-t-2xl">
 <h3 className="text-base font-semibold text-ink">Détails de l'utilisateur</h3>
 <button onClick={() => setSelectedUser(null)} className="text-muted hover:text-muted">
 <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
 </button>
 </div>
 <div className="p-5 space-y-4">
 <div className="flex items-center gap-4">
 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${selectedUser.role === "super_admin" ? "bg-ochre-light" : selectedUser.role !== "user" ? "bg-ochre-light" : "bg-border"}`}>
 {selectedUser.role === "super_admin" ? <FontAwesomeIcon icon={faStar} className="w-7 h-7 text-ochre" /> : selectedUser.role !== "user" ? <FontAwesomeIcon icon={faShield} className="w-7 h-7 text-forest" /> : <FontAwesomeIcon icon={faUsers} className="w-7 h-7 text-muted" />}
 </div>
 <div>
 <p className="text-lg font-semibold text-ink">{selectedUser.name}</p>
 <p className="text-sm text-muted">{selectedUser.email}</p>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="bg-sand rounded-xl p-3">
 <p className="text-xs text-muted">Rôle</p>
 <p className="text-sm font-semibold text-ink capitalize">{selectedUser.role === "super_admin" ? "Super administrateur" : selectedUser.role === "admin" ? "Administrateur" : "Utilisateur"}</p>
 </div>
 <div className="bg-sand rounded-xl p-3">
 <p className="text-xs text-muted">Plan</p>
 <p className="text-sm font-semibold text-ink">
 {selectedUser.role !== "user"
 ? "Admin (accès total)"
 : selectedUser.subscription?.status === "active" || selectedUser.plan === "premium"
 ? "Premium"
 : "Gratuit"}
 </p>
 </div>
 <div className="bg-sand rounded-xl p-3">
 <p className="text-xs text-muted">Date d'inscription</p>
 <p className="text-sm font-semibold text-ink">{new Date(selectedUser.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
 </div>
 <div className="bg-sand rounded-xl p-3">
 <p className="text-xs text-muted">Statut</p>
 <p className="text-sm font-semibold text-ink">
 {selectedUser.lockedUntil && new Date(selectedUser.lockedUntil) > new Date()
 ? "Verrouillé"
 : selectedUser.emailVerified
 ? "Actif"
 : "En attente de vérification"}
 </p>
 </div>
 </div>

 <div className="grid grid-cols-3 gap-3">
 <div className="bg-ochre-light rounded-xl p-3 text-center">
 <p className="text-lg font-bold text-forest-light">{selectedUser._count.transactions}</p>
 <p className="text-xs text-forest-light">Transactions</p>
 </div>
 <div className="bg-ochre-light rounded-xl p-3 text-center">
 <p className="text-lg font-bold text-ochre">{selectedUser._count.products}</p>
 <p className="text-xs text-ochre">Produits</p>
 </div>
 <div className="bg-ochre-light rounded-xl p-3 text-center">
 <p className="text-lg font-bold text-forest">{selectedUser._count.sales}</p>
 <p className="text-xs text-forest">Ventes</p>
 </div>
 </div>

  {selectedUser.subscription && (
  <>
  <div className={`rounded-xl p-3 ${selectedUser.subscription.status === "active" ? "bg-ochre-light" : "bg-red-50"}`}>
  <div className="flex items-center justify-between text-sm">
  <span className={selectedUser.subscription.status === "active" ? "text-ochre" : "text-red-600"}>Abonnement</span>
  <span className={`font-semibold ${selectedUser.subscription.status === "active" ? "text-ochre" : "text-red-600"}`}>
  {selectedUser.subscription.amount} {selectedUser.subscription.currency}/mois
  </span>
  </div>
  <div className="flex items-center gap-2 mt-1">
  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
  selectedUser.subscription.status === "active"
  ? "text-forest bg-forest/10"
  : "text-red-600 bg-red-100"
  }`}>
  {selectedUser.subscription.status === "active" ? "Actif" : selectedUser.subscription.status === "expired" ? "Expiré" : "Annulé"}
  </span>
  <span className="text-xs text-muted">
  Expire le {new Date(selectedUser.subscription.endDate).toLocaleDateString("fr-FR")}
  </span>
  </div>
  {(selectedUser.subscriptionHistory && selectedUser.subscriptionHistory.length > 0) && (
  <p className="text-[10px] text-muted mt-2">
  {selectedUser.subscriptionHistory.length} abonnement(s) précédent(s)
  </p>
  )}
  </div>

  {selectedUser.subscriptionHistory && selectedUser.subscriptionHistory.length > 0 && (
  <div className="rounded-xl bg-sand p-3">
  <p className="text-xs font-semibold text-ink mb-2">Historique des abonnements</p>
  <div className="space-y-2">
  {selectedUser.subscriptionHistory.map((h) => (
  <div key={h.id} className="flex items-center justify-between text-[11px]">
  <div className="flex items-center gap-1.5">
  <span className={`w-1.5 h-1.5 rounded-full ${
  h.status === "active" ? "bg-forest" : "bg-muted"
  }`} />
  <span className="text-muted capitalize">{h.status}</span>
  <span className="text-muted">—</span>
  <span className="text-muted">{h.amount} {h.currency}</span>
  </div>
  <span className="text-muted">
  {new Date(h.startDate).toLocaleDateString("fr-FR")} → {new Date(h.endDate).toLocaleDateString("fr-FR")}
  </span>
  </div>
  ))}
  </div>
  </div>
  )}
  </>
  )}

 <div className="text-xs text-muted space-y-1">
 <p>Solde de départ : {formatCurrency(selectedUser.initialBalance)}</p>
 {selectedUser.loginAttempts > 0 && <p>Tentatives de connexion échouées : {selectedUser.loginAttempts}</p>}
 {selectedUser.lockedUntil && new Date(selectedUser.lockedUntil) > new Date() && (
 <p className="text-red-500">Compte verrouillé jusqu'au {new Date(selectedUser.lockedUntil).toLocaleString("fr-FR")}</p>
 )}
 </div>
 </div>
 </div>
 </div>
 )}

 {showAddAdmin && (
 <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
  <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-scale-in max-h-[90vh] overflow-y-auto">
  <div className="flex items-center justify-between mb-6">
  <h3 className="text-lg font-semibold text-ink">Ajouter un administrateur</h3>
 <button onClick={() => setShowAddAdmin(false)} className="text-muted hover:text-muted">
 <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
 </button>
 </div>
 <form onSubmit={handleCreateAdmin} className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-ink mb-1">Nom</label>
 <input type="text" value={newAdmin.name} onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })} className="input-field" required />
 </div>
 <div>
 <label className="block text-sm font-medium text-ink mb-1">Email</label>
 <input type="email" value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} className="input-field" required />
 </div>
 <div>
 <label className="block text-sm font-medium text-ink mb-1">Mot de passe</label>
 <input type="password" value={newAdmin.password} onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })} className="input-field" required minLength={6} />
 </div>
  <div>
  <label className="block text-sm font-medium text-ink mb-1">Rôle</label>
  <CustomSelect
  options={[{ value: "admin", label: "Admin" }, { value: "super_admin", label: "Super admin" }]}
  value={newAdmin.role}
  onChange={(v) => setNewAdmin({ ...newAdmin, role: v })}
  />
  </div>
  <div>
  <label className="block text-sm font-medium text-ink mb-1">Plan</label>
  <CustomSelect
  options={[{ value: "free", label: "Gratuit" }, { value: "premium", label: "Premium" }]}
  value={newAdmin.plan}
  onChange={(v) => setNewAdmin({ ...newAdmin, plan: v })}
  />
  </div>
 {addAdminError && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{addAdminError}</p>}
 <button type="submit" disabled={addingAdmin} className="btn-primary w-full py-2.5 text-sm disabled:opacity-50">
 {addingAdmin ? "Création..." : "Créer l'administrateur"}
 </button>
 </form>
 </div>
 </div>
 )}

 <ConfirmModal
 open={confirmDeleteUser !== null}
 title="Supprimer cet utilisateur ?"
 message="Toutes les données de cet utilisateur (transactions, produits, ventes, abonnements) seront définitivement supprimées. Cette action est irréversible."
 confirmLabel="Oui, supprimer"
 cancelLabel="Annuler"
 variant="danger"
 onConfirm={() => deleteUser(confirmDeleteUser!)}
 onCancel={() => setConfirmDeleteUser(null)}
 />
 </div>
 );
}
