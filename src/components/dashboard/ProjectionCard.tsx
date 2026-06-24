"use client";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from "@/lib/utils";

type Props = {
  projectedRemaining: number;
  dailyAvgExpense: number;
  daysLeft: number;
};

export default function ProjectionCard({ projectedRemaining, dailyAvgExpense, daysLeft }: Props) {
  const isNegative = projectedRemaining < 0;

  return (
    <div className="bg-white rounded-[18px] p-5">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-[#B94A3E] shrink-0" />
        <h2 className="text-sm font-[family-name:var(--font-inter)] font-semibold text-[#1A1A1A]">
          Projection
        </h2>
      </div>
      <p className="text-xs text-[#9BA89D] mb-4 font-[family-name:var(--font-inter)]">Estimation fin de mois</p>

      <div className="bg-[#FCECEA] rounded-xl p-4 border-l-[3px] border-[#B94A3E]">
        <p className="text-xs text-[#9BA89D] mb-1 font-[family-name:var(--font-inter)]">Solde estimé</p>
        <p
          className="text-2xl font-[family-name:var(--font-dm-sans)] font-bold text-[#B94A3E]"
          style={{ letterSpacing: "-0.5px" }}
        >
          {formatCurrency(Math.abs(projectedRemaining))}
          {isNegative ? " (dépassement)" : ""}
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
