"use client";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartLine } from '@fortawesome/free-solid-svg-icons';
import { getIconByKey } from "@/lib/categoryIcons";
import { formatCurrency } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/lib/colors";

type CatItem = { name: string; icon: string; amount: number; type: string };

type Props = {
  personal: CatItem[];
  activity: CatItem[];
  commercialMode: boolean;
};

function computeRoundedPcts(cats: CatItem[], total: number): number[] {
  if (total <= 0 || cats.length === 0) return cats.map(() => 0);
  const raw = cats.map(c => (Math.abs(c.amount) / total) * 100);
  const floored = raw.map(r => Math.floor(r));
  const remaining = 100 - floored.reduce((a, b) => a + b, 0);
  const fracs = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < remaining && k < fracs.length; k++) floored[fracs[k].i]++;
  return floored;
}

function renderBar(cat: CatItem, pct: number, color: string) {
  const absAmount = Math.abs(cat.amount);
  const icon = getIconByKey(cat.icon);
  return (
    <div key={cat.name}>
      <div className="flex justify-between text-sm mb-1 font-[family-name:var(--font-body)]">
        <span className="text-[var(--color-ink)] flex items-center gap-1.5">
          <FontAwesomeIcon icon={icon} className="w-3.5 h-3.5 text-[var(--color-placeholder)]" />
          {cat.name}
        </span>
        <span className="text-[var(--color-placeholder)] font-medium tabular-nums">
          {pct}% <span className="text-[var(--color-placeholder)]/60">{formatCurrency(absAmount)}</span>
        </span>
      </div>
      <div className="h-1.5 bg-[var(--color-surface-raised)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}99)` }}
        />
      </div>
    </div>
  );
}

export default function ExpenseBreakdown({ personal, activity, commercialMode }: Props) {
  const totalPersonal = personal.reduce((a, c) => a + Math.abs(c.amount), 0);
  const totalActivity = activity.reduce((a, c) => a + Math.abs(c.amount), 0);
  const hasAny = personal.length > 0 || activity.length > 0;

  if (!hasAny) {
    return (
      <div className="bg-[var(--color-surface)] rounded-[18px] p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-[var(--color-gold)] shrink-0" />
          <h2 className="text-sm font-[family-name:var(--font-body)] font-semibold text-[var(--color-ink)]">
            Répartition des dépenses
          </h2>
        </div>
        <p className="text-xs text-[var(--color-placeholder)] mb-4 font-[family-name:var(--font-body)]">Cette semaine</p>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-[var(--color-surface-raised)] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FontAwesomeIcon icon={faChartLine} className="w-5 h-5 text-[var(--color-ink)]" />
          </div>
          <p className="text-sm text-[var(--color-placeholder)] font-[family-name:var(--font-body)]">Aucune dépense cette semaine</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-surface)] rounded-[18px] p-5">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-[var(--color-gold)] shrink-0" />
        <h2 className="text-sm font-[family-name:var(--font-body)] font-semibold text-[var(--color-ink)]">
          Répartition des dépenses
        </h2>
      </div>
      <p className="text-xs text-[var(--color-placeholder)] mb-4 font-[family-name:var(--font-body)]">Cette semaine</p>

      <div className="space-y-4">
        {personal.length > 0 && (
          <div>
            {commercialMode && (
              <div className="text-[9.5px] font-[family-name:var(--font-body)] font-semibold text-[var(--color-placeholder)] uppercase tracking-wider mb-3 pb-1 border-b border-[var(--color-border)]">
                Personnel
              </div>
            )}
            <div className="space-y-3">
              {(() => {
                const sliced = personal.slice(0, 5);
                const roundedPcts = computeRoundedPcts(sliced, totalPersonal);
                return sliced.map((cat, i) => {
                  return renderBar(cat, roundedPcts[i], CATEGORY_COLORS[i % CATEGORY_COLORS.length]);
                });
              })()}
            </div>
          </div>
        )}

        {commercialMode && activity.length > 0 && (
          <div>
            <div className="text-[9.5px] font-[family-name:var(--font-body)] font-semibold text-[var(--color-placeholder)] uppercase tracking-wider mb-3 pb-1 border-b border-[var(--color-border)]">
              Activité
            </div>
            <div className="space-y-3">
              {(() => {
                const sliced = activity.slice(0, 5);
                const roundedPcts = computeRoundedPcts(sliced, totalActivity);
                return sliced.map((cat, i) => {
                  return renderBar(cat, roundedPcts[i], CATEGORY_COLORS[(i + 3) % CATEGORY_COLORS.length]);
                });
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
