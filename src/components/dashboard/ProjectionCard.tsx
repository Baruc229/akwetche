"use client";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation, faCircleInfo, faArrowDown, faArrowUp } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from "@/lib/utils";
import { LineChart, Line, XAxis, ResponsiveContainer, Tooltip } from 'recharts';

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

export default function ProjectionCard({ projectedRemaining, dailyAvgExpense, daysLeft, dailyBalances, initialBalanceMissing, totalBalance = 0, pendingRecurringExpense = 0, pendingRecurringIncome = 0 }: Props) {
  const isNegative = projectedRemaining < 0;
  const dayOfMonth = new Date().getDate();
  const hasBreakdown = pendingRecurringExpense > 0 || pendingRecurringIncome > 0;

  const lastRealBalance = dailyBalances && dailyBalances.length > 0
    ? dailyBalances[dailyBalances.length - 1].balance
    : projectedRemaining + (dailyAvgExpense * daysLeft);

  const chartColor = projectedRemaining >= lastRealBalance ? '#2D5A27' : '#B94A3E';

  const chartData: { day: number; pastValue: number | null; futureValue: number | null; label: string }[] = [];

  if (dailyBalances && dailyBalances.length > 0) {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthDays = dailyBalances.filter(d => new Date(d.date) >= startOfMonth);
    for (const d of monthDays) {
      const dayNum = new Date(d.date).getDate();
      chartData.push({ day: dayNum, pastValue: d.balance, futureValue: null, label: `${dayNum}` });
    }
  }

  if (chartData.length > 0) {
    chartData[chartData.length - 1].futureValue = chartData[chartData.length - 1].pastValue;
  }

  const futureDay = dayOfMonth + daysLeft;
  if (futureDay > dayOfMonth) {
    chartData.push({ day: futureDay, pastValue: null, futureValue: projectedRemaining, label: `${futureDay}` });
  }

  const isLimitedHistory = (() => {
    if (chartData.length <= 3) return true;
    let changes = 0;
    for (let i = 1; i < chartData.length; i++) {
      if (chartData[i].pastValue !== null && chartData[i - 1].pastValue !== null && chartData[i].pastValue !== chartData[i - 1].pastValue) changes++;
    }
    return changes < 2;
  })();

  return (
    <div className="bg-white rounded-[18px] p-5 overflow-hidden">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-[#B94A3E] shrink-0" />
        <h2 className="text-sm font-[family-name:var(--font-inter)] font-semibold text-[#1A1A1A]">
          Projection
        </h2>
      </div>
      <p className="text-xs text-[#9BA89D] mb-4 font-[family-name:var(--font-inter)]">Estimation fin de mois</p>

      <div className="h-[60px] mb-3 overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: '#9BA89D' }}
              axisLine={false}
              tickLine={false}
              interval={Math.max(0, Math.floor(chartData.length / 4))}
            />
            <Tooltip
              contentStyle={{ borderRadius: '10px', border: 'none', fontSize: '12px', padding: '6px 10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
              labelStyle={{ fontWeight: 600, marginBottom: 2 }}
              formatter={(value: any) => [formatCurrency(typeof value === 'number' ? value : 0), 'Solde']}
              labelFormatter={(label: any) => `Jour ${label}`}
              cursor={false}
            />
            <Line
              type="monotone"
              dataKey="pastValue"
              stroke={chartColor}
              strokeWidth={2}
              dot={{ fill: chartColor, strokeWidth: 0, r: 2.5 }}
              activeDot={{ r: 4, fill: chartColor, stroke: '#fff', strokeWidth: 1.5 }}
              connectNulls={false}
              isAnimationActive={false}
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
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {isLimitedHistory && (
        <p className="text-[11px] text-[#9BA89D] font-[family-name:var(--font-inter)] text-center mb-3 leading-relaxed italic">
          Historique limité — la projection s&apos;affine à mesure que vous utilisez l&apos;application.
        </p>
      )}

      {hasBreakdown && (
        <div className="mb-3 rounded-xl border border-[#E8E4DC] overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#FAF8F5]">
            <span className="text-xs text-[#9BA89D] font-[family-name:var(--font-inter)]">Solde actuel</span>
            <span className="text-sm font-[family-name:var(--font-dm-sans)] font-bold text-[#1A1A1A] tabular-nums">{formatCurrency(totalBalance)}</span>
          </div>
          {pendingRecurringExpense > 0 && (
            <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-[#E8E4DC]">
              <span className="text-xs text-[#9BA89D] font-[family-name:var(--font-inter)] flex items-center gap-1.5">
                <FontAwesomeIcon icon={faArrowDown} className="w-2.5 h-2.5 text-[#B94A3E]" />
                Dépenses récurrentes en attente
              </span>
              <span className="text-sm font-[family-name:var(--font-dm-sans)] font-bold text-[#B94A3E] tabular-nums">-{formatCurrency(pendingRecurringExpense)}</span>
            </div>
          )}
          {pendingRecurringIncome > 0 && (
            <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-[#E8E4DC]">
              <span className="text-xs text-[#9BA89D] font-[family-name:var(--font-inter)] flex items-center gap-1.5">
                <FontAwesomeIcon icon={faArrowUp} className="w-2.5 h-2.5 text-[#2D5A27]" />
                Revenus récurrents en attente
              </span>
              <span className="text-sm font-[family-name:var(--font-dm-sans)] font-bold text-[#2D5A27] tabular-nums">+{formatCurrency(pendingRecurringIncome)}</span>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl p-4 border-l-[3px]" style={{ background: isNegative ? '#FCECEA' : '#E8F5E9', borderColor: isNegative ? '#B94A3E' : '#2D5A27' }}>
        <p className="text-xs text-[#9BA89D] mb-1 font-[family-name:var(--font-inter)]">Solde estimé</p>
        <p
          className="text-2xl font-[family-name:var(--font-dm-sans)] font-bold"
          style={{ letterSpacing: "-0.5px", color: isNegative ? '#B94A3E' : '#2D5A27' }}
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
          <p className="text-[11px] text-[#9BA89D] font-[family-name:var(--font-inter)] leading-relaxed">
            Solde de départ non renseigné — cette estimation reflète uniquement vos revenus et dépenses enregistrés.
            Ajoutez votre solde de départ dans les paramètres pour une projection plus précise.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-[#F2EDE4] rounded-xl p-3">
          <p className="text-[10px] text-[#9BA89D] font-[family-name:var(--font-inter)]">Moy./jour</p>
          <p className="text-sm font-[family-name:var(--font-dm-sans)] font-bold text-[#1A1A1A] mt-0.5 tabular-nums">
            {formatCurrency(dailyAvgExpense)}
          </p>
        </div>
        <div className="bg-[#F2EDE4] rounded-xl p-3">
          <p className="text-[10px] text-[#9BA89D] font-[family-name:var(--font-inter)]">Jours restants</p>
          <p className="text-sm font-[family-name:var(--font-dm-sans)] font-bold text-[#1A1A1A] mt-0.5">
            {daysLeft}
          </p>
        </div>
      </div>
    </div>
  );
}
