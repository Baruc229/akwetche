"use client";

import { useState, useEffect, useRef } from "react";
import { useDashboard } from "@/app/(dashboard)/layout";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faTriangleExclamation, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency, toDisplayCurrency, toStorageCurrency } from "@/lib/utils";
import CustomSelect from "@/components/ui/CustomSelect";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export default function QuickTransactionModal({ open, onClose, onSuccess }: Props) {
  const { user, commercialMode, currency } = useDashboard();

  const [formData, setFormData] = useState({
    type: "expense",
    amount: "",
    description: "",
    categoryId: "",
    date: new Date().toISOString().split('T')[0],
    scope: "personal",
    note: "",
  });
  const [txError, setTxError] = useState("");

  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategoryIds, setActiveCategoryIds] = useState<number[]>([]);
  const [limits, setLimits] = useState<any>(null);

  const prevCurrencyRef = useRef(currency);
  useEffect(() => {
    const prev = prevCurrencyRef.current;
    if (open && prev !== currency) {
      if (formData.amount) {
        const baseVal = toStorageCurrency(parseFloat(formData.amount) || 0, prev);
        setFormData(f => ({ ...f, amount: String(toDisplayCurrency(baseVal, currency)) }));
      }
      prevCurrencyRef.current = currency;
    }
  }, [currency, open]);

  useEffect(() => {
    if (!open) return;
    setFormData({ type: "expense", amount: "", description: "", categoryId: "", date: new Date().toISOString().split('T')[0], scope: "personal", note: "" });
    setTxError("");
    Promise.all([
      fetch("/api/categories"),
      fetch("/api/user/limits"),
    ]).then(async ([catRes, limitsRes]) => {
      const catData = await catRes.json();
      setCategories(catData.categories || []);
      setActiveCategoryIds(catData.activeCategoryIds || []);
      setLimits(await limitsRes.json());
    });
  }, [open]);

  const categoryOptions = (() => {
    const isPrem = limits?.isPremium || false;
    const ofType = categories.filter((c: any) => c.type === formData.type).sort((a: any, b: any) => a.id - b.id);
    if (isPrem) return ofType.map((c: any) => ({ value: String(c.id), label: c.name }));
    const active = ofType.filter((c: any) => activeCategoryIds.includes(c.id));
    const locked = ofType.filter((c: any) => !activeCategoryIds.includes(c.id));
    if (locked.length === 0) return active.map((c: any) => ({ value: String(c.id), label: c.name }));
    return [
      ...active.map((c: any) => ({ value: String(c.id), label: c.name })),
      { value: "__sep__", label: "Nécessitent Premium", separator: true },
      ...locked.map((c: any) => ({ value: String(c.id), label: c.name, disabled: true, disabledReason: "Premium requis" })),
    ];
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTxError("");
    if (!formData.amount || Number(formData.amount) <= 0) { setTxError("Le montant doit être supérieur à 0"); return; }
    if (!formData.description.trim()) { setTxError("La description est requise"); return; }
    if (!formData.categoryId) { setTxError("La catégorie est requise"); return; }
    if (!formData.date) { setTxError("La date est requise"); return; }

    if (limits && !limits.isPremium && user?.role === "user") {
      const atLimit = formData.type === "income" ? limits.incomeCount >= limits.maxFreeIncome : limits.expenseCount >= limits.maxFreeExpense;
      if (atLimit) {
        setTxError(`Limite mensuelle gratuite atteinte (${limits.maxFreeIncome} revenus / ${limits.maxFreeExpense} dépenses max). Passez à Premium pour continuer.`);
        return;
      }
    }

    try {
      const body: Record<string, unknown> = { type: formData.type, amount: toStorageCurrency(Number(formData.amount), currency), description: formData.description, categoryId: Number(formData.categoryId), date: formData.date, scope: formData.scope };
      if (formData.note) body.note = formData.note;
      const res = await fetch("/api/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setTxError(data.error || "Erreur"); return; }
      onClose();
      onSuccess?.();
    } catch {
      setTxError("Erreur réseau");
    }
  }

  const content = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {commercialMode && (
        <div className="flex gap-2">
          <button type="button" onClick={() => setFormData({ ...formData, scope: "personal" })} className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${formData.scope === "personal" ? "bg-[var(--color-brand)] text-white shadow-sm" : "bg-[var(--color-border)] text-muted hover:bg-[var(--color-surface-raised)]"}`}>Personnel</button>
          <button type="button" onClick={() => setFormData({ ...formData, scope: "activity" })} className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${formData.scope === "activity" ? "bg-[var(--color-gold)] text-white shadow-sm" : "bg-[var(--color-border)] text-muted hover:bg-[var(--color-surface-raised)]"}`}>Activité</button>
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={() => setFormData({ ...formData, type: "expense", categoryId: "" })} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${formData.type === "expense" ? "bg-[var(--color-neg)] text-white shadow-sm" : "bg-[var(--color-border)] text-muted hover:bg-[var(--color-surface-raised)]"}`}>Dépense</button>
        <button type="button" onClick={() => setFormData({ ...formData, type: "income", categoryId: "" })} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${formData.type === "income" ? "bg-[var(--color-pos)] text-white shadow-sm" : "bg-[var(--color-border)] text-muted hover:bg-[var(--color-surface-raised)]"}`}>Revenu</button>
      </div>
      <div>
        <label className="field-label">Montant</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm font-semibold pointer-events-none">{currency === "XOF" ? "FCFA" : "EUR"}</span>
          <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="input-field pl-16" placeholder="ex: 5000" required min="1" />
        </div>
      </div>
      <div>
        <label className="field-label">Description</label>
        <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input-field" placeholder="ex: Achat alimentation" required />
      </div>
      <div>
        <label className="field-label">Catégorie</label>
        <CustomSelect options={categoryOptions} value={formData.categoryId} onChange={(v) => setFormData({ ...formData, categoryId: v })} placeholder="Sélectionner..." />
      </div>
      <div>
        <label className="field-label">Date</label>
        <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="input-field" required />
      </div>
      <div>
        <label className="field-label">Note (optionnelle)</label>
        <textarea value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} className="input-field resize-none" rows={2} placeholder="Ajouter une note..." />
      </div>
      {limits && !limits.isPremium && user?.role === "user" && (
        <div className="card-inset" style={{ background: 'var(--color-warn-bg)' }}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium" style={{ color: 'var(--color-warn)' }}>{formData.type === "income" ? "Revenus" : "Dépenses"} ce mois</span>
            <span className="font-semibold" style={{ color: 'var(--color-warn)' }}>{formData.type === "income" ? limits.incomeCount : limits.expenseCount}/{formData.type === "income" ? limits.maxFreeIncome : limits.maxFreeExpense}</span>
          </div>
          {(formData.type === "income" && limits.incomeCount >= limits.maxFreeIncome) || (formData.type === "expense" && limits.expenseCount >= limits.maxFreeExpense) ? (
            <p className="text-xs" style={{ color: 'var(--color-neg)' }}>Limite mensuelle atteinte. Passez à Premium.</p>
          ) : (
            <p className="text-xs" style={{ color: 'var(--color-warn)' }}>{Math.max(0, (formData.type === "income" ? limits.maxFreeIncome : limits.maxFreeExpense) - (formData.type === "income" ? limits.incomeCount : limits.expenseCount))} transaction(s) restante(s)</p>
          )}
        </div>
      )}
      {txError && <div className="alert-inline neg"><FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 shrink-0 mt-0.5" /><p>{txError}</p></div>}
      {(() => {
        const atLimit = limits && !limits.isPremium && user?.role === "user" && ((formData.type === "income" && limits.incomeCount >= limits.maxFreeIncome) || (formData.type === "expense" && limits.expenseCount >= limits.maxFreeExpense));
        return <button type="submit" disabled={!!atLimit} className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed">Ajouter</button>;
      })()}
    </form>
  );

  if (!open) return null;

  return (
    <>
      {/* Mobile — full page */}
      <div className="fixed inset-0 z-50 md:hidden bg-[var(--color-bg)] animate-slide-up flex flex-col">
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3.5 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center text-muted hover:text-ink rounded-lg hover:bg-[var(--color-surface-raised)] transition-colors">
            <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 rotate-180" />
          </button>
          <h3 className="text-base font-semibold text-ink">Nouvelle transaction</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{content}</div>
      </div>
      {/* Desktop modal */}
      <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4 bg-black/40 animate-fade-in">
        <div className="card max-w-md shadow-xl animate-scale-in max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-ink">Nouvelle transaction</h3>
            <button onClick={onClose} className="text-muted hover:text-muted">
              <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
            </button>
          </div>
          {content}
        </div>
      </div>
    </>
  );
}
