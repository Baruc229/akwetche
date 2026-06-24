"use client";

import { useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowTrendUp, faArrowTrendDown, faPiggyBank } from '@fortawesome/free-solid-svg-icons';
import { formatDualCurrency } from "@/lib/currency";

type Props = {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  savingsRate: number;
};

export default function HeroCard({ totalBalance, totalIncome, totalExpense, savingsRate }: Props) {
  const [showSecondary, setShowSecondary] = useState(false);
  const primary = formatDualCurrency(totalBalance);
  const incomeFmt = formatDualCurrency(totalIncome);
  const expenseFmt = formatDualCurrency(totalExpense);

  const dispBalance = showSecondary
    ? { primary: primary.secondary, secondary: primary.primary }
    : { primary: primary.primary, secondary: primary.secondary };

  const dispIncome = showSecondary
    ? { primary: incomeFmt.secondary, secondary: incomeFmt.primary }
    : { primary: incomeFmt.primary, secondary: incomeFmt.secondary };

  const dispExpense = showSecondary
    ? { primary: expenseFmt.secondary, secondary: expenseFmt.primary }
    : { primary: expenseFmt.primary, secondary: expenseFmt.secondary };

  const isNegative = totalBalance < 0;

  return (
    <div className="bg-[#1C3A2F] rounded-[20px] p-5 md:p-6 text-white">
      <div className="mb-2">
        <p className="text-xs text-white/50 font-[family-name:var(--font-inter)]">Solde actuel</p>
        <p
          className={`text-[38px] font-[family-name:var(--font-dm-sans)] font-bold leading-none mt-1 ${
            isNegative ? "text-[#E07A72]" : "text-white"
          }`}
          style={{ letterSpacing: "-0.5px" }}
        >
          {dispBalance.primary}
        </p>
      </div>

      <button
        onClick={() => setShowSecondary((p) => !p)}
        className="text-xs text-white/40 hover:text-white/70 font-[family-name:var(--font-inter)] transition-colors mb-4 underline underline-offset-2 decoration-white/20"
      >
        {showSecondary ? "Voir en EUR" : "Voir en FCFA"}
      </button>

      <div className="h-px bg-white/10 mb-4" />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <div className="flex items-center gap-1.5 text-sm">
            <FontAwesomeIcon icon={faArrowTrendUp} className="w-3 h-3 text-[#6ECFA0]" />
            <span className="font-[family-name:var(--font-inter)] text-xs text-white/50">Reçus</span>
          </div>
          <p className="text-sm font-[family-name:var(--font-dm-sans)] font-bold text-[#6ECFA0] mt-0.5">
            {dispIncome.primary}
          </p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-sm">
            <FontAwesomeIcon icon={faArrowTrendDown} className="w-3 h-3 text-[#E07A72]" />
            <span className="font-[family-name:var(--font-inter)] text-xs text-white/50">Dépensés</span>
          </div>
          <p className="text-sm font-[family-name:var(--font-dm-sans)] font-bold text-[#E07A72] mt-0.5">
            {dispExpense.primary}
          </p>
        </div>
      </div>

      <div className="bg-white/6 rounded-xl px-4 py-3 flex items-center gap-3">
        <FontAwesomeIcon icon={faPiggyBank} className="w-4 h-4 text-white/40" />
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-white/50 font-[family-name:var(--font-inter)]">Taux d&apos;épargne</span>
            <span className="font-[family-name:var(--font-dm-sans)] font-bold text-white/80">{savingsRate.toFixed(0)}%</span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-white/30"
              style={{ width: `${Math.min(100, savingsRate)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
