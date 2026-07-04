"use client";

import { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTrash, faPen, faTriangleExclamation, faCircleCheck, faArrowRight, faSackDollar, faFire } from '@fortawesome/free-solid-svg-icons';
import { useDashboard } from "../../layout";
import { formatCurrency, toStorageCurrency, toDisplayCurrency, roundByCurrency } from "@/lib/utils";

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
  const { commercialMode, currency } = useDashboard();
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
    setFormCategoryId(""); setFormScope("personal"); setFormAmount(""); setEditingId(null); setError("");
  }

  function openEdit(b: Budget) {
    setFormCategoryId(String(b.categoryId));
    setFormScope(b.scope);
    setFormAmount(String(roundByCurrency(toDisplayCurrency(b.amount, currency), currency)));
    setEditingId(b.id); setShowForm(true); setError("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (!formCategoryId) { setError("Catégorie requise"); return; }
    const displayAmount = parseFloat(formAmount);
    if (!displayAmount || displayAmount <= 0) { setError("Montant invalide"); return; }
    const amount = toStorageCurrency(displayAmount, currency);
    const body = { categoryId: formCategoryId, scope: formScope, amount, month, year };
    const res = await fetch("/api/budgets", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (!res.ok) { setError("Erreur d'enregistrement"); return; }
    resetForm(); setShowForm(false); loadData();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/budgets/${id}`, { method: "DELETE" });
    loadData();
  }

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const totalTaux = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const personalBudgets = budgets.filter(b => b.scope === "personal");
  const activityBudgets = budgets.filter(b => b.scope === "activity");

  if (loading) return (
    <div className="space-y-3">
      <div className="card p-8 text-center text-muted text-sm">Chargement...</div>
    </div>
  );

  function BudgetRow({ budget: b }: { budget: Budget }) {
    const remaining = b.amount - b.spent;
    const taux = b.amount > 0 ? (b.spent / b.amount) * 100 : 0;
    const dailyBurn = dayOfMonth > 0 ? b.spent / dayOfMonth : 0;
    const projectedMonth = dailyBurn * daysInMonth;
    const willOvershoot = projectedMonth > b.amount && b.amount > 0;
    const tauxDisplay = taux > 0 && taux < 1 ? taux.toFixed(1) : taux.toFixed(0);
    const overshootAmount = projectedMonth - b.amount;

    let status: "ok" | "warning" | "danger" = "ok";
    if (taux >= 100) status = "danger";
    else if (taux >= 75 || willOvershoot) status = "warning";

    return (
      <div className="card px-5 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{
              background: status === "danger" ? 'var(--color-neg-bg)' : status === "warning" ? 'rgba(255,183,77,0.15)' : 'var(--color-pos-bg)',
            }}>
              <span className="text-base">{b.category.icon}</span>
            </div>
            <div>
              <p className="text-sm font-semibold">{b.category.name}</p>
              {b.scope === "activity" && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{background:'rgba(255,183,77,0.15)', color:'var(--color-gold)'}}>Activité</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-sm font-bold tabular-nums">{formatCurrency(b.amount)}</p>
              <p className="text-[10px] text-muted">alloué</p>
            </div>
            <div className="flex items-center gap-0.5">
              <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-sand text-muted hover:text-ink transition-all" title="Modifier">
                <FontAwesomeIcon icon={faPen} className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleDelete(b.id)} className="p-1.5 rounded-lg hover:bg-neg-bg text-muted hover:text-neg transition-all" title="Supprimer">
                <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 h-2.5 bg-sand rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                status === "danger" ? "bg-neg" : status === "warning" ? "bg-gold" : "bg-pos"
              }`}
              style={{ width: `${Math.min(taux, 100)}%` }}
            />
          </div>
          <span className={`text-xs font-bold tabular-nums shrink-0 ${
            status === "danger" ? "text-neg" : status === "warning" ? "text-gold" : "text-pos"
          }`}>
            {tauxDisplay}%
          </span>
        </div>

        {/* Spent / Remaining / Daily burn */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-2.5 rounded-lg" style={{background:'var(--color-neg-bg)'}}>
            <p className="text-[10px] text-muted">Dépensé</p>
            <p className="text-sm font-bold text-neg tabular-nums">{formatCurrency(b.spent)}</p>
          </div>
          <div className="p-2.5 rounded-lg" style={{
            background: remaining < 0 ? 'var(--color-neg-bg)' : 'var(--color-pos-bg)',
          }}>
            <p className="text-[10px] text-muted">Restant</p>
            <p className={`text-sm font-bold tabular-nums ${remaining < 0 ? "text-neg" : "text-pos"}`}>
              {remaining < 0 ? formatCurrency(Math.abs(remaining)) + " dépassé" : formatCurrency(remaining)}
            </p>
          </div>
          <div className="p-2.5 rounded-lg" style={{background:'var(--color-brand-subtle)'}}>
            <p className="text-[10px] text-muted">Moy. journalière</p>
            <p className="text-sm font-bold tabular-nums">{formatCurrency(Math.round(dailyBurn))}/j</p>
          </div>
        </div>

        {/* Alerts */}
        {taux >= 100 && (
          <div className="mt-2 flex items-center gap-2 p-2.5 rounded-lg text-xs font-semibold" style={{background:'var(--color-neg-bg)', color:'var(--color-neg)'}}>
            <FontAwesomeIcon icon={faFire} className="w-4 h-4" />
            Budget dépassé de {formatCurrency(Math.abs(remaining))}
          </div>
        )}
        {willOvershoot && taux < 100 && (
          <div className="mt-2 flex items-center gap-2 p-2.5 rounded-lg text-xs font-semibold" style={{background:'rgba(255,183,77,0.15)', color:'var(--color-gold)'}}>
            <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4" />
            <span>Dépassement prévu de <strong>{formatCurrency(Math.round(overshootAmount))}</strong> en fin de mois</span>
            <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3 ml-auto" />
          </div>
        )}
      </div>
    );
  }

  const sections: { label: string; items: Budget[] }[] = [];
  if (commercialMode && activityBudgets.length > 0) {
    if (personalBudgets.length > 0) sections.push({ label: "Personnel", items: personalBudgets });
    if (activityBudgets.length > 0) sections.push({ label: "Activité", items: activityBudgets });
  } else if (personalBudgets.length > 0) {
    sections.push({ label: "Budgets", items: personalBudgets });
  }

  return (
    <div className="space-y-4">
      {/* Hero header */}
      <div className="card overflow-hidden" style={{
        background: totalTaux >= 100
          ? 'linear-gradient(135deg, var(--color-neg) 0%, #b91c1c 100%)'
          : totalTaux >= 75
          ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
          : 'linear-gradient(135deg, var(--color-pos) 0%, #15803d 100%)',
      }}>
        <div className="flex items-center justify-between p-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:'rgba(255,255,255,0.2)'}}>
                <FontAwesomeIcon icon={faSackDollar} className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Budgets</h1>
                <p className="text-xs text-white/70">{MONTHS.find(m => m.value === String(month))?.label} {year}</p>
              </div>
            </div>
            <div className="flex items-center gap-6 mt-4">
              <div>
                <p className="text-3xl font-bold text-white tabular-nums">{formatCurrency(totalBudget)}</p>
                <p className="text-xs text-white/60">Budget total</p>
              </div>
              <div className="w-px h-10" style={{background:'rgba(255,255,255,0.2)'}} />
              <div>
                <p className="text-xl font-bold text-white tabular-nums">{formatCurrency(totalSpent)}</p>
                <p className="text-xs text-white/60">Dépensé</p>
              </div>
              <div className="w-px h-10" style={{background:'rgba(255,255,255,0.2)'}} />
              <div>
                <p className="text-xl font-bold text-white tabular-nums">{formatCurrency(totalRemaining)}</p>
                <p className="text-xs text-white/60">Restant</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 justify-end">
              <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border-none" style={{background:'rgba(255,255,255,0.2)', color:'white', WebkitAppearance:'none', MozAppearance:'none'}}>
                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border-none w-16 text-center" style={{background:'rgba(255,255,255,0.2)', color:'white'}} min="2020" max="2100" />
            </div>
            <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all" style={{background:'rgba(255,255,255,0.2)', color:'white'}}>
              <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
              Nouveau budget
            </button>
          </div>
        </div>
        {/* Mini total bar */}
        <div className="px-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.2)'}}>
              <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${Math.min(totalTaux, 100)}%` }} />
            </div>
            <span className="text-xs font-bold text-white tabular-nums">{totalTaux > 0 && totalTaux < 1 ? totalTaux.toFixed(1) : totalTaux.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card">
          <h2 className="text-sm font-semibold mb-4">{editingId ? "Modifier" : "Nouveau"} budget</h2>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">Catégorie</label>
                <select value={formCategoryId} onChange={e => setFormCategoryId(e.target.value)} className="input-field text-sm" required>
                  <option value="">Sélectionner...</option>
                  {expCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Montant alloué</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs font-semibold pointer-events-none">{currency === "XOF" ? "FCFA" : "EUR"}</span>
                  <input type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} className="input-field text-sm pl-14" min="0" step="any" required />
                </div>
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

      {/* Empty state */}
      {budgets.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{background:'var(--color-brand-subtle)'}}>
            <FontAwesomeIcon icon={faSackDollar} className="w-7 h-7" style={{color:'var(--color-brand)'}} />
          </div>
          <p className="text-base font-medium mb-1">Aucun budget défini</p>
          <p className="text-sm text-muted mb-5">Fixez des limites par catégorie pour {MONTHS.find(m => m.value === String(month))?.label} {year}</p>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary text-sm">
            <FontAwesomeIcon icon={faPlus} className="w-4 h-4 mr-1.5" />
            Créer un budget
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map(section => (
            <div key={section.label}>
              {commercialMode && (
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className="w-2 h-2 rounded-full" style={{background:'var(--color-brand)'}} />
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">{section.label}</p>
                </div>
              )}
              <div className="space-y-2">
                {section.items.map(b => <BudgetRow key={b.id} budget={b} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
