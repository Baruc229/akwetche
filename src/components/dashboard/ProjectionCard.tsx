"use client";

import { useMemo } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation, faCircleInfo, faArrowDown, faArrowUp } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from "@/lib/utils";
import { Line, XAxis, ResponsiveContainer, Tooltip, Area, ComposedChart } from 'recharts';

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

type ChartPoint = {
  day: number;
  label: string;
  pastValue: number | null;
  futureValue: number | null;
  optimistic: number | null;
  pessimistic: number | null;
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const main = payload.find(p => p.dataKey === "futureValue" || p.dataKey === "pastValue");
  if (!main) return null;
  return (
    <div className="bg-white rounded-xl px-3 py-2 shadow-lg border border-gray-100 text-xs">
      <p className="font-semibold text-[#1A2744] mb-0.5">Jour {label}</p>
      <p className="font-bold" style={{ color: main.value < 0 ? '#B94A3E' : '#0D7A4B' }}>
        {formatCurrency(main.value)}
      </p>
    </div>
  );
}

export default function ProjectionCard({ projectedRemaining, dailyAvgExpense, daysLeft, dailyBalances, initialBalanceMissing, totalBalance = 0, pendingRecurringExpense = 0, pendingRecurringIncome = 0 }: Props) {
  const isNegative = projectedRemaining < 0;
  const dayOfMonth = new Date().getDate();
  const hasBreakdown = pendingRecurringExpense > 0 || pendingRecurringIncome > 0;

  const lastRealBalance = dailyBalances && dailyBalances.length > 0
    ? dailyBalances[dailyBalances.length - 1].balance
    : projectedRemaining + (dailyAvgExpense * daysLeft);

  const chartColor = projectedRemaining >= lastRealBalance ? '#0D7A4B' : '#B94A3E';

  const chartData = useMemo<ChartPoint[]>(() => {
    const data: ChartPoint[] = [];

    if (dailyBalances && dailyBalances.length > 0) {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const monthDays = dailyBalances.filter(d => new Date(d.date) >= startOfMonth);
      for (const d of monthDays) {
        const dayNum = new Date(d.date).getDate();
        data.push({ day: dayNum, label: `${dayNum}`, pastValue: d.balance, futureValue: null, optimistic: null, pessimistic: null });
      }
    }

    if (data.length > 0) {
      data[data.length - 1].futureValue = data[data.length - 1].pastValue;
    }

    const dailyAvgPonctuel = dayOfMonth > 0 ? (totalBalance - (dailyBalances && dailyBalances.length > 0 ? dailyBalances[dailyBalances.length - 1].balance : totalBalance) + pendingRecurringExpense - pendingRecurringIncome) / dayOfMonth : dailyAvgExpense;

    const base = (data.length > 0 ? data[data.length - 1].pastValue : totalBalance) ?? totalBalance;

    for (let i = 1; i <= daysLeft; i++) {
      const futureDay = dayOfMonth + i;
      const dailyDrop = dailyAvgPonctuel > 0 ? dailyAvgPonctuel * i : 0;
      const futureVal = base - pendingRecurringExpense - dailyDrop + pendingRecurringIncome;
      const optVal = base - pendingRecurringExpense * 0.7 - dailyDrop * 0.75 + pendingRecurringIncome * 1.1;
      const pessVal = base - pendingRecurringExpense * 1.3 - dailyDrop * 1.25 + pendingRecurringIncome * 0.9;

      data.push({
        day: futureDay,
        label: `${daysLeft - i + 1}j`,
        pastValue: null,
        futureValue: futureVal,
        optimistic: optVal,
        pessimistic: pessVal,
      });
    }

    return data;
  }, [dailyBalances, dayOfMonth, daysLeft, totalBalance, dailyAvgExpense, pendingRecurringExpense, pendingRecurringIncome]);

  const isLimitedHistory = useMemo(() => {
    if (chartData.length <= 3) return true;
    let changes = 0;
    for (let i = 1; i < chartData.length; i++) {
      if (chartData[i].pastValue !== null && chartData[i - 1].pastValue !== null && chartData[i].pastValue !== chartData[i - 1].pastValue) changes++;
    }
    return changes < 2;
  }, [chartData]);

  const xInterval = Math.max(0, Math.floor(chartData.length / 5));

  return (
    <div className="bg-white rounded-[18px] p-5 overflow-hidden">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-[#B94A3E] shrink-0" />
        <h2 className="text-sm font-[family-name:var(--font-inter)] font-semibold text-[#1A2744]">
          Projection
        </h2>
      </div>
      <p className="text-xs text-[#94A3B8] mb-4 font-[family-name:var(--font-inter)]">Estimation jour par jour</p>

      <div className="h-[80px] mb-3 overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="projOptimistic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0D7A4B" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#0D7A4B" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="projPessimistic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#B94A3E" stopOpacity={0.02} />
                <stop offset="100%" stopColor="#B94A3E" stopOpacity={0.12} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              interval={xInterval}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Area
              type="monotone"
              dataKey="optimistic"
              stroke="none"
              fill="url(#projOptimistic)"
              connectNulls={false}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="pessimistic"
              stroke="none"
              fill="url(#projPessimistic)"
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="pastValue"
              stroke={chartColor}
              strokeWidth={2.5}
              dot={{ fill: chartColor, strokeWidth: 0, r: 2.5 }}
              activeDot={{ r: 4, fill: chartColor, stroke: '#fff', strokeWidth: 1.5 }}
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
              dot={{ fill: chartColor, strokeWidth: 0, r: 2, opacity: 0.5 }}
              activeDot={{ r: 4, fill: chartColor, stroke: '#fff', strokeWidth: 1.5 }}
              connectNulls={false}
              isAnimationActive={true}
              animationDuration={800}
              animationBegin={400}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {isLimitedHistory && (
        <p className="text-[11px] text-[#94A3B8] font-[family-name:var(--font-inter)] text-center mb-3 leading-relaxed italic">
          Historique limité — la projection s&apos;affine à mesure que vous utilisez l&apos;application.
        </p>
      )}

      {hasBreakdown && (
        <div className="mb-3 rounded-xl border border-[#E2E8F0] overflow-hidden">
          {pendingRecurringExpense > 0 && (
            <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-[#E2E8F0]">
              <span className="text-xs text-[#94A3B8] font-[family-name:var(--font-inter)] flex items-center gap-1.5">
                <FontAwesomeIcon icon={faArrowDown} className="w-2.5 h-2.5 text-[#B94A3E]" />
                Dépenses récurrentes en attente
              </span>
              <span className="text-sm font-[family-name:var(--font-dm-sans)] font-bold text-[#B94A3E] tabular-nums">-{formatCurrency(pendingRecurringExpense)}</span>
            </div>
          )}
          {pendingRecurringIncome > 0 && (
            <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-[#E2E8F0]">
              <span className="text-xs text-[#94A3B8] font-[family-name:var(--font-inter)] flex items-center gap-1.5">
                <FontAwesomeIcon icon={faArrowUp} className="w-2.5 h-2.5 text-[#0D7A4B]" />
                Revenus récurrents en attente
              </span>
              <span className="text-sm font-[family-name:var(--font-dm-sans)] font-bold text-[#0D7A4B] tabular-nums">+{formatCurrency(pendingRecurringIncome)}</span>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl p-4 border-l-[3px]" style={{ background: isNegative ? '#FCECEA' : '#E6F7EF', borderColor: isNegative ? '#B94A3E' : '#0D7A4B' }}>
        <p className="text-xs text-[#94A3B8] mb-1 font-[family-name:var(--font-inter)]">Solde estimé</p>
        <p
          className="text-2xl font-[family-name:var(--font-dm-sans)] font-bold"
          style={{ letterSpacing: "-0.5px", color: isNegative ? '#B94A3E' : '#0D7A4B' }}
        >
          {formatCurrency(projectedRemaining)}
        </p>
      </div>

      {isNegative && (
        <div className="flex items-start gap-2 mt-3">
          <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 text-[#B94A3E] shrink-0 mt-0.5" />
          <p className="text-xs text-[#B94A3E] font-[family-name:var(--font-inter)]">
            {hasBreakdown
              ? "Vos dépenses récurrentes en attente dépassent votre solde actuel."
              : "Vous dépensez plus que votre budget disponible."}
          </p>
        </div>
      )}

      {initialBalanceMissing && (
        <div className="flex items-start gap-2 mt-3">
          <FontAwesomeIcon icon={faCircleInfo} className="w-3.5 h-3.5 text-[#C9A84C] shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#94A3B8] font-[family-name:var(--font-inter)] leading-relaxed">
            Solde de départ non renseigné — cette estimation reflète uniquement vos revenus et dépenses enregistrés.
            Ajoutez votre solde de départ dans les paramètres pour une projection plus précise.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-[#F1F5F9] rounded-xl p-3">
          <p className="text-[10px] text-[#94A3B8] font-[family-name:var(--font-inter)]">Moy./jour</p>
          <p className="text-sm font-[family-name:var(--font-dm-sans)] font-bold text-[#1A2744] mt-0.5 tabular-nums">
            {formatCurrency(dailyAvgExpense)}
          </p>
        </div>
        <div className="bg-[#F1F5F9] rounded-xl p-3">
          <p className="text-[10px] text-[#94A3B8] font-[family-name:var(--font-inter)]">Jours restants</p>
          <p className="text-sm font-[family-name:var(--font-dm-sans)] font-bold text-[#1A2744] mt-0.5">
            {daysLeft}
          </p>
        </div>
      </div>
    </div>
  );
}
