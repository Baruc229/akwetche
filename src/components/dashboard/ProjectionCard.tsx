"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation, faCircleInfo, faArrowDown, faArrowUp, faChartLine } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency, detectCurrency, toStorageCurrency } from "@/lib/utils";
import { Line, XAxis, ResponsiveContainer, Tooltip, ComposedChart } from 'recharts';

type DailyBalance = { date: string; balance: number };

type Props = {
  projectedRemaining: number;
  dailyAvgExpense: number;
  daysLeft: number;
  dailyBalances?: DailyBalance[];
  initialBalanceMissing?: boolean;
  totalBalance?: number;
  pendingRecurringExpense?: number;
  pendingRecurringIncome?: number;
  totalExpense?: number;
  totalRecurringExpense?: number;
};

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

type PointKind = "past" | "today" | "future";

type ChartPoint = {
  label: string;
  dateLabel: string;
  kind: PointKind;
  pastValue: number | null;
  futureValue: number | null;
  optimistic: number | null;
  pessimistic: number | null;
};

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; payload?: ChartPoint }> }) {
  if (!active || !payload || payload.length === 0) return null;
  const main = payload.find(p => (p.dataKey === "futureValue" || p.dataKey === "pastValue") && typeof p.value === "number" && Number.isFinite(p.value));
  if (!main) return null;
  const point = main.payload;
  const isToday = point?.kind === "today";
  const isFuture = point?.kind === "future";
  const title = isToday
    ? `Aujourd'hui — ${point?.dateLabel ?? ""}`
    : isFuture
      ? `Projection — ${point?.dateLabel ?? ""}`
      : `Solde réel — ${point?.dateLabel ?? ""}`;
  const value = main.value;
  const color = value < 0 ? 'var(--color-neg)' : 'var(--color-pos)';
  return (
    <div className="bg-[var(--color-surface)] rounded-xl px-3 py-2 shadow-lg border border-[var(--color-border)] text-xs">
      <p className="font-semibold text-[var(--color-ink)] mb-0.5">{title}</p>
      <p className="text-amount text-sm" style={{ color }}>
        {formatCurrency(value)}
      </p>
      {isFuture && point?.optimistic != null && point?.pessimistic != null && (
        <p className="text-[10px] text-[var(--color-placeholder)] mt-0.5">
          Fourchette : {formatCurrency(point.pessimistic)} – {formatCurrency(point.optimistic)}
        </p>
      )}
    </div>
  );
}

export default function ProjectionCard({ projectedRemaining, daysLeft, dailyBalances, initialBalanceMissing, totalBalance = 0, pendingRecurringExpense = 0, pendingRecurringIncome = 0, totalExpense = 0, totalRecurringExpense = 0 }: Props) {
  const [whatIfInput, setWhatIfInput] = useState("");
  const currency = detectCurrency();
  const whatIf = whatIfInput === "" ? 0 : Math.max(0, Math.round(toStorageCurrency(parseFloat(whatIfInput.replace(",", ".")) || 0, currency)));

  const adjustedRemaining = projectedRemaining - whatIf;
  const isNegative = adjustedRemaining < 0;
  const hasBreakdown = pendingRecurringExpense > 0 || pendingRecurringIncome > 0;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const dayOfMonth = now.getDate();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const heroLabel = dayOfMonth === lastDayOfMonth
    ? "Solde estimé aujourd'hui"
    : `Solde estimé au ${lastDayOfMonth} ${MOIS[month]}`;

  const chartColor = adjustedRemaining >= 0 ? 'var(--color-pos)' : 'var(--color-neg)';

  const chartData = useMemo<ChartPoint[]>(() => {
    const data: ChartPoint[] = [];

    if (dailyBalances && dailyBalances.length > 0) {
      const startOfMonth = new Date(year, month, 1);
      const monthDays = dailyBalances.filter(d => new Date(d.date) >= startOfMonth);
      for (const d of monthDays) {
        const dt = new Date(d.date);
        const dayNum = dt.getDate();
        data.push({
          label: d.date,
          dateLabel: `${dayNum} ${MOIS[dt.getMonth()]}`,
          kind: "past",
          pastValue: d.balance,
          futureValue: null,
          optimistic: null,
          pessimistic: null,
        });
      }
    }

    if (data.length > 0) {
      data[data.length - 1].futureValue = data[data.length - 1].pastValue;
      data[data.length - 1].kind = "today";
    }

    const ending = whatIf > 0 ? adjustedRemaining : projectedRemaining;
    const futureSpend = totalBalance - pendingRecurringExpense + pendingRecurringIncome - ending;
    const pace = daysLeft > 0 ? futureSpend / daysLeft : 0;
    const base = totalBalance;

    for (let i = 1; i <= daysLeft; i++) {
      const futureDate = new Date(year, month, dayOfMonth + i);
      const dayNum = futureDate.getDate();
      const futureLabel = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      const dailyDrop = pace * i;
      const futureVal = base - pendingRecurringExpense - dailyDrop + pendingRecurringIncome;
      const optVal = base - pendingRecurringExpense * 0.7 - dailyDrop * 0.75 + pendingRecurringIncome * 1.1;
      const pessVal = base - pendingRecurringExpense * 1.3 - dailyDrop * 1.25 + pendingRecurringIncome * 0.9;

      data.push({
        label: futureLabel,
        dateLabel: `${dayNum} ${MOIS[futureDate.getMonth()]}`,
        kind: "future",
        pastValue: null,
        futureValue: futureVal,
        optimistic: optVal,
        pessimistic: pessVal,
      });
    }

    return data;
  }, [dailyBalances, year, month, dayOfMonth, daysLeft, totalBalance, projectedRemaining, pendingRecurringExpense, pendingRecurringIncome, adjustedRemaining, whatIf]);

  const isLimitedHistory = useMemo(() => {
    if (chartData.length <= 3) return true;
    let changes = 0;
    for (let i = 1; i < chartData.length; i++) {
      if (chartData[i].pastValue !== null && chartData[i - 1].pastValue !== null && chartData[i].pastValue !== chartData[i - 1].pastValue) changes++;
    }
    return changes < 2;
  }, [chartData]);

  const isEmptyState = (!dailyBalances || dailyBalances.length === 0) && totalBalance === 0 && pendingRecurringExpense === 0 && pendingRecurringIncome === 0;

  const delta = Math.abs(adjustedRemaining - totalBalance);
  const isDeltaUp = adjustedRemaining >= totalBalance;

  const ending = whatIf > 0 ? adjustedRemaining : projectedRemaining;
  const futureSpend = totalBalance - pendingRecurringExpense + pendingRecurringIncome - ending;
  const pace = daysLeft > 0 ? futureSpend / daysLeft : 0;

  return (
    <div className="bg-[var(--color-surface)] rounded-[18px] p-5 overflow-hidden">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-[var(--color-gold)] shrink-0" />
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">
          Projection
        </h2>
      </div>
      <p className="text-xs text-[var(--color-placeholder)] mb-4">Votre trajectoire jusqu&apos;à la fin du mois</p>

      {isEmptyState ? (
        <div className="text-center py-8">
          <div className="w-10 h-10 bg-[var(--color-surface-raised)] rounded-xl flex items-center justify-center mx-auto mb-3">
            <FontAwesomeIcon icon={faChartLine} className="w-4 h-4 text-[var(--color-ink)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--color-ink)]">Pas encore assez de données pour projeter votre solde.</p>
          <p className="text-xs text-[var(--color-placeholder)] mt-1 mb-3">Enregistrez vos premières opérations : la projection apparaîtra ici.</p>
          <Link href="/dashboard/transactions" className="text-xs font-semibold text-[var(--color-brand)] underline underline-offset-2">
            Enregistrer une opération
          </Link>
        </div>
      ) : (
        <>
          <div
            className="rounded-xl p-4 border-l-[3px] animate-fade-in"
            style={{ background: isNegative ? 'var(--color-neg-bg)' : 'var(--color-pos-bg)', borderColor: isNegative ? 'var(--color-neg)' : 'var(--color-pos)' }}
          >
            <p className="text-xs text-[var(--color-placeholder)] mb-1">{heroLabel}</p>
            <p
              className="text-amount text-4xl animate-fade-in"
              style={{ color: isNegative ? 'var(--color-neg)' : 'var(--color-pos)' }}
            >
              {formatCurrency(adjustedRemaining)}
            </p>
            {totalBalance !== 0 && (
              <span
                title="Différence entre votre solde actuel et le solde estimé à la fin du mois."
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full mt-1.5"
                style={{ background: isDeltaUp ? 'var(--color-pos-bg)' : 'var(--color-neg-bg)', color: isDeltaUp ? 'var(--color-pos)' : 'var(--color-neg)' }}
              >
                <FontAwesomeIcon icon={isDeltaUp ? faArrowUp : faArrowDown} className="w-2.5 h-2.5" />
                {isDeltaUp ? '+' : '−'}{formatCurrency(delta)}{" d'ici la fin du mois"}
              </span>
            )}
            <p className="text-[11px] text-[var(--color-placeholder)] mt-2 leading-relaxed">
              Selon votre rythme de dépenses actuel et vos opérations récurrentes à venir.
            </p>
          </div>

          <div className="mt-3 rounded-xl border border-[var(--color-border)] overflow-hidden divide-y divide-[var(--color-border)]">
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <span className="text-xs text-[var(--color-placeholder)]">Vous avez actuellement</span>
              <span className="text-sm font-bold text-[var(--color-ink)] tabular-nums">{formatCurrency(totalBalance)}</span>
            </div>
            {daysLeft > 0 && (
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <div className="min-w-0 pr-3">
                  <span className="text-xs text-[var(--color-placeholder)]">Dépenses à venir à ce rythme</span>
                  <span className="block text-[10px] text-[var(--color-placeholder)] mt-0.5 tabular-nums">
                    ≈ {formatCurrency(Math.round(pace))} / jour × {daysLeft} jours
                  </span>
                </div>
                <span className="text-sm font-bold text-[var(--color-ink)] tabular-nums">
                  {futureSpend > 0.5 ? "−" : futureSpend < -0.5 ? "+" : ""}{formatCurrency(Math.abs(futureSpend))}
                </span>
              </div>
            )}
            {pendingRecurringExpense > 0 && (
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-xs text-[var(--color-placeholder)] flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faArrowDown} className="w-2.5 h-2.5 text-[var(--color-neg)]" />
                  Récurrentes à venir
                </span>
                <span className="text-sm font-bold text-[var(--color-neg)] tabular-nums">−{formatCurrency(pendingRecurringExpense)}</span>
              </div>
            )}
            {pendingRecurringIncome > 0 && (
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-xs text-[var(--color-placeholder)] flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faArrowUp} className="w-2.5 h-2.5 text-[var(--color-pos)]" />
                  Revenus récurrents à venir
                </span>
                <span className="text-sm font-bold text-[var(--color-pos)] tabular-nums">+{formatCurrency(pendingRecurringIncome)}</span>
              </div>
            )}
            {whatIf > 0 && (
              <div className="flex items-center justify-between px-3.5 py-2.5" style={{ background: 'var(--color-neg-bg)' }}>
                <span className="text-xs text-[var(--color-placeholder)] flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faArrowDown} className="w-2.5 h-2.5 text-[var(--color-neg)]" />
                  Et si dépense supplémentaire
                </span>
                <span className="text-sm font-bold text-[var(--color-neg)] tabular-nums">−{formatCurrency(whatIf)}</span>
              </div>
            )}
            <div
              className="flex items-center justify-between px-3.5 py-3"
              style={{ background: isNegative ? 'var(--color-neg-bg)' : 'var(--color-pos-bg)' }}
            >
              <span className="text-xs font-semibold text-[var(--color-ink)]">{heroLabel}</span>
              <span
                className="text-base font-bold tabular-nums"
                style={{ color: isNegative ? 'var(--color-neg)' : 'var(--color-pos)' }}
              >
                {formatCurrency(adjustedRemaining)}
              </span>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-[var(--color-border)] p-3">
            <label htmlFor="what-if" className="block text-xs text-[var(--color-placeholder)]">
              Simuler une dépense supplémentaire d&apos;ici la fin du mois
            </label>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  id="what-if"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={whatIfInput}
                  onChange={(e) => setWhatIfInput(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3.5 py-2.5 pr-16 text-sm font-bold text-[var(--color-ink)] tabular-nums outline-none transition-all focus:border-[var(--color-gold)] focus:ring-2 focus:ring-[var(--color-gold)]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  aria-label="Montant de la dépense supplémentaire à simuler"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--color-placeholder)] pointer-events-none">
                  {currency === "EUR" ? "€" : "FCFA"}
                </span>
              </div>
              {whatIf > 0 && (
                <button
                  type="button"
                  onClick={() => setWhatIfInput("")}
                  className="shrink-0 px-3 py-2.5 rounded-xl text-xs font-semibold text-[var(--color-neg)] hover:bg-[var(--color-neg-bg)] transition-colors"
                >
                  Effacer
                </button>
              )}
            </div>
          </div>

          {totalExpense > 0 && totalRecurringExpense >= totalExpense - 0.5 && whatIf === 0 && (
            <div className="alert-inline warn mt-3" style={{ padding: '8px 12px' }}>
              <FontAwesomeIcon icon={faCircleInfo} className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <p>
                Vos dépenses de ce mois ({formatCurrency(totalExpense)}) sont toutes des récurrentes déjà planifiées : elles
                ne se répètent pas d&apos;ici la fin du mois, d&apos;où un rythme de {formatCurrency(Math.round(pace))} / jour.
                Enregistrez vos dépenses du quotidien pour une estimation plus fine.
              </p>
            </div>
          )}

          {isNegative && (
            <div className="alert-inline neg mt-3">
              <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                {whatIf > 0
                  ? "Avec cette dépense supplémentaire, votre solde passerait en négatif avant la fin du mois. "
                  : hasBreakdown
                    ? "Vos opérations récurrentes prévues dépassent votre solde actuel. Votre solde pourrait passer en négatif avant la fin du mois. "
                    : "À ce rythme de dépenses, votre solde pourrait passer en négatif avant la fin du mois."}
                {hasBreakdown && whatIf === 0 && (
                  <Link href="/dashboard/recurring/expenses" className="font-semibold underline text-[var(--color-brand)]">
                    Voir mes opérations récurrentes
                  </Link>
                )}
              </p>
            </div>
          )}

          {initialBalanceMissing && (
            <div className="alert-inline warn mt-3">
              <FontAwesomeIcon icon={faCircleInfo} className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                Solde de départ non renseigné : la projection reflète uniquement vos opérations enregistrées.{" "}
                <Link href="/dashboard/settings" className="font-semibold underline text-[var(--color-brand)]">
                  Ajouter mon solde de départ
                </Link>
              </p>
            </div>
          )}

          {chartData.length > 0 && (
            <div className="mt-4">
              <div
                className="h-[110px] mb-2"
                role="img"
                aria-label="Trajectoire de votre solde jusqu'à la fin du mois"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
                    <XAxis dataKey="label" hide />
                    <Tooltip content={<CustomTooltip />} cursor={false} />
                    <Line
                      type="monotone"
                      dataKey="pastValue"
                      stroke="var(--color-ink)"
                      strokeWidth={2}
                      dot={{ fill: 'var(--color-ink)', strokeWidth: 0, r: 2.5 }}
                      activeDot={{ r: 4, fill: 'var(--color-ink)', stroke: '#fff', strokeWidth: 1.5 }}
                      connectNulls={false}
                      isAnimationActive={true}
                      animationDuration={800}
                    />
                    <Line
                      type="monotone"
                      dataKey="futureValue"
                      stroke={chartColor}
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      opacity={isLimitedHistory ? 0.65 : 1}
                      dot={{ fill: chartColor, strokeWidth: 0, r: 2, opacity: 0.5 }}
                      activeDot={{ r: 4, fill: chartColor, stroke: '#fff', strokeWidth: 1.5 }}
                      connectNulls={false}
                      isAnimationActive={true}
                      animationDuration={800}
                      animationBegin={400}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-ink)] shrink-0" />
                  <span className="text-[10px] text-[var(--color-placeholder)]">Solde réel</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: chartColor }} />
                  <span className="text-[10px] text-[var(--color-placeholder)]">Projection</span>
                </span>
              </div>

              {isLimitedHistory && (
                <div className="alert-inline warn mt-3" style={{ padding: '8px 12px' }}>
                  <FontAwesomeIcon icon={faCircleInfo} className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <p>
                    Encore peu de données. Enregistrez vos opérations quelques jours de plus : la projection deviendra plus fiable.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
