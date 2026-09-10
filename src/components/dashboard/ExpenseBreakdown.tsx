"use client";

import { useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartLine, faXmark } from '@fortawesome/free-solid-svg-icons';
import { getIconByKey } from "@/lib/categoryIcons";
import { formatCurrency } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/lib/colors";

type CatItem = { name: string; icon: string; amount: number; type: string };

type Props = {
  personal: CatItem[];
  activity: CatItem[];
  commercialMode: boolean;
};

type Scope = "personal" | "activity";

function computeRoundedPcts(cats: CatItem[], total: number): number[] {
  if (total <= 0 || cats.length === 0) return cats.map(() => 0);
  const raw = cats.map(c => (Math.abs(c.amount) / total) * 100);
  const floored = raw.map(r => Math.floor(r));
  const remaining = 100 - floored.reduce((a, b) => a + b, 0);
  const fracs = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < remaining && k < fracs.length; k++) floored[fracs[k].i]++;
  return floored;
}

function BarRow({ cat, pct, color, selected, dimmed, onSelect }: {
  cat: CatItem;
  pct: number;
  color: string;
  selected: boolean;
  dimmed: boolean;
  onSelect: () => void;
}) {
  const absAmount = Math.abs(cat.amount);
  const icon = getIconByKey(cat.icon);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${cat.name}, ${pct}% des dépenses (${formatCurrency(absAmount)})`}
      className={`group w-full text-left rounded-lg px-1.5 -mx-1.5 py-1 -my-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]/60 ${selected ? "bg-[var(--color-gold-light)]" : "hover:bg-[var(--color-surface-raised)]"}`}
    >
      <div className="flex justify-between text-sm mb-1 font-[family-name:var(--font-body)]">
        <span className={`text-[var(--color-ink)] flex items-center gap-1.5 transition-opacity ${dimmed ? "opacity-40" : ""}`}>
          <FontAwesomeIcon icon={icon} className={`w-3.5 h-3.5 transition-colors ${selected ? "text-[var(--color-gold)]" : "text-[var(--color-placeholder)]"}`} />
          {cat.name}
        </span>
        <span className={`text-[var(--color-placeholder)] font-medium tabular-nums transition-opacity ${dimmed ? "opacity-40" : ""}`}>
          {pct}% <span className="text-[var(--color-placeholder)]/60">{formatCurrency(absAmount)}</span>
        </span>
      </div>
      <div className="h-1.5 bg-[var(--color-surface-raised)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}, ${color}99)`,
            opacity: dimmed ? 0.25 : 1,
            boxShadow: selected ? `0 0 0 1.5px ${color}66` : undefined,
          }}
        />
      </div>
    </button>
  );
}

export default function ExpenseBreakdown({ personal, activity, commercialMode }: Props) {
  const totalPersonal = personal.reduce((a, c) => a + Math.abs(c.amount), 0);
  const totalActivity = activity.reduce((a, c) => a + Math.abs(c.amount), 0);
  const hasAny = personal.length > 0 || activity.length > 0;
  const [selected, setSelected] = useState<{ key: string; cat: CatItem; pct: number; } | null>(null);

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

  function renderBars(cats: CatItem[], total: number, scope: Scope, colorOffset: number) {
    const sliced = cats.slice(0, 5);
    const roundedPcts = computeRoundedPcts(sliced, total);
    return (
      <div className="space-y-2.5">
        {sliced.map((cat, i) => {
          const color = CATEGORY_COLORS[(i + colorOffset) % CATEGORY_COLORS.length];
          const pct = roundedPcts[i] ?? 0;
          const key = `${scope}:${cat.name}`;
          const isSel = selected?.key === key;
          const dimmed = selected !== null && !isSel;
          return (
            <div key={key}>
              <BarRow
                cat={cat}
                pct={pct}
                color={color}
                selected={isSel}
                dimmed={dimmed}
                onSelect={() => setSelected(isSel ? null : { key, cat, pct })}
              />
              {isSel && (
                <div className="ml-1.5 mt-1.5 -mt-0.5 rounded-lg bg-[var(--color-surface-raised)] px-3 py-2 flex items-center justify-between gap-3 animate-fade-in">
                  <p className="text-xs text-[var(--color-placeholder)]">
                    <span className="font-semibold text-[var(--color-ink)] tabular-nums">{formatCurrency(Math.abs(cat.amount))}</span>
                    {" · "}{pct}% des dépenses
                    {commercialMode && ` ${scope === "personal" ? "personnelles" : "de l'activité"}`}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    aria-label="Fermer le détail"
                    className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-[var(--color-placeholder)] hover:text-[var(--color-ink)] hover:bg-[var(--color-border)] transition-colors"
                  >
                    <FontAwesomeIcon icon={faXmark} className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
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
            {renderBars(personal, totalPersonal, "personal", 0)}
          </div>
        )}

        {commercialMode && activity.length > 0 && (
          <div>
            <div className="text-[9.5px] font-[family-name:var(--font-body)] font-semibold text-[var(--color-placeholder)] uppercase tracking-wider mb-3 pb-1 border-b border-[var(--color-border)]">
              Activité
            </div>
            {renderBars(activity, totalActivity, "activity", 3)}
          </div>
        )}
      </div>

      {selected === null && (
        <p className="text-[10px] text-[var(--color-placeholder)] mt-3">
          Cliquez sur une catégorie pour afficher le détail.
        </p>
      )}
    </div>
  );
}