"use client";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowTrendDown } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/lib/colors";

type CatItem = { name: string; icon: string; amount: number; type: string };

type Props = {
  personal: CatItem[];
  activity: CatItem[];
  commercialMode: boolean;
};

export default function ExpenseBreakdown({ personal, activity, commercialMode }: Props) {
  const totalPersonal = personal.reduce((a, c) => a + Math.abs(c.amount), 0);
  const totalActivity = activity.reduce((a, c) => a + Math.abs(c.amount), 0);
  const hasAny = personal.length > 0 || activity.length > 0;

  if (!hasAny) {
    return (
      <div className="bg-white rounded-[18px] p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-[#C9A84C] shrink-0" />
          <h2 className="text-sm font-[family-name:var(--font-inter)] font-semibold text-[#1A1A1A]">
            Répartition des dépenses
          </h2>
        </div>
        <p className="text-xs text-[#9BA89D] mb-4 font-[family-name:var(--font-inter)]">Cette semaine</p>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-[#F2EDE4] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FontAwesomeIcon icon={faArrowTrendDown} className="w-5 h-5 text-[#9BA89D]" />
          </div>
          <p className="text-sm text-[#9BA89D] font-[family-name:var(--font-inter)]">Aucune dépense cette semaine</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[18px] p-5">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-[#C9A84C] shrink-0" />
        <h2 className="text-sm font-[family-name:var(--font-inter)] font-semibold text-[#1A1A1A]">
          Répartition des dépenses
        </h2>
      </div>
      <p className="text-xs text-[#9BA89D] mb-4 font-[family-name:var(--font-inter)]">Cette semaine</p>

      <div className="space-y-4">
        {personal.length > 0 && (
          <div>
            {commercialMode && (
              <div className="text-[9.5px] font-[family-name:var(--font-inter)] font-semibold text-[#9BA89D] uppercase tracking-wider mb-3 pb-1 border-b border-[#E0D8CC]">
                Personnel
              </div>
            )}
            <div className="space-y-3">
              {personal.slice(0, 5).map((cat, i) => {
                const absAmount = Math.abs(cat.amount);
                const pct = totalPersonal > 0 ? (absAmount / totalPersonal) * 100 : 0;
                const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                return (
                  <div key={cat.name}>
                    <div className="flex justify-between text-sm mb-1 font-[family-name:var(--font-inter)]">
                      <span className="text-[#1A1A1A] flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: color }} />
                        {cat.name}
                      </span>
                      <span className="text-[#9BA89D] font-medium tabular-nums">
                        {pct.toFixed(0)}% <span className="text-[#9BA89D]/60">{formatCurrency(absAmount)}</span>
                      </span>
                    </div>
                    <div className="h-1 bg-[#F2EDE4] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {commercialMode && activity.length > 0 && (
          <div>
            <div className="text-[9.5px] font-[family-name:var(--font-inter)] font-semibold text-[#9BA89D] uppercase tracking-wider mb-3 pb-1 border-b border-[#E0D8CC]">
              Activité
            </div>
            <div className="space-y-3">
              {activity.slice(0, 5).map((cat, i) => {
                const absAmount = Math.abs(cat.amount);
                const pct = totalActivity > 0 ? (absAmount / totalActivity) * 100 : 0;
                const color = CATEGORY_COLORS[(i + 3) % CATEGORY_COLORS.length];
                return (
                  <div key={cat.name}>
                    <div className="flex justify-between text-sm mb-1 font-[family-name:var(--font-inter)]">
                      <span className="text-[#1A1A1A] flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: color }} />
                        {cat.name}
                      </span>
                      <span className="text-[#9BA89D] font-medium tabular-nums">
                        {pct.toFixed(0)}% <span className="text-[#9BA89D]/60">{formatCurrency(absAmount)}</span>
                      </span>
                    </div>
                    <div className="h-1 bg-[#F2EDE4] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
