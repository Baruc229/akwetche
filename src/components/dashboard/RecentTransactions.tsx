"use client";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight, faChartLine, faCircleMinus } from '@fortawesome/free-solid-svg-icons';
import { getIconByKey } from "@/lib/categoryIcons";
import { formatCurrency, formatDateShort } from "@/lib/utils";

type Transaction = {
  id: number;
  type: string;
  amount: number;
  description: string;
  date: string;
  scope: string;
  category: { name: string; icon: string };
};

type Props = {
  transactions: Transaction[];
  onAdd?: () => void;
};

export default function RecentTransactions({ transactions, onAdd }: Props) {
  return (
    <div className="bg-[var(--color-surface)] rounded-[18px] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-[family-name:var(--font-body)] font-semibold text-[var(--color-ink)]">
          Dernières opérations
        </h2>
        <a
          href="/dashboard/transactions"
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-gold)] hover:text-[var(--color-gold)]/80 transition-colors font-[family-name:var(--font-body)]"
        >
          Voir tout
          <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
        </a>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-[var(--color-surface-raised)] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FontAwesomeIcon icon={faChartLine} className="w-5 h-5 text-[var(--color-ink)]" />
          </div>
          <p className="text-sm text-[var(--color-placeholder)] font-[family-name:var(--font-body)]">Aucune opération pour le moment</p>
          {onAdd && (
            <button
              onClick={onAdd}
              className="text-[var(--color-gold)] text-sm font-medium mt-2 hover:text-[var(--color-gold)]/80 underline underline-offset-2 font-[family-name:var(--font-body)]"
            >
              Ajouter une transaction
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-[var(--color-border)]">
          {transactions.map((tx) => {
            const isIncome = tx.type === "income";
            const icon = getIconByKey(tx.category?.icon);
            return (
              <div key={tx.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    isIncome ? "bg-[var(--color-pos-bg)]" : "bg-[var(--color-neg-bg)]"
                  }`}
                >
                  <FontAwesomeIcon
                    icon={icon}
                    className={`w-3.5 h-3.5 ${isIncome ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]"}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-[var(--color-ink)] truncate font-[family-name:var(--font-body)]">
                      {tx.description}
                    </p>
                    <span
                      className={`text-sm font-[family-name:var(--font-body)] font-bold tabular-nums shrink-0 whitespace-nowrap ${
                        isIncome ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]"
                      }`}
                    >
                      {isIncome ? "+" : "-"}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-xs text-[var(--color-placeholder)] font-[family-name:var(--font-body)]">
                      {tx.category?.name || "Non catégorisé"}
                    </span>
                    <span className="text-[var(--color-placeholder)]/40 text-xs">·</span>
                    <span className="text-xs text-[var(--color-placeholder)] font-[family-name:var(--font-body)]">
                      {formatDateShort(tx.date)}
                    </span>
                    {tx.scope === "activity" && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--color-gold)]/10 text-[10px] font-semibold text-[var(--color-gold)] font-[family-name:var(--font-body)]">
                        Activité
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
