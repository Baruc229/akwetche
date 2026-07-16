"use client";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBriefcase } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from "@/lib/utils";

type Props = {
  income: number;
  expense: number;
  savings: number;
};

export default function ActivitySummary({ income, expense, savings }: Props) {
  const rawMargin = income > 1 ? (savings / income) * 100 : null;
  const marginRate = rawMargin !== null ? (rawMargin < -100 ? -100 : rawMargin) : null;

  return (
    <div className="rounded-[18px] p-5 border border-[#C9A84C]/20 shadow-sm" style={{ backgroundColor: '#F7F0D6' }}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/15 flex items-center justify-center">
          <FontAwesomeIcon icon={faBriefcase} className="w-5 h-5 text-[#C9A84C]" />
        </div>
        <div>
          <h2 className="text-sm font-[family-name:var(--font-inter)] font-semibold text-[#1A2744]">
            Mon activité
          </h2>
          <p className="text-xs text-[#9BA89D] font-[family-name:var(--font-inter)]">Résumé commercial du mois</p>
        </div>
      </div>

      <div className="bg-[#FFFFFF]/80 rounded-xl p-4 mb-3 border border-[#C9A84C]/10">
        <p className="text-[10px] text-[#9BA89D] uppercase tracking-wider font-[family-name:var(--font-inter)]">
          Chiffre d&apos;affaires
        </p>
        <p className="text-xl font-[family-name:var(--font-dm-sans)] font-bold text-[#C9A84C] mt-1 tabular-nums">
          {formatCurrency(income)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#FFFFFF]/80 rounded-xl p-4 border border-[#C9A84C]/10">
          <p className="text-[10px] text-[#9BA89D] uppercase tracking-wider font-[family-name:var(--font-inter)]">
            Bénéfice
          </p>
          <p className="text-base font-[family-name:var(--font-dm-sans)] font-bold mt-1 tabular-nums" style={{ color: savings >= 0 ? '#3A8C68' : '#B94A3E' }}>
            {formatCurrency(savings)}
          </p>
          <p className="text-[10px] text-[#9BA89D] mt-0.5 font-[family-name:var(--font-inter)]">
            après dépenses
          </p>
        </div>
        <div className="bg-[#FFFFFF]/80 rounded-xl p-4 border border-[#C9A84C]/10">
          <p className="text-[10px] text-[#9BA89D] uppercase tracking-wider font-[family-name:var(--font-inter)]">
            Marge
          </p>
          <p className="text-base font-[family-name:var(--font-dm-sans)] font-bold text-[#1A2744] mt-1">
            {marginRate === null ? "—" : marginRate === -100 ? "-100 % (déficit)" : marginRate.toFixed(0) + " %"}
          </p>
          <p className="text-[10px] text-[#9BA89D] mt-0.5 font-[family-name:var(--font-inter)]">
            du chiffre d&apos;affaires
          </p>
        </div>
      </div>
    </div>
  );
}
