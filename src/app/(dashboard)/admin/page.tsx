"use client";

import { useState, useEffect } from "react";
import { useDashboard } from "../layout";
import { useRouter } from "next/navigation";
import {
  Users, Activity, Trash2, Shield, DollarSign,
  ShoppingBag, FileText, CreditCard, LogIn, AlertTriangle,
  CheckCircle, XCircle, Plus, X, Crown, Star,
  Mail, CalendarDays, Lock, Unlock, Eye, Download,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import ConfirmModal from "@/components/ConfirmModal";

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
      return <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded"><Shield className="w-2.5 h-2.5" />Admin</span>;
    }
    if (u.subscription?.status === "active" || u.plan === "premium") {
      return <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded"><Crown className="w-2.5 h-2.5" />Premium</span>;
    }
    return <span className="inline-flex items-center text-[10px] font-medium bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">Gratuit</span>;
  }

  function getStatusBadge(u: UserData) {
    if (u.lockedUntil && new Date(u.lockedUntil) > new Date()) {
      return <span className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-red-100 text-red-600 px-1.5 py-0.5 rounded"><Lock className="w-2.5 h-2.5" />Verrouillé</span>;
    }
    if (!u.emailVerified) {
      return <span className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded"><Mail className="w-2.5 h-2.5" />Non vérifié</span>;
    }
    return <span className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded"><CheckCircle className="w-2.5 h-2.5" />Actif</span>;
  }

  function getRoleBadge(u: UserData) {
    if (u.role === "super_admin") return <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Super admin</span>;
    if (u.role === "admin") return <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Admin</span>;
    return null;
  }

  if (!user || user.role === "user") return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Administration</h1>
          <p className="text-stone-500 text-sm mt-0.5">Gestion de la plateforme</p>
        </div>
        {user?.role === "super_admin" && (
          <button
            onClick={() => setShowAddAdmin(true)}
            className="btn-primary flex items-center gap-2 text-sm py-2.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Ajouter un admin
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {[
          { label: "Utilisateurs", value: stats?.totalUsers || 0, icon: Users, color: "emerald" },
          { label: "Nouveaux aujourd'hui", value: stats?.usersToday || 0, icon: Users, color: "teal" },
          { label: "Transactions", value: stats?.totalTransactions || 0, icon: FileText, color: "teal" },
          { label: "Ventes", value: stats?.totalSales || 0, icon: ShoppingBag, color: "amber" },
          { label: "Produits", value: stats?.totalProducts || 0, icon: Activity, color: "emerald" },
          { label: "Revenus", value: formatCurrency(stats?.totalRevenue || 0), icon: DollarSign, color: "emerald" },
          { label: "Abonnements", value: stats?.activeSubscriptions || 0, icon: CreditCard, color: "violet" },
          { label: "Tentatives login", value: stats?.loginAttemptsToday || 0, icon: LogIn, color: "blue" },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center mb-2">
              <s.icon className="w-4 h-4 text-stone-600" />
            </div>
            <p className="text-xs text-stone-500">{s.label}</p>
            <p className="text-lg font-bold text-stone-800">{s.value}</p>
          </div>
        ))}
      </div>

      {stats && stats.failedLoginsToday > 0 && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{stats.failedLoginsToday} tentative(s) échouée(s) aujourd'hui sur {stats.loginAttemptsToday} totales</span>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-stone-100">
          <h2 className="text-sm font-semibold text-stone-700">Tentatives de connexion récentes</h2>
        </div>
        <div className="divide-y divide-stone-100 max-h-64 overflow-y-auto">
          {stats?.recentLogs.map((log) => (
            <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 hover:bg-stone-50 text-xs gap-1">
              <div className="flex items-center gap-2 min-w-0">
                {log.success
                  ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                }
                <span className="text-stone-700 font-medium truncate">{log.user?.email || "Inconnu"}</span>
                <span className="text-stone-400 truncate hidden sm:inline">{log.ip}</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 text-stone-400 shrink-0 ml-5 sm:ml-0">
                <span className="text-stone-500">{log.reason}</span>
                <span className="text-stone-400">{new Date(log.createdAt).toLocaleString("fr-FR")}</span>
              </div>
            </div>
          ))}
          {(!stats?.recentLogs || stats.recentLogs.length === 0) && (
            <p className="p-4 text-sm text-stone-400 text-center">Aucune tentative de connexion</p>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-stone-100">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-700">Historique complet des connexions</h2>
            <button
              onClick={() => showAllLogs ? setShowAllLogs(false) : loadAllLogs()}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              {showAllLogs ? "Masquer" : logsLoading ? "Chargement..." : "Voir tout"}
            </button>
          </div>
        </div>
        {showAllLogs && (
          <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto">
            {allLogs.length === 0 ? (
              <p className="p-4 text-sm text-stone-400 text-center">Aucune tentative de connexion</p>
            ) : (
              allLogs.map((log) => (
                <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 hover:bg-stone-50 text-xs gap-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {log.success
                      ? <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                      : <XCircle className="w-3 h-3 text-red-400 shrink-0" />
                    }
                    <span className="text-stone-700 font-medium truncate">{log.user?.email || "Inconnu"}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 text-stone-400 shrink-0 ml-5 sm:ml-0 flex-wrap">
                    <span className="text-stone-500">{log.reason === "success" ? "Succès" : log.reason === "invalid_password" ? "Mot de passe incorrect" : log.reason === "account_locked" ? "Compte verrouillé" : log.reason === "user_not_found" ? "Utilisateur introuvable" : log.reason}</span>
                    {log.ip && <span className="text-stone-400 hidden sm:inline">{log.ip}</span>}
                    <span className="text-stone-400">{new Date(log.createdAt).toLocaleString("fr-FR")}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        {!showAllLogs && (
          <p className="p-4 text-sm text-stone-400 text-center">Cliquez sur &quot;Voir tout&quot; pour charger l&apos;historique complet.</p>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-stone-100">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-700">Utilisateurs</h2>
            <button
              onClick={downloadUserReport}
              className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              Télécharger rapport
            </button>
          </div>
        </div>
        <div className="divide-y divide-stone-100">
          {users.map((u) => (
            <div
              key={u.id}
              onClick={() => setSelectedUser(u)}
              className="p-4 hover:bg-stone-50 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${u.role === "super_admin" ? "bg-amber-100" : u.role !== "user" ? "bg-emerald-100" : "bg-stone-100"}`}>
                  {u.role === "super_admin" ? <Star className="w-4 h-4 text-amber-600" /> : u.role !== "user" ? <Shield className="w-4 h-4 text-emerald-600" /> : <Users className="w-4 h-4 text-stone-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-stone-800 truncate">{u.name}</p>
                    {getRoleBadge(u)}
                  </div>
                  <p className="text-xs text-stone-400 truncate">{u.email}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {getPlanBadge(u)}
                    {getStatusBadge(u)}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-stone-400">
                    <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{formatDate(u.createdAt)}</span>
                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{u._count.transactions} tx</span>
                    <span className="flex items-center gap-1"><LogIn className="w-3 h-3" />{u._count.loginLogs} logs</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {user?.role === "super_admin" && u.id !== user.id && (
                    <>
                      <select
                        value={u.role}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => changeRole(u.id, e.target.value)}
                        className="text-[10px] border border-stone-200 rounded-lg px-1.5 py-1 bg-white focus:ring-emerald-500 focus:border-emerald-500"
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
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                  <Eye className="w-3.5 h-3.5 text-stone-300 ml-1" />
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
            <div className="flex items-center justify-between p-5 border-b border-stone-100 sticky top-0 bg-white rounded-t-2xl">
              <h3 className="text-base font-semibold text-stone-900">Détails de l'utilisateur</h3>
              <button onClick={() => setSelectedUser(null)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${selectedUser.role === "super_admin" ? "bg-amber-100" : selectedUser.role !== "user" ? "bg-emerald-100" : "bg-stone-100"}`}>
                  {selectedUser.role === "super_admin" ? <Star className="w-7 h-7 text-amber-600" /> : selectedUser.role !== "user" ? <Shield className="w-7 h-7 text-emerald-600" /> : <Users className="w-7 h-7 text-stone-500" />}
                </div>
                <div>
                  <p className="text-lg font-semibold text-stone-900">{selectedUser.name}</p>
                  <p className="text-sm text-stone-500">{selectedUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-stone-50 rounded-xl p-3">
                  <p className="text-xs text-stone-500">Rôle</p>
                  <p className="text-sm font-semibold text-stone-800 capitalize">{selectedUser.role === "super_admin" ? "Super administrateur" : selectedUser.role === "admin" ? "Administrateur" : "Utilisateur"}</p>
                </div>
                <div className="bg-stone-50 rounded-xl p-3">
                  <p className="text-xs text-stone-500">Plan</p>
                  <p className="text-sm font-semibold text-stone-800">
                    {selectedUser.role !== "user"
                      ? "Admin (accès total)"
                      : selectedUser.subscription?.status === "active" || selectedUser.plan === "premium"
                        ? "Premium"
                        : "Gratuit"}
                  </p>
                </div>
                <div className="bg-stone-50 rounded-xl p-3">
                  <p className="text-xs text-stone-500">Date d'inscription</p>
                  <p className="text-sm font-semibold text-stone-800">{new Date(selectedUser.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
                <div className="bg-stone-50 rounded-xl p-3">
                  <p className="text-xs text-stone-500">Statut</p>
                  <p className="text-sm font-semibold text-stone-800">
                    {selectedUser.lockedUntil && new Date(selectedUser.lockedUntil) > new Date()
                      ? "Verrouillé"
                      : selectedUser.emailVerified
                        ? "Actif"
                        : "En attente de vérification"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-teal-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-teal-700">{selectedUser._count.transactions}</p>
                  <p className="text-xs text-teal-600">Transactions</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-amber-700">{selectedUser._count.products}</p>
                  <p className="text-xs text-amber-600">Produits</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-emerald-700">{selectedUser._count.sales}</p>
                  <p className="text-xs text-emerald-600">Ventes</p>
                </div>
              </div>

              {selectedUser.subscription?.status === "active" && (
                <div className="bg-amber-50 rounded-xl p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-amber-700">Abonnement</span>
                    <span className="font-semibold text-amber-800">
                      {selectedUser.subscription.amount} {selectedUser.subscription.currency}/mois
                    </span>
                  </div>
                  <p className="text-xs text-amber-600 mt-1">
                    Expire le {new Date(selectedUser.subscription.endDate).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              )}

              <div className="text-xs text-stone-400 space-y-1">
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
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-stone-900">Ajouter un administrateur</h3>
              <button onClick={() => setShowAddAdmin(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Nom</label>
                <input type="text" value={newAdmin.name} onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
                <input type="email" value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Mot de passe</label>
                <input type="password" value={newAdmin.password} onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })} className="input-field" required minLength={6} />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Rôle</label>
                <select value={newAdmin.role} onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })} className="input-field">
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Plan</label>
                <select value={newAdmin.plan} onChange={(e) => setNewAdmin({ ...newAdmin, plan: e.target.value })} className="input-field">
                  <option value="free">Gratuit</option>
                  <option value="premium">Premium</option>
                </select>
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
