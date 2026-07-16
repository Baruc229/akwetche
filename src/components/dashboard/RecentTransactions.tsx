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
    <div className="bg-white rounded-[18px] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-[family-name:var(--font-inter)] font-semibold text-[#1A2744]">
          Dernières opérations
        </h2>
        <a
          href="/dashboard/transactions"
          className="inline-flex items-center gap-1 text-xs font-medium text-[#C9A84C] hover:text-[#C9A84C]/80 transition-colors font-[family-name:var(--font-inter)]"
        >
          Voir tout
          <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
        </a>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-[#F2EDE4] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FontAwesomeIcon icon={faChartLine} className="w-5 h-5 text-[#1A2744]" />
          </div>
          <p className="text-sm text-[#9BA89D] font-[family-name:var(--font-inter)]">Aucune opération pour le moment</p>
          {onAdd && (
            <button
              onClick={onAdd}
              className="text-[#C9A84C] text-sm font-medium mt-2 hover:text-[#C9A84C]/80 underline underline-offset-2 font-[family-name:var(--font-inter)]"
            >
              Ajouter une transaction
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-[#E0D8CC]">
          {transactions.map((tx) => {
            const isIncome = tx.type === "income";
            const icon = getIconByKey(tx.category?.icon);
            return (
              <div key={tx.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    isIncome ? "bg-[#0D7A4B]/10" : "bg-[#FCECEA]"
                  }`}
                >
                  <FontAwesomeIcon
                    icon={icon}
                    className={`w-3.5 h-3.5 ${isIncome ? "text-[#0D7A4B]" : "text-[#B94A3E]"}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-[#1A2744] truncate font-[family-name:var(--font-inter)]">
                      {tx.description}
                    </p>
                    <span
                      className={`text-sm font-[family-name:var(--font-dm-sans)] font-bold tabular-nums shrink-0 whitespace-nowrap ${
                        isIncome ? "text-[#0D7A4B]" : "text-[#B94A3E]"
                      }`}
                    >
                      {isIncome ? "+" : "-"}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-xs text-[#9BA89D] font-[family-name:var(--font-inter)]">
                      {tx.category?.name || "Non catégorisé"}
                    </span>
                    <span className="text-[#9BA89D]/40 text-xs">·</span>
                    <span className="text-xs text-[#9BA89D] font-[family-name:var(--font-inter)]">
                      {formatDateShort(tx.date)}
                    </span>
                    {tx.scope === "activity" && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#C9A84C]/10 text-[10px] font-semibold text-[#C9A84C] font-[family-name:var(--font-inter)]">
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
