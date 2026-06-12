"use client";

import { useState, useEffect } from "react";
import { useDashboard } from "../layout";
import { useRouter } from "next/navigation";
import {
  Users, Activity, Trash2, Shield, DollarSign,
  ShoppingBag, FileText, CreditCard, LogIn, AlertTriangle,
  CheckCircle, XCircle, Plus, X, Crown, Star,
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
  }

  async function deleteUser(id: number) {
    setConfirmDeleteUser(null);
    await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setUsers(users.filter(u => u.id !== id));
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Administration</h1>
          <p className="text-stone-500 text-sm mt-0.5">Gestion de la plateforme</p>
        </div>
        {user?.role === "super_admin" && (
          <button
            onClick={() => setShowAddAdmin(true)}
            className="btn-primary flex items-center gap-2 text-sm py-2.5"
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

      <div className="card">
        <div className="p-4 border-b border-stone-100">
          <h2 className="text-sm font-semibold text-stone-700">Tentatives de connexion récentes</h2>
        </div>
        <div className="divide-y divide-stone-100 max-h-64 overflow-y-auto">
          {stats?.recentLogs.map((log) => (
            <div key={log.id} className="flex items-center justify-between p-3 hover:bg-stone-50 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                {log.success
                  ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                }
                <span className="text-stone-700 font-medium truncate">{log.user?.email || "Inconnu"}</span>
                <span className="text-stone-400 truncate hidden sm:inline">{log.ip}</span>
              </div>
              <div className="flex items-center gap-3 text-stone-400 shrink-0">
                <span className="hidden md:inline">{log.reason}</span>
                <span>{new Date(log.createdAt).toLocaleString("fr-FR")}</span>
              </div>
            </div>
          ))}
          {(!stats?.recentLogs || stats.recentLogs.length === 0) && (
            <p className="p-4 text-sm text-stone-400 text-center">Aucune tentative de connexion</p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-stone-100">
          <h2 className="text-sm font-semibold text-stone-700">Utilisateurs</h2>
        </div>
        <div className="divide-y divide-stone-100">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-4 hover:bg-stone-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${u.role === "super_admin" ? "bg-amber-100" : u.role !== "user" ? "bg-emerald-100" : "bg-stone-100"}`}>
                  {u.role === "super_admin" ? <Star className="w-4 h-4 text-amber-600" /> : u.role !== "user" ? <Shield className="w-4 h-4 text-emerald-600" /> : <Users className="w-4 h-4 text-stone-500" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">
                    {u.name}
                    {u.role === "super_admin" && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded ml-1">Super admin</span>}
                    {u.role === "admin" && <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded ml-1">Admin</span>}
                    {!u.emailVerified && <span className="text-xs text-amber-600 ml-1">(non vérifié)</span>}
                    {u.plan === "premium" && <span className="text-xs text-amber-600 ml-1"><Crown className="w-3 h-3 inline" /></span>}
                  </p>
                  <p className="text-xs text-stone-400 truncate">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-stone-500 shrink-0">
                <span title="Connexions">{u._count.loginLogs} logs</span>
                <span>{u._count.transactions} tx</span>
                <span className="hidden sm:inline">{formatDate(u.createdAt)}</span>
                {user?.role === "super_admin" && u.id !== user.id && (
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    className="text-xs border border-stone-200 rounded-lg px-2 py-1 bg-white focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super admin</option>
                  </select>
                )}
                {user?.role === "super_admin" && u.role !== "super_admin" && (
                  <button onClick={() => setConfirmDeleteUser(u.id)} className="text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

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
