"use client";

import { useState, useEffect } from "react";
import { useDashboard } from "../../layout";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowTrendUp, faArrowTrendDown, faWallet, faBagShopping, faTags, faXmark } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from "@/lib/utils";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { Stats } from "@/types/admin";

const MONTH_LABELS = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
function fmtMonth(m: string) {
  const p = m.split('-');
  return MONTH_LABELS[parseInt(p[1]) - 1] || m;
}

const PIE_COLORS = ['#1B3A6B', '#F5A623', '#B91C1C', '#0D7A4B', '#D97706', '#64748B', '#7C3AED', '#C4A088'];

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

export default function AdminAnalytics() {
  const { user } = useDashboard();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [txSel, setTxSel] = useState<number | null>(null);
  const [userSel, setUserSel] = useState<number | null>(null);
  const [revSel, setRevSel] = useState<{ idx: number; series: 'ventes' | 'abonnements' } | null>(null);
  const [catSel, setCatSel] = useState<number | null>(null);
  const [sliceSel, setSliceSel] = useState<number | null>(null);

  useEffect(() => {
    document.title = "Analytiques — Administration — Akwetche";
  }, []);

  useEffect(() => {
    if (user && user.role === "user") router.push("/dashboard");
  }, [user, router]);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(r => r.ok ? r.json() : null)
      .then((data) => setStats(data as Stats | null))
      .finally(() => setLoading(false));
  }, []);

  if (!user || user.role === "user") return null;

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-7 w-40 bg-stone/30 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="bg-bg-card rounded-2xl border border-border p-4 space-y-2"><div className="w-8 h-8 bg-stone/20 rounded-xl" /><div className="h-3 w-16 bg-stone/30 rounded-lg" /><div className="h-6 w-20 bg-stone/20 rounded-lg" /></div>)}</div>
        <div className="h-80 bg-bg-card rounded-[18px] border border-border" />
      </div>
    );
  }

  const txData = (stats?.transactionsMonthly || []).map(d => ({ month: fmtMonth(d.month), income: d.income, expense: d.expense }));
  const userData = (stats?.usersMonthly || []).map(d => ({ month: fmtMonth(d.month), users: d.count }));
  const revData = (stats?.revenueMonthly || []).map(d => ({ month: fmtMonth(d.month), abonnements: d.abonnements, ventes: d.ventes }));
  const categories = stats?.categoriesTop || [];
  const totalTxValue = (stats?.totalIncome || 0) + (stats?.totalExpense || 0);

  const pieData = [
    { name: "Revenus", value: stats?.totalIncome || 0 },
    { name: "Dépenses", value: stats?.totalExpense || 0 },
  ].filter(d => d.value > 0);

  const catPieData = categories.map((c, i) => ({ name: c.name, value: c.count, color: PIE_COLORS[i % PIE_COLORS.length] }));
  const catPieTotal = catPieData.reduce((a, c) => a + c.value, 0);

  return (
    <div className="space-y-4">

      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-text-1">Analytiques</h1>
        <p className="text-text-3 text-sm mt-0.5">Indicateurs clés et tendances</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card-inset">
          <div className="w-9 h-9 rounded-xl bg-pos-bg flex items-center justify-center mb-3">
            <FontAwesomeIcon icon={faArrowTrendUp} className="w-[18px] h-[18px] text-pos" />
          </div>
          <p className="text-label mb-1">Revenus (6 mois)</p>
          <p className="text-amount text-2xl text-ink">{formatCurrency(stats?.totalIncome || 0)}</p>
        </div>
        <div className="card-inset">
          <div className="w-9 h-9 rounded-xl bg-neg-bg flex items-center justify-center mb-3">
            <FontAwesomeIcon icon={faArrowTrendDown} className="w-[18px] h-[18px] text-neg" />
          </div>
          <p className="text-label mb-1">Dépenses (6 mois)</p>
          <p className="text-amount text-2xl text-ink">{formatCurrency(stats?.totalExpense || 0)}</p>
        </div>
        <div className="card-inset">
          <div className="w-9 h-9 rounded-xl bg-gold-light flex items-center justify-center mb-3">
            <FontAwesomeIcon icon={faWallet} className="w-[18px] h-[18px] text-gold" />
          </div>
          <p className="text-label mb-1">Transactions</p>
          <p className="text-amount text-2xl text-ink">{stats?.totalTransactions || 0}</p>
        </div>
        <div className="card-inset">
          <div className="w-9 h-9 rounded-xl bg-brand-subtle flex items-center justify-center mb-3">
            <FontAwesomeIcon icon={faBagShopping} className="w-[18px] h-[18px] text-brand" />
          </div>
          <p className="text-label mb-1">Produits vendus</p>
          <p className="text-amount text-2xl text-ink">{stats?.totalSales || 0}</p>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Transactions: Income vs Expense */}
        <div className="bg-bg-card rounded-[18px] border border-border p-5">
          <span className="text-[9px] font-bold uppercase tracking-widest text-text-3">Revenus vs Dépenses</span>
          <p className="text-label text-xs text-text-3 mt-0.5">Flux mensuels (6 mois)</p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{background:'var(--color-pos)'}} /><span className="text-[10px] text-text-3">Revenus</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{background:'var(--color-neg)'}} /><span className="text-[10px] text-text-3">Dépenses</span></div>
          </div>
          <div className="mt-3 h-48 cursor-pointer">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={txData} onClick={(s) => setTxSel((prev) => { const i = chartClickIndex(s); return prev === i ? null : i; })}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--color-border)', fontSize: '13px' }} labelStyle={{ fontWeight: 600 }} />
                <Bar dataKey="income" name="Revenus" fill="var(--color-pos)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={txSel === null}>
                  {txData.map((_, i) => <Cell key={`inc-${i}`} fillOpacity={txSel === null || txSel === i ? 1 : 0.25} />)}
                </Bar>
                <Bar dataKey="expense" name="Dépenses" fill="var(--color-neg)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={txSel === null}>
                  {txData.map((_, i) => <Cell key={`exp-${i}`} fillOpacity={txSel === null || txSel === i ? 1 : 0.25} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {typeof txSel === "number" && txData[txSel] && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-bg border border-border px-3 py-2 animate-fade-in">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-3">{txData[txSel].month}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-text-3">
                  <span><span className="font-bold text-pos tabular-nums">{formatCurrency(txData[txSel].income)}</span> revenus</span>
                  <span><span className="font-bold text-neg tabular-nums">{formatCurrency(txData[txSel].expense)}</span> dépenses</span>
                  <span><span className="font-bold text-ink tabular-nums">{formatCurrency(txData[txSel].income - txData[txSel].expense)}</span> solde</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTxSel(null)}
                aria-label="Fermer le détail"
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-text-3 hover:text-text-1 hover:bg-border transition-colors"
              >
                <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {txSel === null && (
            <p className="text-[10px] text-text-3 mt-2">Cliquez sur une barre pour afficher le détail.</p>
          )}
        </div>

        {/* Users growth */}
        <div className="bg-bg-card rounded-[18px] border border-border p-5">
          <span className="text-[9px] font-bold uppercase tracking-widest text-text-3">Utilisateurs</span>
          <p className="text-label text-xs text-text-3 mt-0.5">Nouveaux inscrits par mois</p>
          <div className="mt-4 h-48 cursor-pointer">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userData} onClick={(s) => setUserSel((prev) => { const i = chartClickIndex(s); return prev === i ? null : i; })}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--color-border)', fontSize: '13px' }} labelStyle={{ fontWeight: 600 }} />
                <Line type="monotone" dataKey="users" name="Inscrits" stroke="var(--color-brand)" strokeWidth={2.5} dot={renderSelectableDot('var(--color-brand)', userSel)} activeDot={{ r: 4, fill: 'var(--color-brand)', stroke: '#fff', strokeWidth: 1.5 }} isAnimationActive={userSel === null} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {typeof userSel === "number" && userData[userSel] && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-bg border border-border px-3 py-2 animate-fade-in">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-3">{userData[userSel].month}</p>
                <p className="text-sm font-bold text-ink mt-0.5 tabular-nums">
                  {userData[userSel].users} <span className="font-medium text-text-3 text-xs">nouvel(le)(s) inscrit(s)</span>
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
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenus abonnements vs ventes */}
        <div className="bg-bg-card rounded-[18px] border border-border p-5">
          <span className="text-[9px] font-bold uppercase tracking-widest text-text-3">Revenus</span>
          <p className="text-label text-xs text-text-3 mt-0.5">Abonnements vs ventes</p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{background:'var(--color-gold)'}} /><span className="text-[10px] text-text-3">Ventes</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{background:'var(--color-pos)'}} /><span className="text-[10px] text-text-3">Abonnements</span></div>
          </div>
          <div className="mt-3 h-48 cursor-pointer">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={revData}
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
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--color-border)', fontSize: '13px' }} labelStyle={{ fontWeight: 600 }} />
                <Line type="monotone" dataKey="ventes" name="Ventes" stroke="var(--color-gold)" strokeWidth={2.5} opacity={revSel === null || revSel.series === 'ventes' ? 1 : 0.3} dot={renderSelectableDot('var(--color-gold)', revSel && revSel.series === 'ventes' ? revSel.idx : null)} activeDot={{ r: 4, fill: 'var(--color-gold)', stroke: '#fff', strokeWidth: 1.5 }} isAnimationActive={revSel === null} />
                <Line type="monotone" dataKey="abonnements" name="Abonnements" stroke="var(--color-pos)" strokeWidth={2.5} opacity={revSel === null || revSel.series === 'abonnements' ? 1 : 0.3} dot={renderSelectableDot('var(--color-pos)', revSel && revSel.series === 'abonnements' ? revSel.idx : null)} activeDot={{ r: 4, fill: 'var(--color-pos)', stroke: '#fff', strokeWidth: 1.5 }} isAnimationActive={revSel === null} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {revSel && revData[revSel.idx] && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-bg border border-border px-3 py-2 animate-fade-in">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-3">{revData[revSel.idx].month}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-text-3">
                  <span><span className="font-bold text-gold tabular-nums">{formatCurrency(revData[revSel.idx].ventes)}</span> ventes</span>
                  <span><span className="font-bold text-pos tabular-nums">{formatCurrency(revData[revSel.idx].abonnements)}</span> abonnements</span>
                  <span><span className="font-bold text-ink tabular-nums">{formatCurrency(revData[revSel.idx].ventes + revData[revSel.idx].abonnements)}</span> total</span>
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

        {/* Top catégories */}
        <div className="bg-bg-card rounded-[18px] border border-border p-5">
          <span className="text-[9px] font-bold uppercase tracking-widest text-text-3">Catégories</span>
          <p className="text-label text-xs text-text-3 mt-0.5">Les plus utilisées</p>
          {catPieData.length > 0 ? (
            <div className="flex items-center gap-4 mt-2 h-52">
              <div className="w-36 h-36 shrink-0 cursor-pointer">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={catPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={30} onClick={(_data, index) => setCatSel((prev) => (prev === index ? null : index))}>
                      {catPieData.map((entry, i) => (
                        <Cell key={entry.name} fill={entry.color} fillOpacity={catSel === null || catSel === i ? 1 : 0.25} stroke={catSel === i ? '#fff' : 'none'} strokeWidth={catSel === i ? 2 : 0} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--color-border)', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                {catPieData.slice(0, 6).map((c, i) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setCatSel((prev) => (prev === i ? null : i))}
                    aria-pressed={catSel === i}
                    className="flex w-full items-center gap-2 text-xs text-left rounded-md px-1 -mx-1 py-1 transition-colors hover:bg-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-border"
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color, opacity: catSel !== null && catSel !== i ? 0.3 : 1 }} />
                    <span className="text-text-1 truncate flex-1">{c.name}</span>
                    <span className="text-text-3 font-medium tabular-nums">{c.value}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-3 text-center py-10">Aucune catégorie utilisée</p>
          )}
          {typeof catSel === "number" && catPieData[catSel] && (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-bg border border-border px-3 py-2 animate-fade-in">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-3">{catPieData[catSel].name}</p>
                <p className="text-sm font-bold text-ink mt-0.5 tabular-nums">
                  {catPieData[catSel].value} <span className="font-medium text-text-3 text-xs">transaction(s)</span>
                  {" · "}{catPieTotal > 0 ? Math.round((catPieData[catSel].value / catPieTotal) * 100) : 0}% des transactions
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCatSel(null)}
                aria-label="Fermer le détail"
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-text-3 hover:text-text-1 hover:bg-border transition-colors"
              >
                <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {catSel === null && catPieData.length > 0 && (
            <p className="text-[10px] text-text-3 mt-2">Cliquez sur une part pour afficher le détail.</p>
          )}
        </div>
      </div>

      {/* Répartition revenus/dépenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-bg-card rounded-[18px] border border-border p-5">
          <span className="text-[9px] font-bold uppercase tracking-widest text-text-3">Répartition Revenus/Dépenses</span>
          <p className="text-label text-xs text-text-3 mt-0.5">Ratio global (6 mois)</p>
          {pieData.length > 0 ? (
            <div className="flex items-center justify-center gap-6 mt-2 h-44">
              <div className="w-32 h-32 cursor-pointer">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} innerRadius={25} onClick={(_data, index) => setSliceSel((prev) => (prev === index ? null : index))}>
                      {pieData.map((entry, i) => (
                        <Cell key={entry.name} fill={i === 0 ? 'var(--color-pos)' : 'var(--color-neg)'} fillOpacity={sliceSel === null || sliceSel === i ? 1 : 0.25} stroke={sliceSel === i ? '#fff' : 'none'} strokeWidth={sliceSel === i ? 2 : 0} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--color-border)', fontSize: '12px' }} formatter={(value) => formatCurrency(typeof value === 'number' ? value : 0)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{background:'var(--color-pos)'}} /><span className="text-xs text-text-1">Revenus <strong className="text-pos">{formatCurrency(stats?.totalIncome || 0)}</strong></span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{background:'var(--color-neg)'}} /><span className="text-xs text-text-1">Dépenses <strong className="text-neg">{formatCurrency(stats?.totalExpense || 0)}</strong></span></div>
                <div className="text-xs text-text-3 pt-1">
                  Ratio : {totalTxValue > 0 ? Math.round(((stats?.totalIncome || 0) / totalTxValue) * 100) : 0}% / {totalTxValue > 0 ? Math.round(((stats?.totalExpense || 0) / totalTxValue) * 100) : 0}%
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-3 text-center py-10">Aucune transaction</p>
          )}
          {typeof sliceSel === "number" && pieData[sliceSel] && (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-bg border border-border px-3 py-2 animate-fade-in">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-3">{pieData[sliceSel].name}</p>
                <p className="text-sm font-bold text-ink mt-0.5 tabular-nums">
                  {formatCurrency(pieData[sliceSel].value)}
                  <span className="font-medium text-text-3 text-xs"> · {totalTxValue > 0 ? Math.round((pieData[sliceSel].value / totalTxValue) * 100) : 0}% du volume</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSliceSel(null)}
                aria-label="Fermer le détail"
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-text-3 hover:text-text-1 hover:bg-border transition-colors"
              >
                <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {sliceSel === null && pieData.length > 0 && (
            <p className="text-[10px] text-text-3 mt-2">Cliquez sur une part pour afficher le détail.</p>
          )}
        </div>

        {/* Devises */}
        <div className="bg-bg-card rounded-[18px] border border-border p-5">
          <span className="text-[9px] font-bold uppercase tracking-widest text-text-3">Devises</span>
          <p className="text-label text-xs text-text-3 mt-0.5">Répartition des utilisateurs</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {(stats?.usersByCurrency || []).map((c) => {
              const colors: Record<string, string> = { XOF: "bg-gold-light text-gold", EUR: "bg-pos-bg text-pos", USD: "bg-brand-subtle text-brand" };
              const cls = colors[c.baseCurrency] || "bg-bg text-text-1";
              return (
                <div key={c.baseCurrency} className={`flex items-center gap-2 rounded-xl px-3 py-2 ${cls}`}>
                  <span className="font-display font-bold text-lg">{c._count}</span>
                  <span className="text-sm font-semibold">{c.baseCurrency}</span>
                </div>
              );
            })}
            {(!stats?.usersByCurrency || stats.usersByCurrency.length === 0) && (
              <p className="text-sm text-text-3">Aucune donnée</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
