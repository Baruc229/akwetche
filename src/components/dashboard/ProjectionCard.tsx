"use client";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation, faCircleInfo, faLock } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from "@/lib/utils";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

type DailyBalance = { date: string; balance: number };

type Props = {
  projectedRemaining: number;
  dailyAvgExpense: number;
  daysLeft: number;
  dailyBalances?: DailyBalance[];
  initialBalanceMissing?: boolean;
};

export default function ProjectionCard({ projectedRemaining, dailyAvgExpense, daysLeft, dailyBalances, initialBalanceMissing }: Props) {
  const isNegative = projectedRemaining < 0;
  const dayOfMonth = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

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

  return (
    <div className="bg-white rounded-[18px] p-5">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-[#B94A3E] shrink-0" />
        <h2 className="text-sm font-[family-name:var(--font-inter)] font-semibold text-[#1A1A1A]">
          Projection
        </h2>
      </div>
      <p className="text-xs text-[#9BA89D] mb-4 font-[family-name:var(--font-inter)]">Estimation fin de mois</p>

      <div className="h-[60px] mb-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <defs>
              <linearGradient id="projPastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.2} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="projFutureGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.1} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={{ borderRadius: '10px', border: 'none', fontSize: '12px', padding: '6px 10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
              labelStyle={{ fontWeight: 600, marginBottom: 2 }}
              formatter={(value: any) => [formatCurrency(typeof value === 'number' ? value : 0), 'Solde']}
              labelFormatter={(label: any) => `Jour ${label}`}
              cursor={false}
            />
            <Area
              type="monotone"
              dataKey="pastValue"
              stroke={chartColor}
              strokeWidth={2}
              fill="url(#projPastGrad)"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="futureValue"
              stroke={chartColor}
              strokeWidth={2}
              strokeDasharray="4 3"
              fill="url(#projFutureGrad)"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

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
            Vous dépensez plus que votre budget disponible.
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

      <div className="mt-3 rounded-xl bg-[#F7F0DF]/50 border border-[#E0D8CC] px-3 py-2 flex items-center gap-2">
        <FontAwesomeIcon icon={faLock} className="w-3 h-3 text-[#C9A84C] shrink-0" />
        <span className="text-[11px] text-[#9BA89D] font-[family-name:var(--font-inter)]">
          Budget alloué — <span className="text-[#C9A84C] font-medium">bientôt disponible</span>
        </span>
      </div>
    </div>
  );
}
