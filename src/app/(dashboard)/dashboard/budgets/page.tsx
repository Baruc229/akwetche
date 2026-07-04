"use client";

import { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTrash, faPen, faTriangleExclamation, faCircleCheck, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { useDashboard } from "../../layout";
import { formatCurrency } from "@/lib/utils";
import CustomSelect from "@/components/ui/CustomSelect";

type Budget = {
  id: number;
  categoryId: number;
  scope: "personal" | "activity";
  amount: number;
  month: number;
  year: number;
  spent: number;
  category: { id: number; name: string; icon: string; type: string };
};

type Category = { id: number; name: string; icon: string; type: string; archived: boolean };

const MONTHS = [
  { value: "1", label: "Janvier" }, { value: "2", label: "Février" }, { value: "3", label: "Mars" },
  { value: "4", label: "Avril" }, { value: "5", label: "Mai" }, { value: "6", label: "Juin" },
  { value: "7", label: "Juillet" }, { value: "8", label: "Août" }, { value: "9", label: "Septembre" },
  { value: "10", label: "Octobre" }, { value: "11", label: "Novembre" }, { value: "12", label: "Décembre" },
];

export default function BudgetsPage() {
  const { commercialMode } = useDashboard();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formScope, setFormScope] = useState<"personal" | "activity">("personal");
  const [formAmount, setFormAmount] = useState("");
  const [error, setError] = useState("");

  const dayOfMonth = new Date().getDate();
  const daysInMonth = new Date(year, month, 0).getDate();
  const expCategories = categories.filter(c => !c.archived && c.type === "expense");

  async function loadData() {
    try {
      const [bRes, cRes] = await Promise.all([
        fetch(`/api/budgets?month=${month}&year=${year}`),
        fetch("/api/categories"),
      ]);
      const bData = await bRes.json();
      const cData = await cRes.json();
      setBudgets(bData.budgets || []);
      setCategories(cData.categories || []);
    } catch { setError("Erreur de chargement"); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, [month, year]);

  function resetForm() {
    setFormCategoryId("");
    setFormScope("personal");
    setFormAmount("");
    setEditingId(null);
    setError("");
  }

  function openEdit(b: Budget) {
    setFormCategoryId(String(b.categoryId));
    setFormScope(b.scope);
    setFormAmount(String(b.amount));
    setEditingId(b.id);
    setShowForm(true);
    setError("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!formCategoryId) { setError("Catégorie requise"); return; }
    const amount = parseFloat(formAmount);
    if (!amount || amount <= 0) { setError("Montant invalide"); return; }

    const body = { categoryId: formCategoryId, scope: formScope, amount, month, year };

    const res = await fetch("/api/budgets", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (!res.ok) { setError("Erreur d'enregistrement"); return; }

    resetForm();
    setShowForm(false);
    loadData();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/budgets/${id}`, { method: "DELETE" });
    loadData();
  }

  const personalBudgets = budgets.filter(b => b.scope === "personal");
  const activityBudgets = budgets.filter(b => b.scope === "activity");

  if (loading) return (
    <div className="space-y-3">
      <h1 className="text-2xl font-[family-name:var(--font-dm-sans)] font-bold">Budgets</h1>
      <div className="card p-8 text-center text-muted text-sm">Chargement...</div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-[family-name:var(--font-dm-sans)] font-bold">Budgets</h1>
        <div className="flex items-center gap-2">
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="input-field text-sm" style={{ padding: '6px 20px 6px 10px', width: 'auto' }}>
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} className="input-field text-sm" style={{ padding: '6px 10px', width: '80px' }} min="2020" max="2100" />
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary text-sm flex items-center gap-1.5">
            <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
            Budget
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="text-sm font-semibold mb-4">Nouveau budget</h2>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">Catégorie</label>
                <select value={formCategoryId} onChange={e => setFormCategoryId(e.target.value)} className="input-field text-sm" required>
                  <option value="">Sélectionner...</option>
                  {expCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Montant alloué</label>
                <input type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} className="input-field text-sm" min="0" step="any" required />
              </div>
              {commercialMode && (
                <div>
                  <label className="block text-xs text-muted mb-1">Portée</label>
                  <select value={formScope} onChange={e => setFormScope(e.target.value as "personal" | "activity")} className="input-field text-sm">
                    <option value="personal">Personnel</option>
                    <option value="activity">Activité</option>
                  </select>
                </div>
              )}
            </div>
            {error && <p className="text-neg text-sm">{error}</p>}
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => { resetForm(); setShowForm(false); }} className="btn-secondary text-sm">Annuler</button>
              <button type="submit" className="btn-primary text-sm">Enregistrer</button>
            </div>
          </form>
        </div>
      )}

      {budgets.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="w-12 h-12 bg-sand rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FontAwesomeIcon icon={faTriangleExclamation} className="w-5 h-5 text-muted" />
          </div>
          <p className="text-sm text-muted">Aucun budget pour {MONTHS.find(m => m.value === String(month))?.label} {year}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(commercialMode && activityBudgets.length > 0 ? [
            { label: "Personnel", items: personalBudgets },
            { label: "Activité", items: activityBudgets },
          ] : [
            { label: "Budgets", items: personalBudgets },
          ]).filter(s => s.items.length > 0).map(section => (
            <div key={section.label}>
              {commercialMode && <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2 px-1">{section.label}</p>}
              <div className="space-y-2">
                {section.items.map(b => (
                  <BudgetRow
                    key={b.id}
                    budget={b}
                    dayOfMonth={dayOfMonth}
                    daysInMonth={daysInMonth}
                    onEdit={() => openEdit(b)}
                    onDelete={() => handleDelete(b.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BudgetRow({ budget: b, dayOfMonth, daysInMonth, onEdit, onDelete }: { budget: Budget; dayOfMonth: number; daysInMonth: number; onEdit: () => void; onDelete: () => void }) {
  const remaining = b.amount - b.spent;
  const taux = b.amount > 0 ? (b.spent / b.amount) * 100 : 0;
  const dailyBurn = dayOfMonth > 0 ? b.spent / dayOfMonth : 0;
  const projectedMonth = dailyBurn * daysInMonth;
  const willOvershoot = projectedMonth > b.amount && b.amount > 0;
  const tauxDisplay = taux > 0 && taux < 1 ? taux.toFixed(1) : taux.toFixed(0);

  let status: "ok" | "warning" | "danger" = "ok";
  if (taux >= 100) status = "danger";
  else if (taux >= 75 || willOvershoot) status = "warning";

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-ink">{b.category.name}</p>
          {b.scope === "activity" && <span className="text-[10px] text-muted bg-sand px-1.5 py-0.5 rounded">Activité</span>}
        </div>
        <div className="flex items-center gap-2">
          {status === "danger" && <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 text-neg" title="Dépassé" />}
          {status === "warning" && <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 text-gold" title="Attention" />}
          {status === "ok" && <FontAwesomeIcon icon={faCircleCheck} className="w-4 h-4 text-pos" title="Dans les clous" />}
          <button onClick={onEdit} className="text-muted hover:text-ink transition-colors"><FontAwesomeIcon icon={faPen} className="w-3 h-3" /></button>
          <button onClick={onDelete} className="text-muted hover:text-neg transition-colors"><FontAwesomeIcon icon={faTrash} className="w-3 h-3" /></button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-2">
        <div>
          <p className="text-[10px] text-muted">Alloué</p>
          <p className="text-sm font-semibold tabular-nums">{formatCurrency(b.amount)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted">Dépensé</p>
          <p className="text-sm font-semibold tabular-nums text-neg">{formatCurrency(b.spent)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted">Restant</p>
          <p className={`text-sm font-semibold tabular-nums ${remaining < 0 ? "text-neg" : "text-pos"}`}>{formatCurrency(remaining)}</p>
        </div>
      </div>

      <div className="h-1.5 bg-sand rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            status === "danger" ? "bg-neg" : status === "warning" ? "bg-gold" : "bg-pos"
          }`}
          style={{ width: `${Math.min(taux, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className={`font-medium ${status === "danger" ? "text-neg" : status === "warning" ? "text-gold" : "text-pos"}`}>
          {tauxDisplay}%
        </span>
        {willOvershoot && taux < 100 && (
          <span className="text-gold flex items-center gap-1">
            <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
            Dépassement prévu ({formatCurrency(projectedMonth - b.amount)})
          </span>
        )}
        {taux >= 100 && (
          <span className="text-neg font-medium">Dépassé de {formatCurrency(Math.abs(remaining))}</span>
        )}
      </div>
    </div>
  );
}
