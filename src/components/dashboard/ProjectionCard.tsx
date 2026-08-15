"use client";

import { useMemo } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation, faCircleInfo, faArrowDown, faArrowUp, faChartLine } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from "@/lib/utils";
import { Line, XAxis, ResponsiveContainer, Tooltip, Area, ComposedChart, ReferenceLine } from 'recharts';

type DailyBalance = { date: string; balance: number };

type Props = {
  projectedRemaining: number;
  dailyAvgExpense: number;
  daysLeft: number;
  dailyBalances?: DailyBalance[];
  initialBalanceMissing?: boolean;
  totalBalance?: number;
  pendingRecurringExpense?: number;
  pendingRecurringIncome?: number;
};

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

type PointKind = "past" | "today" | "future";

type ChartPoint = {
  label: string;
  dateLabel: string;
  kind: PointKind;
  pastValue: number | null;
  futureValue: number | null;
  optimistic: number | null;
  pessimistic: number | null;
  band: number | null;
};

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; payload?: ChartPoint }> }) {
  if (!active || !payload || payload.length === 0) return null;
  const main = payload.find(p => (p.dataKey === "futureValue" || p.dataKey === "pastValue") && typeof p.value === "number" && Number.isFinite(p.value));
  if (!main) return null;
  const point = main.payload;
  const isToday = point?.kind === "today";
  const isFuture = point?.kind === "future";
  const title = isToday
    ? `Aujourd'hui — ${point?.dateLabel ?? ""}`
    : isFuture
      ? `Projection — ${point?.dateLabel ?? ""}`
      : `Solde réel — ${point?.dateLabel ?? ""}`;
  const value = main.value;
  const color = value < 0 ? '#B94A3E' : '#0D7A4B';
  return (
    <div className="bg-white rounded-xl px-3 py-2 shadow-lg border border-gray-100 text-xs">
      <p className="font-semibold text-[#1A2744] mb-0.5">{title}</p>
      <p className="text-amount text-sm" style={{ color }}>
        {formatCurrency(value)}
      </p>
      {isFuture && point?.optimistic != null && point?.pessimistic != null && (
        <p className="text-[10px] text-[#94A3B8] mt-0.5">
          Fourchette : {formatCurrency(point.pessimistic)} – {formatCurrency(point.optimistic)}
        </p>
      )}
    </div>
  );
}

export default function ProjectionCard({ projectedRemaining, dailyAvgExpense, daysLeft, dailyBalances, initialBalanceMissing, totalBalance = 0, pendingRecurringExpense = 0, pendingRecurringIncome = 0 }: Props) {
  const isNegative = projectedRemaining < 0;
  const hasBreakdown = pendingRecurringExpense > 0 || pendingRecurringIncome > 0;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const dayOfMonth = now.getDate();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const heroLabel = dayOfMonth === lastDayOfMonth
    ? "Solde estimé aujourd'hui"
    : `Solde estimé au ${lastDayOfMonth} ${MOIS[month]}`;

  const chartColor = projectedRemaining >= 0 ? '#0D7A4B' : '#B94A3E';

  const chartData = useMemo<ChartPoint[]>(() => {
    const data: ChartPoint[] = [];

    if (dailyBalances && dailyBalances.length > 0) {
      const startOfMonth = new Date(year, month, 1);
      const monthDays = dailyBalances.filter(d => new Date(d.date) >= startOfMonth);
      for (const d of monthDays) {
        const dt = new Date(d.date);
        const dayNum = dt.getDate();
        data.push({
          label: d.date,
          dateLabel: `${dayNum} ${MOIS[dt.getMonth()]}`,
          kind: "past",
          pastValue: d.balance,
          futureValue: null,
          optimistic: null,
          pessimistic: null,
          band: null,
        });
      }
    }

    if (data.length > 0) {
      data[data.length - 1].futureValue = data[data.length - 1].pastValue;
      data[data.length - 1].kind = "today";
    }

    const dailyAvgPonctuel = dayOfMonth > 0 ? (totalBalance - (dailyBalances && dailyBalances.length > 0 ? dailyBalances[dailyBalances.length - 1].balance : totalBalance) + pendingRecurringExpense - pendingRecurringIncome) / dayOfMonth : dailyAvgExpense;

    const base = (data.length > 0 ? data[data.length - 1].pastValue : totalBalance) ?? totalBalance;

    for (let i = 1; i <= daysLeft; i++) {
      const futureDate = new Date(year, month, dayOfMonth + i);
      const dayNum = futureDate.getDate();
      const futureLabel = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      const dailyDrop = dailyAvgPonctuel > 0 ? dailyAvgPonctuel * i : 0;
      const futureVal = base - pendingRecurringExpense - dailyDrop + pendingRecurringIncome;
      const optVal = base - pendingRecurringExpense * 0.7 - dailyDrop * 0.75 + pendingRecurringIncome * 1.1;
      const pessVal = base - pendingRecurringExpense * 1.3 - dailyDrop * 1.25 + pendingRecurringIncome * 0.9;

      data.push({
        label: futureLabel,
        dateLabel: `${dayNum} ${MOIS[futureDate.getMonth()]}`,
        kind: "future",
        pastValue: null,
        futureValue: futureVal,
        optimistic: optVal,
        pessimistic: pessVal,
        band: optVal - pessVal,
      });
    }

    return data;
  }, [dailyBalances, year, month, dayOfMonth, daysLeft, totalBalance, dailyAvgExpense, pendingRecurringExpense, pendingRecurringIncome]);

  const isLimitedHistory = useMemo(() => {
    if (chartData.length <= 3) return true;
    let changes = 0;
    for (let i = 1; i < chartData.length; i++) {
      if (chartData[i].pastValue !== null && chartData[i - 1].pastValue !== null && chartData[i].pastValue !== chartData[i - 1].pastValue) changes++;
    }
    return changes < 2;
  }, [chartData]);

  const isEmptyState = (!dailyBalances || dailyBalances.length === 0) && totalBalance === 0 && pendingRecurringExpense === 0 && pendingRecurringIncome === 0;

  const hasPastPoint = chartData.length > 0 && (chartData[0].kind === "past" || chartData[0].kind === "today");
  const todayPoint = chartData.find(p => p.kind === "today");
  const todayLabel = todayPoint?.label ?? null;
  const firstLabel = chartData.length > 0 ? chartData[0].label : null;
  const lastLabel = chartData.length > 0 ? chartData[chartData.length - 1].label : null;

  const tickValues = ((): string[] => {
    if (chartData.length === 0) return [];
    const anchors = hasPastPoint
      ? [firstLabel, todayLabel, lastLabel]
      : [firstLabel, lastLabel];
    return Array.from(new Set(anchors.filter((v): v is string => Boolean(v))));
  })();

  const tickFormatter = (value: string) => {
    if (value === lastLabel) return "Fin de mois";
    if (value === todayLabel) return "Aujourd'hui";
    if (value === firstLabel) return hasPastPoint ? "Début" : "Aujourd'hui";
    return "";
  };

  const delta = Math.abs(projectedRemaining - totalBalance);
  const isDeltaUp = projectedRemaining >= totalBalance;

  return (
    <div className="bg-white rounded-[18px] p-5 overflow-hidden">
      {/* En-tête */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-[#C9A84C] shrink-0" />
        <h2 className="text-sm font-semibold text-[#1A2744]">
          Projection
        </h2>
      </div>
      <p className="text-xs text-[#94A3B8] mb-4">Votre trajectoire jusqu&apos;à la fin du mois</p>

      {isEmptyState ? (
        <div className="text-center py-8">
          <div className="w-10 h-10 bg-[#F1F5F9] rounded-xl flex items-center justify-center mx-auto mb-3">
            <FontAwesomeIcon icon={faChartLine} className="w-4 h-4 text-[#1A2744]" />
          </div>
          <p className="text-sm font-semibold text-[#1A2744]">Pas encore assez de données pour projeter votre solde.</p>
          <p className="text-xs text-[#94A3B8] mt-1 mb-3">Enregistrez vos premières opérations : la projection apparaîtra ici.</p>
          <Link href="/dashboard/transactions" className="text-xs font-semibold text-[#1B3A6B] underline underline-offset-2">
            Enregistrer une opération
          </Link>
        </div>
      ) : (
        <>
          {/* Hero : solde estimé */}
          <div
            className="rounded-xl p-4 border-l-[3px] animate-fade-in"
            style={{ background: isNegative ? '#FEF2F2' : '#E6F7EF', borderColor: isNegative ? '#B94A3E' : '#0D7A4B' }}
          >
            <p className="text-xs text-[#94A3B8] mb-1">{heroLabel}</p>
            <p
              className="text-amount text-4xl animate-fade-in"
              style={{ color: isNegative ? '#B94A3E' : '#0D7A4B' }}
            >
              {formatCurrency(projectedRemaining)}
            </p>
            {totalBalance !== 0 && (
              <span
                title="Différence entre votre solde actuel et le solde estimé à la fin du mois."
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full mt-1.5"
                style={{ background: isDeltaUp ? 'rgba(13,122,75,0.12)' : 'rgba(185,74,62,0.12)', color: isDeltaUp ? '#0D7A4B' : '#B94A3E' }}
              >
                <FontAwesomeIcon icon={isDeltaUp ? faArrowUp : faArrowDown} className="w-2.5 h-2.5" />
                {isDeltaUp ? '+' : '−'}{formatCurrency(delta)}{" d'ici la fin du mois"}
              </span>
            )}
            <p className="text-[11px] text-[#94A3B8] mt-2 leading-relaxed">
              Selon votre rythme de dépenses actuel et vos opérations récurrentes à venir.
            </p>
          </div>

          {isNegative && (
            <div className="alert-inline neg mt-3">
              <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                {hasBreakdown
                  ? "Vos opérations récurrentes prévues dépassent votre solde actuel. Votre solde pourrait passer en négatif avant la fin du mois. "
                  : "À ce rythme de dépenses, votre solde pourrait passer en négatif avant la fin du mois."}
                {hasBreakdown && (
                  <Link href="/dashboard/recurring/expenses" className="font-semibold underline text-[#1B3A6B]">
                    Voir mes opérations récurrentes
                  </Link>
                )}
              </p>
            </div>
          )}

          {initialBalanceMissing && (
            <div className="alert-inline warn mt-3">
              <FontAwesomeIcon icon={faCircleInfo} className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                Solde de départ non renseigné : la projection reflète uniquement vos opérations enregistrées.{" "}
                <Link href="/dashboard/settings" className="font-semibold underline text-[#1B3A6B]">
                  Ajouter mon solde de départ
                </Link>
              </p>
            </div>
          )}

          {/* Graphe + légende */}
          {chartData.length > 0 && (
            <div className="mt-4">
              <div
                className="h-[140px] mb-2"
                role="img"
                aria-label="Trajectoire de votre solde jusqu'à la fin du mois"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                    <defs>
                      <linearGradient id="projBand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F5A623" stopOpacity={0.10} />
                        <stop offset="100%" stopColor="#F5A623" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="label"
                      ticks={tickValues}
                      tickFormatter={tickFormatter}
                      tick={{ fontSize: 9, fill: '#94A3B8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={false} />
                    <Area
                      type="monotone"
                      dataKey="pessimistic"
                      stackId="band"
                      stroke="none"
                      fill="transparent"
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="band"
                      stackId="band"
                      stroke="none"
                      fill="url(#projBand)"
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="pastValue"
                      stroke="#1A2744"
                      strokeWidth={2}
                      dot={{ fill: '#1A2744', strokeWidth: 0, r: 2.5 }}
                      activeDot={{ r: 4, fill: '#1A2744', stroke: '#fff', strokeWidth: 1.5 }}
                      connectNulls={false}
                      isAnimationActive={true}
                      animationDuration={800}
                    />
                    <Line
                      type="monotone"
                      dataKey="futureValue"
                      stroke={chartColor}
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      opacity={isLimitedHistory ? 0.65 : 1}
                      dot={{ fill: chartColor, strokeWidth: 0, r: 2, opacity: 0.5 }}
                      activeDot={{ r: 4, fill: chartColor, stroke: '#fff', strokeWidth: 1.5 }}
                      connectNulls={false}
                      isAnimationActive={true}
                      animationDuration={800}
                      animationBegin={400}
                    />
                    {hasPastPoint && todayLabel && (
                      <ReferenceLine
                        x={todayLabel}
                        stroke="#F5A623"
                        strokeWidth={1}
                        strokeOpacity={0.5}
                        label={{ value: "Aujourd'hui", fontSize: 9, fill: '#94A3B8', position: 'insideTopRight' }}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#1A2744] shrink-0" />
                  <span className="text-[10px] text-[#94A3B8]">Solde réel</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: chartColor }} />
                  <span className="text-[10px] text-[#94A3B8]">Projection</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#F5A623] shrink-0" />
                  <span className="text-[10px] text-[#94A3B8]">Fourchette estimée</span>
                </span>
              </div>

              {isLimitedHistory && (
                <div className="alert-inline warn mt-3" style={{ padding: '8px 12px' }}>
                  <FontAwesomeIcon icon={faCircleInfo} className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <p>
                    Encore peu de données. Enregistrez vos opérations quelques jours de plus : la projection deviendra plus fiable.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Récurrents prévus d'ici la fin du mois */}
          {hasBreakdown && (
            <div className="mt-4">
              <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">
                DÉJÀ PRÉVU D&apos;ICI LA FIN DU MOIS
              </p>
              <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
                {pendingRecurringExpense > 0 && (
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <span className="text-xs text-[#94A3B8] flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faArrowDown} className="w-2.5 h-2.5 text-[#B94A3E]" />
                      Dépenses récurrentes prévues
                    </span>
                    <span className="text-sm font-bold text-[#B94A3E] tabular-nums">−{formatCurrency(pendingRecurringExpense)}</span>
                  </div>
                )}
                {pendingRecurringIncome > 0 && (
                  <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-[#E2E8F0]">
                    <span className="text-xs text-[#94A3B8] flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faArrowUp} className="w-2.5 h-2.5 text-[#0D7A4B]" />
                      Revenus récurrents prévus
                    </span>
                    <span className="text-sm font-bold text-[#0D7A4B] tabular-nums">+{formatCurrency(pendingRecurringIncome)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-[#F1F5F9] rounded-xl p-3">
          <p className="text-[10px] text-[#94A3B8]">Dépense moyenne / jour</p>
          <p className="text-amount text-sm text-[#1A2744] mt-0.5 tabular-nums">
            {formatCurrency(dailyAvgExpense)}
          </p>
        </div>
        <div className="bg-[#F1F5F9] rounded-xl p-3">
          <p className="text-[10px] text-[#94A3B8]">Jours restants</p>
          <p className="text-amount text-sm text-[#1A2744] mt-0.5">
            {daysLeft}
          </p>
        </div>
      </div>
    </div>
  );
}
