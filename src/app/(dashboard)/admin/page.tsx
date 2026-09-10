"use client";

import { useState, useEffect } from "react";
import { useDashboard } from "../layout";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUsers, faFileLines, faBagShopping, faDollarSign, faTriangleExclamation, faPlus, faCrown, faRightToBracket, faArrowRight, faCalendarDays, faXmark, faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency, formatDate } from "@/lib/utils";
import { getCountryName } from "@/lib/utils";
import FlagImg from "@/components/ui/FlagImg";
import CustomSelect from "@/components/ui/CustomSelect";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Stats } from "@/types/admin";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useModalBack } from "@/hooks/useModalBack";

const MONTH_LABELS = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
function fmtMonth(m: string) {
  const p = m.split('-');
  return MONTH_LABELS[parseInt(p[1]) - 1] || m;
}

function chartClickIndex(next: { activeTooltipIndex?: number | string | null } | null | undefined): number | null {
  const raw = next?.activeTooltipIndex;
  const idx = typeof raw === "number" ? raw : typeof raw === "string" && raw !== "" ? parseInt(raw, 10) : null;
  return idx !== null && !Number.isNaN(idx) ? idx : null;
}

function renderSelectableDot(color: string, selectedIndex: number | null) {
  const SelectableDot = (props: { cx?: number; cy?: number; index?: number }) => {
    if (props.cx == null || props.cy == null) return <g key={`dot-${props.index ?? "?"}`} />;
    const isSel = selectedIndex === props.index;
    const dimmed = selectedIndex !== null && !isSel;
    return (
      <circle
        key={`dot-${props.index ?? "?"}`}
        cx={props.cx}
        cy={props.cy}
        r={isSel ? 5 : 3}
        fill={color}
        opacity={dimmed ? 0.15 : 1}
        stroke={isSel ? "#fff" : "none"}
        strokeWidth={isSel ? 1.5 : 0}
        pointerEvents="none"
      />
    );
  };
  SelectableDot.displayName = "SelectableDot";
  return SelectableDot;
}

export default function AdminOverview() {
  const { user } = useDashboard();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", password: "", plan: "free", role: "admin" });
  const [addAdminError, setAddAdminError] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [backfillState, setBackfillState] = useState<"idle" | "running" | "done">("idle");
  const [backfillResult, setBackfillResult] = useState<{ tontines: number; membresTraites: number; periodesImputees: number; soldeTotal: number } | null>(null);
  const [backfillError, setBackfillError] = useState("");
  const [userSel, setUserSel] = useState<number | null>(null);
  const [revSel, setRevSel] = useState<{ idx: number; series: 'ventes' | 'abonnements' } | null>(null);

  const anyModalOpen = showAddAdmin;

  useScrollLock(anyModalOpen);

  function closeAllModals() {
    setShowAddAdmin(false);
  }

  useModalBack(anyModalOpen, closeAllModals);

  useEffect(() => {
    document.title = "Administration — Akwetche";
  }, []);

  useEffect(() => {
    if (user && user.role === "user") router.push("/dashboard");
  }, [user, router]);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(r => r.ok ? r.json() : null)
      .then(setStats)
      .finally(() => setLoading(false));
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
    } catch { setAddAdminError("Erreur"); }
    finally { setAddingAdmin(false); }
  }

  async function handleBackfill() {
    setBackfillState("running");
    setBackfillError("");
    setBackfillResult(null);
    try {
      const res = await fetch("/api/tontines/backfill-mises", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setBackfillError(data.error || "Erreur"); setBackfillState("idle"); return; }
      setBackfillResult(data);
      setBackfillState("done");
    } catch { setBackfillError("Erreur"); setBackfillState("idle"); }
  }

  const usersGrowthData = (stats?.usersMonthly || []).map(d => ({
    month: fmtMonth(d.month),
    users: d.count,
  }));
  const revenueMonths = (stats?.revenueMonthly || []).map(d => ({
    month: fmtMonth(d.month),
    abonnements: d.abonnements,
    ventes: d.ventes,
  }));

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
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-text-1">Administration</h1>
          <p className="text-text-3 text-sm mt-0.5">Vue d&apos;ensemble de la plateforme</p>
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

      {/* Alertes prioritaires */}
      <div className="space-y-2">
        {stats && stats.failedLoginsToday > 0 && (
          <div className="alert-inline neg">
            <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 shrink-0" />
            <span className="flex-1">{stats.failedLoginsToday} tentative(s) échouée(s) aujourd&apos;hui sur {stats.loginAttemptsToday} totales</span>
            <button onClick={() => router.push('/admin/security')} className="flex items-center gap-1 text-xs font-medium text-neg/70 hover:text-neg shrink-0">
              Détail <FontAwesomeIcon icon={faArrowRight} className="w-2.5 h-2.5" />
            </button>
          </div>
        )}
        {stats && stats.activeSubscriptions > 1 && (
          <div className="alert-inline pos">
            <FontAwesomeIcon icon={faCrown} className="w-4 h-4 shrink-0" />
            <span className="flex-1">{stats.activeSubscriptions} abonnement(s) actif(s)</span>
            <button onClick={() => router.push('/admin/subscriptions')} className="flex items-center gap-1 text-xs font-medium text-pos/70 hover:text-pos shrink-0">
              Voir <FontAwesomeIcon icon={faArrowRight} className="w-2.5 h-2.5" />
            </button>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Utilisateurs", value: stats?.totalUsers || 0, sub: stats?.usersToday ?? 0, icon: faUsers, bg: "bg-pos-bg", iconColor: "text-pos" },
          { label: "Transactions", value: stats?.totalTransactions || 0, sub: 0, icon: faFileLines, bg: "bg-gold-light", iconColor: "text-gold" },
          { label: "Produits", value: stats?.totalProducts || 0, sub: 0, icon: faBagShopping, bg: "bg-brand-subtle", iconColor: "text-brand" },
          { label: "Revenus", value: formatCurrency(stats?.subscriptionRevenue || 0), sub: 0, icon: faCrown, bg: "bg-gold-light", iconColor: "text-gold" },
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
                {s.sub > 0 ? `+${s.sub}` : "0"} aujourd&apos;hui
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-bg-card rounded-[18px] border border-border p-5">
          <span className="text-[9px] font-bold uppercase tracking-widest text-text-3">Évolution utilisateurs</span>
          <p className="text-label text-xs text-text-3 mt-0.5">6 derniers mois</p>
          <div className="mt-4 h-48 cursor-pointer">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usersGrowthData} onClick={(s) => setUserSel((prev) => { const i = chartClickIndex(s); return prev === i ? null : i; })}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid var(--color-border)', fontSize: '13px' }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Line type="monotone" dataKey="users" stroke="var(--color-pos)" strokeWidth={2.5} dot={renderSelectableDot('var(--color-pos)', userSel)} activeDot={{ r: 4, fill: 'var(--color-pos)', stroke: '#fff', strokeWidth: 1.5 }} isAnimationActive={userSel === null} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {typeof userSel === "number" && usersGrowthData[userSel] && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-bg border border-border px-3 py-2 animate-fade-in">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-3">{usersGrowthData[userSel].month}</p>
                <p className="text-sm font-bold text-ink mt-0.5 tabular-nums">
                  {usersGrowthData[userSel].users} <span className="font-medium text-text-3 text-xs">inscrit(s)</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUserSel(null)}
                aria-label="Fermer le détail"
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-text-3 hover:text-text-1 hover:bg-border transition-colors"
              >
                <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {userSel === null && (
            <p className="text-[10px] text-text-3 mt-2">Cliquez sur un point pour afficher le détail.</p>
          )}
        </div>
        <div className="bg-bg-card rounded-[18px] border border-border p-5">
          <span className="text-[9px] font-bold uppercase tracking-widest text-text-3">Revenus mensuels</span>
          <p className="text-label text-xs text-text-3 mt-0.5">Abonnements + ventes</p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{background:'var(--color-gold)'}} /><span className="text-[10px] text-text-3">Ventes</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{background:'var(--color-pos)'}} /><span className="text-[10px] text-text-3">Abonnements</span></div>
          </div>
          <div className="mt-3 h-48 cursor-pointer">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={revenueMonths}
                onClick={(s) => setRevSel((prev) => {
                  const i = chartClickIndex(s);
                  if (i === null) return prev;
                  const series = s?.activeDataKey === 'abonnements' ? 'abonnements' : 'ventes';
                  return prev && prev.idx === i && prev.series === series ? null : { idx: i, series };
                })}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid var(--color-border)', fontSize: '13px' }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Line type="monotone" dataKey="ventes" name="Ventes" stroke="var(--color-gold)" strokeWidth={2.5} opacity={revSel === null || revSel.series === 'ventes' ? 1 : 0.3} dot={renderSelectableDot('var(--color-gold)', revSel && revSel.series === 'ventes' ? revSel.idx : null)} activeDot={{ r: 4, fill: 'var(--color-gold)', stroke: '#fff', strokeWidth: 1.5 }} isAnimationActive={revSel === null} />
                <Line type="monotone" dataKey="abonnements" name="Abonnements" stroke="var(--color-pos)" strokeWidth={2.5} opacity={revSel === null || revSel.series === 'abonnements' ? 1 : 0.3} dot={renderSelectableDot('var(--color-pos)', revSel && revSel.series === 'abonnements' ? revSel.idx : null)} activeDot={{ r: 4, fill: 'var(--color-pos)', stroke: '#fff', strokeWidth: 1.5 }} isAnimationActive={revSel === null} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {revSel && revenueMonths[revSel.idx] && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-bg border border-border px-3 py-2 animate-fade-in">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-3">{revenueMonths[revSel.idx].month}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-text-3">
                  <span><span className="font-bold text-gold tabular-nums">{formatCurrency(revenueMonths[revSel.idx].ventes)}</span> ventes</span>
                  <span><span className="font-bold text-pos tabular-nums">{formatCurrency(revenueMonths[revSel.idx].abonnements)}</span> abonnements</span>
                  <span><span className="font-bold text-ink tabular-nums">{formatCurrency(revenueMonths[revSel.idx].ventes + revenueMonths[revSel.idx].abonnements)}</span> total</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRevSel(null)}
                aria-label="Fermer le détail"
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-text-3 hover:text-text-1 hover:bg-border transition-colors"
              >
                <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {revSel === null && (
            <p className="text-[10px] text-text-3 mt-2">Cliquez sur une courbe pour afficher le détail.</p>
          )}
        </div>
      </div>

      {/* Répartitions: Pays + Devise */}
      {(stats?.usersByCountry && stats.usersByCountry.length > 0) || (stats?.usersByCurrency && stats.usersByCurrency.length > 0) ? (
        <div className="bg-bg-card rounded-[18px] border border-border p-5">
          <span className="text-[9px] font-bold uppercase tracking-widest text-text-3">Répartition des utilisateurs</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
            {stats?.usersByCountry && stats.usersByCountry.length > 0 && (
              <div>
                <p className="text-xs text-text-3 mb-2">Par pays</p>
                <div className="flex flex-wrap gap-2">
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
              </div>
            )}
            {stats?.usersByCurrency && stats.usersByCurrency.length > 0 && (
              <div>
                <p className="text-xs text-text-3 mb-2">Par devise</p>
                <div className="flex flex-wrap gap-2">
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
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Abonnements résumé */}
      {stats && (stats.activeSubscriptions > 0 || (stats.subscriptionRevenue ?? 0) > 0) && (
        <div className="bg-bg-card rounded-[18px] border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-bold uppercase tracking-widest text-text-3">Abonnements</span>
            <button onClick={() => router.push('/admin/subscriptions')} className="flex items-center gap-1 text-xs text-brand font-medium hover:opacity-80">
              Gérer <FontAwesomeIcon icon={faArrowRight} className="w-2.5 h-2.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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

      {/* Maintenance (super_admin) */}
      {user?.role === "super_admin" && (
        <div className="bg-bg-card rounded-[18px] border border-border p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl bg-brand-subtle flex items-center justify-center">
              <FontAwesomeIcon icon={faLayerGroup} className="w-4 h-4 text-brand" />
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-text-3">Maintenance</span>
              <p className="text-label text-xs text-text-3 mt-0.5">Backfill tontines (mises)</p>
            </div>
          </div>
          <p className="text-sm text-text-3 mb-3">
            Matérialise les surplus des tontines existantes en jours de mise : les paiements d&apos;avance déjà
            enregistrés sont répartis sur les périodes futures et les compteurs de mises recalibrés.
          </p>
          <button
            onClick={handleBackfill}
            disabled={backfillState === "running"}
            className="inline-flex items-center gap-2 bg-brand text-white font-sans font-bold text-[13px] px-4 py-[10px] rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faLayerGroup} className="w-3.5 h-3.5" />
            {backfillState === "running" ? "Traitement..." : "Lancer le backfill"}
          </button>
          {backfillError && <p className="text-neg text-sm bg-neg-bg p-3 rounded-xl mt-3">{backfillError}</p>}
          {backfillResult && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-bg rounded-xl p-3">
                <p className="text-[11.5px] text-text-3">Tontines</p>
                <p className="font-display font-bold text-xl text-ink mt-0.5">{backfillResult.tontines}</p>
              </div>
              <div className="bg-bg rounded-xl p-3">
                <p className="text-[11.5px] text-text-3">Membres</p>
                <p className="font-display font-bold text-xl text-ink mt-0.5">{backfillResult.membresTraites}</p>
              </div>
              <div className="bg-bg rounded-xl p-3">
                <p className="text-[11.5px] text-text-3">Périodes imputées</p>
                <p className="font-display font-bold text-xl text-pos mt-0.5">{backfillResult.periodesImputees}</p>
              </div>
              <div className="bg-bg rounded-xl p-3">
                <p className="text-[11.5px] text-text-3">Solde restant</p>
                <p className="font-display font-bold text-xl text-gold mt-0.5">{formatCurrency(backfillResult.soldeTotal)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Admin Modal */}
      {showAddAdmin && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowAddAdmin(false)}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in" />
          <div className="relative bg-[var(--color-surface)] rounded-t-[20px] sm:rounded-2xl w-full sm:max-w-md shadow-xl animate-slide-up sm:animate-scale-in max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-[var(--color-surface)] z-10 flex items-center justify-between px-5 py-4 border-b border-border rounded-t-[20px] sm:rounded-t-2xl">
              <h3 className="font-display font-semibold text-base text-text-1">Ajouter un administrateur</h3>
              <button onClick={() => setShowAddAdmin(false)} className="w-8 h-8 flex items-center justify-center text-text-3 hover:text-text-1 rounded-lg hover:bg-sand transition-colors">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div>
                  <label className="block text-[11.5px] font-sans font-medium text-text-3 mb-1.5">Nom</label>
                  <input type="text" value={newAdmin.name} onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })} className="input-field" placeholder="Nom complet" required />
                </div>
                <div>
                  <label className="block text-[11.5px] font-sans font-medium text-text-3 mb-1.5">Email</label>
                  <input type="email" value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} className="input-field" placeholder="admin@email.com" required />
                </div>
                <div>
                  <label className="block text-[11.5px] font-sans font-medium text-text-3 mb-1.5">Mot de passe</label>
                  <input type="password" value={newAdmin.password} onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })} className="input-field" placeholder="Minimum 8 caractères" required minLength={8} />
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
    </>
  );
}
