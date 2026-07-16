"use client";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLock, faSackDollar } from '@fortawesome/free-solid-svg-icons';

export default function BudgetsPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-[20px] flex items-center justify-center mx-auto mb-5" style={{ background: 'var(--color-brand-subtle)' }}>
          <FontAwesomeIcon icon={faSackDollar} className="w-9 h-9" style={{ color: 'var(--color-brand)' }} />
        </div>
        <h1 className="text-2xl font-[family-name:var(--font-dm-sans)] font-bold text-[#1A2744] mb-2">
          Budgets
        </h1>
        <p className="text-sm text-[#9BA89D] mb-6 leading-relaxed">
          Fixez des limites par catégorie et suivez vos dépenses en temps réel.
          Cette fonctionnalité arrive très bientôt.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F7F0DF] text-sm font-medium" style={{ color: 'var(--color-gold)' }}>
          <FontAwesomeIcon icon={faLock} className="w-4 h-4" />
          Bientôt disponible
        </div>
      </div>
    </div>
  );
}
