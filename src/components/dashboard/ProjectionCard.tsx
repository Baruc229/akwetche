"use client";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from "@/lib/utils";
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

type Props = {
  projectedRemaining: number;
  dailyAvgExpense: number;
  daysLeft: number;
};

export default function ProjectionCard({ projectedRemaining, dailyAvgExpense, daysLeft }: Props) {
  const isNegative = projectedRemaining < 0;
  const dayOfMonth = new Date().getDate();
  const currentNet = projectedRemaining + (dailyAvgExpense * daysLeft);
  const chartData = [
    { day: `Jour ${dayOfMonth}`, value: Math.round(currentNet) },
    { day: `Jour ${dayOfMonth + daysLeft}`, value: Math.round(projectedRemaining) },
  ];
  const chartColor = projectedRemaining >= currentNet ? '#2D5A27' : '#B94A3E';

  return (
    <div className="bg-white rounded-[18px] p-5">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-[#B94A3E] shrink-0" />
        <h2 className="text-sm font-[family-name:var(--font-inter)] font-semibold text-[#1A1A1A]">
          Projection
        </h2>
      </div>
      <p className="text-xs text-[#9BA89D] mb-4 font-[family-name:var(--font-inter)]">Estimation fin de mois</p>

      <div className="h-[50px] mb-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`projGrad-${chartColor.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.25} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={chartColor}
              strokeWidth={2}
              fill={`url(#projGrad-${chartColor.slice(1)})`}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-[#FCECEA] rounded-xl p-4 border-l-[3px] border-[#B94A3E]">
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
