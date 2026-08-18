"use client";

import { useState, useEffect, useMemo } from "react";
import { useDashboard } from "../../layout";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCrown, faDollarSign, faUsers, faArrowRight, faXmark, faEye, faCalendarDays, faCircleCheck, faClock, faBan, faArrowTrendDown, faDownload } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency, formatDate } from "@/lib/utils";
import CustomSelect from "@/components/ui/CustomSelect";
import FlagImg from "@/components/ui/FlagImg";
import type { UserData } from "@/types/admin";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useModalBack } from "@/hooks/useModalBack";

function getStatusBadge(status: string) {
  if (status === "active") return <span className="badge badge-pos"><FontAwesomeIcon icon={faCircleCheck} className="w-2.5 h-2.5" />Actif</span>;
  if (status === "expired") return <span className="badge badge-neg"><FontAwesomeIcon icon={faClock} className="w-2.5 h-2.5" />Expiré</span>;
  if (status === "cancelled") return <span className="badge badge-warn"><FontAwesomeIcon icon={faBan} className="w-2.5 h-2.5" />Annulé</span>;
  return <span className="badge badge-muted">{status}</span>;
}

export default function AdminSubscriptions() {
  const { user } = useDashboard();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<{ subscriptionRevenue?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  const anyModalOpen = selectedUser !== null;

  useScrollLock(anyModalOpen);

  function closeAllModals() {
    setSelectedUser(null);
  }

  useModalBack(anyModalOpen, closeAllModals);

  useEffect(() => {
    document.title = "Abonnements — Administration — Akwetche";
  }, []);

  useEffect(() => {
    if (user && user.role === "user") router.push("/dashboard");
  }, [user, router]);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/users").then(r => r.ok ? r.json() : { users: [] }),
      fetch("/api/admin/stats").then(r => r.ok ? r.json() : {}),
    ]).then(([u, s]) => {
      setUsers(u.users || []);
      setStats(s);
    }).finally(() => setLoading(false));
  }, []);

  const subscribed = useMemo(() => {
    return users.filter(u => u.subscription !== null);
  }, [users]);

  const filtered = useMemo(() => {
    if (filterStatus === "all") return subscribed;
    return subscribed.filter(u => u.subscription?.status === filterStatus);
  }, [subscribed, filterStatus]);

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

  const activeCount = subscribed.filter(u => u.subscription?.status === "active").length;
  const expiredCount = subscribed.filter(u => u.subscription?.status === "expired").length;
  const cancelledCount = subscribed.filter(u => u.subscription?.status === "cancelled").length;
  const churnRate = activeCount + expiredCount > 0 ? Math.round((expiredCount / (activeCount + expiredCount)) * 100) : 0;

  function reportDownload() {
    const headers = ["Nom", "Email", "Statut", "Montant", "Devise", "Début", "Fin"];
    const rows = filtered.map(u => [
      u.name, u.email, u.subscription?.status || "",
      u.subscription?.amount.toString() || "0", u.subscription?.currency || "",
      u.subscription?.endDate ? new Date(u.subscription.endDate).toLocaleDateString("fr-FR") : "",
      u.subscription?.endDate ? new Date(u.subscription.endDate).toLocaleDateString("fr-FR") : "",
    ]);
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `abonnements_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (!user || user.role === "user") return null;

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-7 w-44 bg-stone/30 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="bg-bg-card rounded-2xl border border-border p-4 space-y-2"><div className="w-8 h-8 bg-stone/20 rounded-xl" /><div className="h-3 w-16 bg-stone/30 rounded-lg" /><div className="h-6 w-20 bg-stone/20 rounded-lg" /></div>)}</div>
        <div className="h-64 bg-bg-card rounded-[18px] border border-border" />
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-text-1">Abonnements</h1>
          <p className="text-text-3 text-sm mt-0.5">{activeCount} actifs, {expiredCount} expirés</p>
        </div>
        <button onClick={reportDownload} className="flex items-center gap-1.5 text-xs text-brand font-medium hover:opacity-80 px-3 py-2 rounded-xl border border-border">
          <FontAwesomeIcon icon={faDownload} className="w-3 h-3" />
          Rapport CSV
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card-inset">
          <div className="w-9 h-9 rounded-xl bg-pos-bg flex items-center justify-center mb-3">
            <FontAwesomeIcon icon={faCrown} className="w-[18px] h-[18px] text-pos" />
          </div>
          <p className="text-label mb-1">Actifs</p>
          <p className="text-amount text-2xl text-ink">{activeCount}</p>
        </div>
        <div className="card-inset">
          <div className="w-9 h-9 rounded-xl bg-gold-light flex items-center justify-center mb-3">
            <FontAwesomeIcon icon={faDollarSign} className="w-[18px] h-[18px] text-gold" />
          </div>
          <p className="text-label mb-1">Revenu mensuel</p>
          <p className="text-amount text-2xl text-ink">{formatCurrency(stats?.subscriptionRevenue || 0)}</p>
        </div>
        <div className="card-inset">
          <div className="w-9 h-9 rounded-xl bg-neg-bg flex items-center justify-center mb-3">
            <FontAwesomeIcon icon={faArrowTrendDown} className="w-[18px] h-[18px] text-neg" />
          </div>
          <p className="text-label mb-1">Taux d&apos;attrition <span title="Abonnés expirés ÷ (actifs + expirés) × 100" className="cursor-help text-muted text-[10px] ml-0.5 font-semibold">(i)</span></p>
          <p className="text-amount text-2xl text-ink">{churnRate}%</p>
        </div>
        <div className="card-inset">
          <div className="w-9 h-9 rounded-xl bg-brand-subtle flex items-center justify-center mb-3">
            <FontAwesomeIcon icon={faUsers} className="w-[18px] h-[18px] text-brand" />
          </div>
          <p className="text-label mb-1">Abonnés total</p>
          <p className="text-amount text-2xl text-ink">{subscribed.length}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-bg-card rounded-[18px] border border-border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-auto sm:min-w-[160px]">
            <CustomSelect
              options={[
                { value: "all", label: "Tous les statuts" },
                { value: "active", label: "Actifs" },
                { value: "expired", label: "Expirés" },
                { value: "cancelled", label: "Annulés" },
              ]}
              value={filterStatus}
              onChange={(v) => setFilterStatus(v)}
            />
          </div>
          <p className="text-xs text-text-3 ml-auto">{filtered.length} résultat(s)</p>
        </div>
      </div>

      {/* List */}
      <div className="bg-bg-card rounded-[18px] border border-border overflow-hidden">
        <div className="divide-y divide-border">
          {filtered.map((u, i) => {
            const initial = (u.name || u.email).charAt(0).toUpperCase();
            const avatarBg = u.subscription?.status === "active" ? "bg-pos-bg" : u.subscription?.status === "expired" ? "bg-neg-bg" : "bg-gold-light";
            const avatarText = u.subscription?.status === "active" ? "text-pos" : u.subscription?.status === "expired" ? "text-neg" : "text-gold";
            return (
              <div key={u.id} className={`px-5 py-4 transition-colors ${i % 2 === 1 ? "bg-surface-raised" : ""} hover:bg-sand/50`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${avatarBg} flex items-center justify-center shrink-0`}>
                    <span className={`font-display font-extrabold text-sm ${avatarText}`}>{initial}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-sans font-bold text-[13.5px] text-text-1 truncate">{u.name}</span>
                      {getStatusBadge(u.subscription?.status || "")}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-text-3 flex-wrap">
                      <span className="font-semibold">{formatCurrency(u.subscription?.amount || 0)}/{u.subscription?.currency || "XOF"}</span>
                      {u.subscription?.endDate && (
                        <span className="flex items-center gap-1">
                          <FontAwesomeIcon icon={faCalendarDays} className="w-2.5 h-2.5" />
                          Expire le {new Date(u.subscription.endDate).toLocaleDateString("fr-FR")}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => loadUserHistory(u)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl border border-border text-text-3 hover:bg-sand transition-colors shrink-0"
                    title="Voir historique"
                  >
                    <FontAwesomeIcon icon={faEye} className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="p-5 text-sm text-text-3 text-center">Aucun abonnement trouvé</p>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setSelectedUser(null)}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in" />
          <div className="relative bg-[var(--color-surface)] rounded-t-[20px] sm:rounded-2xl w-full sm:max-w-lg shadow-xl animate-slide-up sm:animate-scale-in max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-[var(--color-surface)] z-10 flex items-center justify-between px-5 py-4 border-b border-border rounded-t-[20px] sm:rounded-t-2xl">
              <h3 className="font-display font-semibold text-base text-text-1">Détails abonnement</h3>
              <button onClick={() => setSelectedUser(null)} className="w-8 h-8 flex items-center justify-center text-text-3 hover:text-text-1 rounded-lg hover:bg-sand transition-colors">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${selectedUser.subscription?.status === "active" ? "bg-pos-bg" : "bg-neg-bg"}`}>
                  <span className={`font-display font-extrabold text-xl ${selectedUser.subscription?.status === "active" ? "text-pos" : "text-neg"}`}>
                    {(selectedUser.name || selectedUser.email).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-lg text-text-1">{selectedUser.name}</p>
                  <p className="text-sm text-text-3">{selectedUser.email}</p>
                </div>
              </div>

              {selectedUser.subscription && (
                <div className={`rounded-xl p-4 ${selectedUser.subscription.status === "active" ? "bg-pos-bg" : "bg-neg-bg"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-text-3">Montant</p>
                      <p className="font-display font-bold text-xl">{formatCurrency(selectedUser.subscription.amount)}<span className="text-xs font-normal text-text-3">/{selectedUser.subscription.currency}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-text-3">Statut</p>
                      <p className={`font-semibold text-sm ${selectedUser.subscription.status === "active" ? "text-pos" : "text-neg"}`}>
                        {selectedUser.subscription.status === "active" ? "Actif" : selectedUser.subscription.status === "expired" ? "Expiré" : "Annulé"}
                      </p>
                    </div>
                  </div>
                  {selectedUser.subscription.endDate && (
                    <div className="flex items-center gap-1.5 mt-3 text-xs text-text-3">
                      <FontAwesomeIcon icon={faCalendarDays} className="w-3 h-3" />
                      Expire le {new Date(selectedUser.subscription.endDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                  )}
                </div>
              )}

              {selectedUser.subscriptionHistory && selectedUser.subscriptionHistory.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-text-1 mb-2">Historique des abonnements</p>
                  <div className="space-y-2">
                    {selectedUser.subscriptionHistory.map((h) => (
                      <div key={h.id} className="bg-bg rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${h.status === "active" ? "bg-pos" : "bg-muted"}`} />
                          <div>
                            <p className="text-sm font-medium text-text-1 capitalize">{h.status}</p>
                            <p className="text-[11px] text-text-3">{formatCurrency(h.amount)}/{h.currency}</p>
                          </div>
                        </div>
                        <div className="text-right text-[11px] text-text-3">
                          <p>{new Date(h.startDate).toLocaleDateString("fr-FR")}</p>
                          <p>→ {new Date(h.endDate).toLocaleDateString("fr-FR")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!selectedUser.subscriptionHistory?.length && !selectedUser.subscription && (
                <p className="text-sm text-text-3 text-center py-4">Aucun abonnement trouvé</p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
