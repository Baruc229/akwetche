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
    <div className="rounded-[18px] p-5 border border-[var(--color-gold)]/20 shadow-sm" style={{ backgroundColor: 'var(--color-gold-light)' }}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-gold)]/15 flex items-center justify-center">
          <FontAwesomeIcon icon={faBriefcase} className="w-5 h-5 text-[var(--color-gold)]" />
        </div>
        <div>
          <h2 className="text-sm font-[family-name:var(--font-body)] font-semibold text-[var(--color-ink)]">
            Mon activité
          </h2>
          <p className="text-xs text-[var(--color-placeholder)] font-[family-name:var(--font-body)]">Résumé commercial du mois</p>
        </div>
      </div>

      <div className="bg-[var(--color-surface)]/80 rounded-xl p-4 mb-3 border border-[var(--color-gold)]/10">
        <p className="text-[10px] text-[var(--color-placeholder)] uppercase tracking-wider font-[family-name:var(--font-body)]">
          Chiffre d&apos;affaires
        </p>
        <p className="text-xl font-[family-name:var(--font-body)] font-bold text-[var(--color-gold)] mt-1 tabular-nums">
          {formatCurrency(income)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[var(--color-surface)]/80 rounded-xl p-4 border border-[var(--color-gold)]/10">
          <p className="text-[10px] text-[var(--color-placeholder)] uppercase tracking-wider font-[family-name:var(--font-body)]">
            Bénéfice
          </p>
          <p className="text-base font-[family-name:var(--font-body)] font-bold mt-1 tabular-nums" style={{ color: savings >= 0 ? 'var(--color-pos)' : 'var(--color-neg)' }}>
            {formatCurrency(savings)}
          </p>
          <p className="text-[10px] text-[var(--color-placeholder)] mt-0.5 font-[family-name:var(--font-body)]">
            après dépenses
          </p>
        </div>
        <div className="bg-[var(--color-surface)]/80 rounded-xl p-4 border border-[var(--color-gold)]/10">
          <p className="text-[10px] text-[var(--color-placeholder)] uppercase tracking-wider font-[family-name:var(--font-body)]">
            Marge
          </p>
          <p className="text-base font-[family-name:var(--font-body)] font-bold text-[var(--color-ink)] mt-1">
            {marginRate === null ? "—" : marginRate === -100 ? "-100 % (déficit)" : marginRate.toFixed(0) + " %"}
          </p>
          <p className="text-[10px] text-[var(--color-placeholder)] mt-0.5 font-[family-name:var(--font-body)]">
            du chiffre d&apos;affaires
          </p>
        </div>
      </div>
    </div>
  );
}
