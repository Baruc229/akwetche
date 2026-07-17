"use client";

import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { formatCurrency } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/lib/colors";

type StatsBlock = {
  income: number; expense: number; savings: number; topCategories: Record<string, number>;
};

type ReportData = {
  period: { start: string; end: string; type: string };
  current: StatsBlock;
  previous: StatsBlock;
  evolution: { income: string | null; expense: string | null; savings: string | null };
  personal: {
    current: StatsBlock; previous: StatsBlock;
    evolution: { income: string | null; expense: string | null; savings: string | null };
  };
  activity: {
    current: StatsBlock; previous: StatsBlock;
    evolution: { income: string | null; expense: string | null; savings: string | null };
  };
  commercial: {
    revenue: number; profit: number; stockValue: number;
    productCount: number; outOfStock: number;
    mostProfitable: { name: string; total: number; quantity: number }[];
    mostSold: { name: string; total: number; quantity: number }[];
  };
  initialBalance: number;
  initialBalanceActivity: number;
};

const PERIODS = [
  { value: "weekly", label: "Cette semaine" },
  { value: "monthly", label: "Ce mois-ci" },
  { value: "yearly", label: "Cette année" },
];

function safePeriod(data: ReportData | null) {
  if (!data?.period?.start || !data?.period?.end) return null;
  try {
    const d1 = new Date(data.period.start);
    const d2 = new Date(data.period.end);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
    return { start: d1, end: d2 };
  } catch {
    return null;
  }
}

function EvolutionBadge({ value, invert }: { value: string | null; invert?: boolean }) {
  if (!value) return <span className="text-text-3 text-[11px]">—</span>;
  const num = parseFloat(value);
  const isUp = num > 0;
  const color = invert
    ? (isUp ? "text-neg" : "text-pos")
    : (isUp ? "text-pos" : "text-neg");
  return (
    <span className={`text-[11px] font-semibold ${color}`}>
      {isUp ? "+" : ""}{num.toFixed(0)}%
    </span>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState("monthly");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Bilans — Akwetche";
  }, []);

  useEffect(() => {
    let active = true;
    fetch(`/api/reports?type=${period}`)
      .then((res) => res.json())
      .then((d) => { if (active) { setData(d); setLoading(false); } })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [period]);

  const [downloading, setDownloading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  async function handleDownload() {
    setDownloading(true);
    setPdfError(null);
    try {
      const res = await fetch(`/api/reports/pdf?type=${period}`);
      if (!res.ok) {
        const msg = await res.text().catch(() => "Erreur inconnue");
        setPdfError(`Erreur ${res.status}: ${msg}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rapport-${period === "weekly" ? "hebdomadaire" : period === "yearly" ? "annuel" : "mensuel"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setPdfError(`Erreur réseau: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDownloading(false);
    }
  }

  const periodLabel = PERIODS.find(p => p.value === period)?.label || "";
  const previousLabel = period === "weekly" ? "Semaine dernière" : period === "yearly" ? "Année dernière" : "Mois dernier";

  const savingsRate = data && data.current.income > 0 ? (data.current.savings / data.current.income) * 100 : 0;
  const avgDaily = data ? data.current.expense / 30 : 0;

  function getTopExpenseLabel(categories: Record<string, number>): string {
    const entries = Object.entries(categories).sort(([, a], [, b]) => b - a);
    if (entries.length === 0) return "";
    return entries[0][0];
  }

  const hasCommercial = data && (data.commercial.revenue > 0 || data.commercial.productCount > 0);
  const hasActivity = data && (data.activity.current.income > 0 || data.activity.current.expense > 0 || data.initialBalanceActivity > 0);

  if (loading) {
    return (
      <div className="space-y-4 px-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2"><div className="h-7 w-20 bg-stone/30 rounded-lg" /><div className="h-4 w-44 bg-stone/20 rounded-lg" /></div>
          <div className="h-9 w-28 bg-stone/30 rounded-xl" />
        </div>
        <div className="flex gap-2"><div className="h-8 w-32 bg-stone/20 rounded-full" /><div className="h-8 w-28 bg-stone/20 rounded-full" /><div className="h-8 w-28 bg-stone/20 rounded-full" /></div>
        <div className="h-[200px] bg-stone/20 rounded-[18px]" />
        <div className="grid grid-cols-2 gap-3"><div className="h-24 bg-stone/20 rounded-2xl" /><div className="h-24 bg-stone/20 rounded-2xl" /><div className="h-24 bg-stone/20 rounded-2xl" /><div className="h-24 bg-stone/20 rounded-2xl" /></div>
      </div>
    );
  }

  return (
      <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-text-1">Bilans</h1>
          <p className="text-text-3 text-[12.5px] mt-0.5">Ce qui s&apos;est passé, en clair</p>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center gap-2 bg-transparent border-[1.5px] border-brand text-brand font-bold text-xs px-3 py-2 rounded-xl hover:bg-brand-subtle transition-colors no-print disabled:opacity-50"
        >
          {downloading ? (
            <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          )}
          {downloading ? "Génération..." : "Rapport"}
        </button>
      </div>

      {pdfError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700 no-print">
          {pdfError}
        </div>
      )}

      {/* Period selector */}
      <div className="flex items-center gap-1.5 no-print">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-4 py-[7px] rounded-full text-[12.5px] font-semibold transition-all ${
              period === p.value
                ? "bg-brand text-white shadow-sm"
                : "bg-transparent text-text-3 hover:text-text-1"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {data && (
        <>
          {/* Hero card */}
          <div className="card-hero">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">{periodLabel}</span>
              {(() => {
                const p = safePeriod(data);
                return p ? (
                  <span className="text-[11.5px] text-white/60">
                    {p.start.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })} → {p.end.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </span>
                ) : null;
              })()}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-medium text-white/60 mb-0.5">Reçu</p>
                <p className="font-display font-bold text-base text-pos">
                  +{formatCurrency(data.current.income)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-white/60 mb-0.5">Dépensé</p>
                <p className="font-display font-bold text-base text-neg">
                  -{formatCurrency(data.current.expense)}
                </p>
              </div>
            </div>
            <div className="mt-4 bg-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-white/70">Il vous reste</span>
              <span className="font-display font-bold text-xl text-white leading-none">
                {formatCurrency(Math.max(0, data.current.savings))}
              </span>
            </div>
          </div>

          {/* 4 KPIs with evolutions */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card-inset min-w-0 overflow-hidden">
              <div className="flex items-center justify-between">
                <p className="text-label">Volume total</p>
                <EvolutionBadge value={data.evolution.income} />
              </div>
              <p className="text-amount text-lg text-pos mt-1 truncate">{formatCurrency(data.current.income + data.current.expense)}</p>
              <p className="text-[10.5px] text-text-3 mt-0.5 truncate">Revenus + Dépenses</p>
            </div>
            <div className="card-inset min-w-0 overflow-hidden">
              <div className="flex items-center justify-between">
                <p className="text-label">Taux d&apos;épargne</p>
                <EvolutionBadge value={data.evolution.savings} invert />
              </div>
              <p className="text-amount text-lg text-pos mt-1">{savingsRate.toFixed(0)}%</p>
              <p className="text-[10.5px] text-text-3 mt-0.5 truncate">{savingsRate >= 20 ? "Excellent" : savingsRate >= 5 ? "Correct" : "Faible"}</p>
            </div>
            <div className="card-inset min-w-0 overflow-hidden">
              <div className="flex items-center justify-between">
                <p className="text-label">Moyenne / jour</p>
                <EvolutionBadge value={data.evolution.expense} invert />
              </div>
              <p className="text-amount text-lg text-gold mt-1 truncate">{formatCurrency(avgDaily)}</p>
              <p className="text-[10.5px] text-text-3 mt-0.5 truncate">Dépense quotidienne</p>
            </div>
            <div className="card-inset min-w-0 overflow-hidden">
              <p className="text-label">Plus gros poste</p>
              <p className="text-amount text-lg text-ink mt-1 truncate leading-tight">
                {getTopExpenseLabel(data.current.topCategories) || "—"}
              </p>
              <p className="text-[10.5px] text-text-3 mt-0.5 truncate">Catégorie principale</p>
            </div>
          </div>

          {/* Activité commerciale */}
          {hasCommercial && (
            <div className="bg-bg-card rounded-[18px] border border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gold">
                  <circle cx="12" cy="12" r="10" /><path d="M16 8l-8 8M8.5 8.5l7 7" />
                </svg>
                <h2 className="text-sm font-semibold text-ink">Activité commerciale</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-bg rounded-xl p-3">
                  <p className="text-[10px] text-text-3 mb-0.5">Chiffre d&apos;affaires</p>
                  <p className="font-semibold text-gold text-sm">{formatCurrency(data.commercial.revenue)}</p>
                </div>
                <div className="bg-bg rounded-xl p-3">
                  <p className="text-[10px] text-text-3 mb-0.5">Profit</p>
                  <p className="font-semibold text-pos text-sm">{formatCurrency(data.commercial.profit)}</p>
                </div>
                <div className="bg-bg rounded-xl p-3">
                  <p className="text-[10px] text-text-3 mb-0.5">Valeur stock</p>
                  <p className="font-semibold text-text-1 text-sm">{formatCurrency(data.commercial.stockValue)}</p>
                </div>
                <div className="bg-bg rounded-xl p-3">
                  <p className="text-[10px] text-text-3 mb-0.5">Produits</p>
                  <p className="font-semibold text-text-1 text-sm">{data.commercial.productCount}</p>
                </div>
                <div className="bg-bg rounded-xl p-3">
                  <p className="text-[10px] text-text-3 mb-0.5">Ruptures de stock</p>
                  <p className="font-semibold text-neg text-sm">{data.commercial.outOfStock}</p>
                </div>
              </div>

              {data.commercial.mostProfitable.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] text-text-3 uppercase tracking-widest font-semibold mb-2">Les plus rentables</p>
                  <div className="space-y-2">
                    {data.commercial.mostProfitable.slice(0, 3).map((p) => (
                      <div key={p.name} className="flex items-center justify-between bg-bg rounded-xl px-3 py-2">
                        <div>
                          <p className="text-sm font-semibold text-text-1">{p.name}</p>
                          <p className="text-[10.5px] text-text-3">{p.quantity} vendu{p.quantity > 1 ? "s" : ""}</p>
                        </div>
                        <p className="text-sm font-bold text-pos">{formatCurrency(p.total)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.commercial.mostSold.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] text-text-3 uppercase tracking-widest font-semibold mb-2">Les plus vendus</p>
                  <div className="space-y-2">
                    {data.commercial.mostSold.slice(0, 3).map((p) => (
                      <div key={p.name} className="flex items-center justify-between bg-bg rounded-xl px-3 py-2">
                        <div>
                          <p className="text-sm font-semibold text-text-1">{p.name}</p>
                          <p className="text-[10.5px] text-text-3">{formatCurrency(p.total)} CA</p>
                        </div>
                        <p className="text-sm font-bold text-ink">{p.quantity} vendu{p.quantity > 1 ? "s" : ""}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Situation financière */}
          <div className="bg-bg-card rounded-[18px] border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              <h2 className="text-sm font-semibold text-ink">Situation financière</h2>
            </div>

            {/* Personnel */}
            <div className={hasActivity ? "mb-4" : ""}>
              <div className="flex items-center gap-2 pb-2 mb-3 border-b border-border">
                <span className="text-[9.5px] font-bold uppercase tracking-widest text-text-3">Personnel</span>
                {data.personal.evolution.income && (
                  <span className="ml-auto text-[10px] text-text-3">
                    Évolution revenus : <EvolutionBadge value={data.personal.evolution.income} />
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="bg-bg rounded-xl p-3">
                  <p className="text-[10px] text-text-3 mb-0.5">Capital de départ</p>
                  <p className="font-semibold text-text-3 text-sm">{formatCurrency(data.initialBalance)}</p>
                </div>
                <div className="bg-bg rounded-xl p-3">
                  <p className="text-[10px] text-text-3 mb-0.5">Reçu</p>
                  <p className="font-semibold text-pos text-sm">+{formatCurrency(data.personal.current.income)}</p>
                </div>
                <div className="col-span-2 sm:col-span-1 mx-auto sm:mx-0 w-full bg-bg rounded-xl p-3">
                  <p className="text-[10px] text-text-3 mb-0.5">Solde</p>
                  <p className="font-bold text-text-1 text-sm">
                    {formatCurrency(data.initialBalance + data.personal.current.savings)}
                  </p>
                </div>
              </div>
            </div>

            {/* Activité */}
            {hasActivity && (
              <div>
                <div className="flex items-center gap-2 pb-2 mb-3 border-b border-border">
                  <span className="text-[9.5px] font-bold uppercase tracking-widest text-gold">Activité</span>
                  {data.activity.evolution.income && (
                    <span className="ml-auto text-[10px] text-text-3">
                      Évolution revenus : <EvolutionBadge value={data.activity.evolution.income} />
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="bg-bg rounded-xl p-3">
                    <p className="text-[10px] text-text-3 mb-0.5">Capital de départ</p>
                    <p className="font-semibold text-text-3 text-sm">{formatCurrency(data.initialBalanceActivity)}</p>
                  </div>
                  <div className="bg-bg rounded-xl p-3">
                    <p className="text-[10px] text-text-3 mb-0.5">Reçu</p>
                    <p className="font-semibold text-pos text-sm">+{formatCurrency(data.activity.current.income)}</p>
                  </div>
                  <div className="col-span-2 sm:col-span-1 mx-auto sm:mx-0 w-full bg-bg rounded-xl p-3">
                    <p className="text-[10px] text-text-3 mb-0.5">Solde</p>
                    <p className="font-bold text-text-1 text-sm">
                      {formatCurrency(data.initialBalanceActivity + data.activity.current.savings)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Comparison table with evolutions */}
          <div className="bg-bg-card rounded-[18px] border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand">
                <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <h2 className="text-sm font-semibold text-ink">Comparaison</h2>
            </div>
            <div className="sm:hidden space-y-3">
              {[
                { label: "Revenus", current: data.current.income, previous: data.previous.income, currentColor: "text-text-1", previousColor: "text-text-3", evolution: data.evolution.income, invert: false },
                { label: "Dépenses", current: data.current.expense, previous: data.previous.expense, currentColor: "text-neg", previousColor: "text-text-3", evolution: data.evolution.expense, invert: true },
              ].map((r) => (
                <div key={r.label} className="py-2 border-b border-border">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[11.5px] font-semibold text-text-1">{r.label}</p>
                    <EvolutionBadge value={r.evolution} invert={r.invert} />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-3">{periodLabel} :</span>
                    <span className={`font-semibold ${r.currentColor}`}>{formatCurrency(r.current)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-0.5">
                    <span className="text-text-3">{previousLabel} :</span>
                    <span className={`text-text-3 ${r.previousColor}`}>{formatCurrency(r.previous)}</span>
                  </div>
                </div>
              ))}
              <div className="py-2 rounded-xl px-3" style={{ backgroundColor: "var(--color-surface-raised)" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11.5px] font-semibold text-text-1">Épargne</p>
                  <EvolutionBadge value={data.evolution.savings} invert />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-3">{periodLabel} :</span>
                  <span className="font-bold text-pos">{formatCurrency(Math.max(0, data.current.savings))}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-0.5">
                  <span className="text-text-3">{previousLabel} :</span>
                  <span className="text-text-3">{formatCurrency(Math.max(0, data.previous.savings))}</span>
                </div>
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="grid grid-cols-4 gap-2 sm:gap-3 pb-2 border-b border-border">
                  <span className="text-label">Libellé</span>
                  <span className="text-label text-right">{periodLabel}</span>
                  <span className="text-label text-right">{previousLabel}</span>
                  <span className="text-label text-right">Évolution</span>
                </div>
                {/* Revenus */}
                <div className="grid grid-cols-4 gap-2 sm:gap-3 py-3 border-t border-border" style={{ backgroundColor: "var(--color-surface-raised)" }}>
                  <span className="text-sm text-ink pl-3">Revenus</span>
                  <span className="text-sm font-semibold text-ink text-right truncate">{formatCurrency(data.current.income)}</span>
                  <span className="text-sm text-muted text-right truncate">{formatCurrency(data.previous.income)}</span>
                  <span className="text-right"><EvolutionBadge value={data.evolution.income} /></span>
                </div>
                {/* Dépenses */}
                <div className="grid grid-cols-4 gap-2 sm:gap-3 py-3 border-t border-border">
                  <span className="text-sm text-ink">Dépenses</span>
                  <span className="text-sm font-semibold text-neg text-right truncate">{formatCurrency(data.current.expense)}</span>
                  <span className="text-sm text-muted text-right truncate">{formatCurrency(data.previous.expense)}</span>
                  <span className="text-right"><EvolutionBadge value={data.evolution.expense} invert /></span>
                </div>
                {/* Épargne */}
                <div className="grid grid-cols-4 gap-2 sm:gap-3 py-3 mt-1 rounded-xl" style={{ backgroundColor: "var(--color-surface-raised)" }}>
                  <span className="text-sm font-semibold text-ink pl-3">Épargne</span>
                  <span className="text-sm font-bold text-pos text-right truncate pr-3">
                    {formatCurrency(Math.max(0, data.current.savings))}
                  </span>
                  <span className="text-sm text-muted text-right truncate pr-3">
                    {formatCurrency(Math.max(0, data.previous.savings))}
                  </span>
                  <span className="text-right"><EvolutionBadge value={data.evolution.savings} invert /></span>
                </div>
            </div>
          </div>

          {/* Category breakdown */}
          {Object.keys(data.current.topCategories).length > 0 && (
            <div className="bg-bg-card rounded-[18px] border border-border p-5">
              <div className="flex items-center gap-2 mb-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-3">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
                <h2 className="text-sm font-semibold text-text-1">Où est passé votre argent ?</h2>
              </div>
              <p className="text-xs text-text-3 mb-4">Répartition par catégorie</p>
              <div>
                {Object.entries(data.current.topCategories)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, amount], i) => {
                    const total = data.current.expense || 1;
                    const pct = (amount / total) * 100;
                    const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                    return (
                      <div className="bar-row" key={cat}>
                        <div className="bar-head">
                          <span className="bar-label">
                            <span className="bar-dot" style={{ backgroundColor: color }} />
                            {cat}
                          </span>
                          <span className="bar-value">
                            {formatCurrency(amount)}
                            <span className="pct">({pct.toFixed(0)}%)</span>
                          </span>
                        </div>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Link to transactions */}
          <div className="flex justify-center no-print pt-2">
            <a
              href="/dashboard/transactions"
              className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-brand hover:opacity-80 transition-opacity"
            >
              Voir le détail des transactions
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="w-3.5 h-3.5" />
            </a>
          </div>
        </>
      )}
    </div>
  );
}
