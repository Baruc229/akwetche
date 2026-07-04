"use client";

import { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTrash, faRotate, faCircleCheck, faCircle, faPen, faBolt, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { useDashboard } from "../../layout";
import { formatCurrency } from "@/lib/utils";

type Template = {
  id: number;
  name: string;
  amount: number;
  type: "income" | "expense";
  scope: "personal" | "activity";
  dayOfMonth: number;
  categoryId: number | null;
  active: boolean;
  userId: number;
  generatedThisMonth: number;
  category: { id: number; name: string; icon: string; type: string } | null;
};

type Category = { id: number; name: string; icon: string; type: string; archived: boolean };

export default function RecurringPage() {
  const { commercialMode } = useDashboard();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formType, setFormType] = useState<"income" | "expense">("expense");
  const [formScope, setFormScope] = useState<"personal" | "activity">("personal");
  const [formDayOfMonth, setFormDayOfMonth] = useState("1");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [error, setError] = useState("");

  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

  async function loadData() {
    try {
      const [tRes, cRes] = await Promise.all([
        fetch("/api/recurring"),
        fetch("/api/categories"),
      ]);
      const tData = await tRes.json();
      const cData = await cRes.json();
      setTemplates(tData.templates || []);
      setCategories(cData.categories?.filter((c: Category) => !c.archived) || []);
    } catch { setError("Erreur de chargement"); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, []);

  function resetForm() {
    setFormName("");
    setFormAmount("");
    setFormType("expense");
    setFormScope("personal");
    setFormDayOfMonth("1");
    setFormCategoryId("");
    setEditingId(null);
    setError("");
  }

  function openEdit(t: Template) {
    setFormName(t.name);
    setFormAmount(String(t.amount));
    setFormType(t.type);
    setFormScope(t.scope);
    setFormDayOfMonth(String(t.dayOfMonth));
    setFormCategoryId(t.categoryId ? String(t.categoryId) : "");
    setEditingId(t.id);
    setShowForm(true);
    setError("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const day = parseInt(formDayOfMonth);
    if (day < 1 || day > daysInMonth) { setError(`Jour invalide (1-${daysInMonth})`); return; }
    const amount = parseFloat(formAmount);
    if (!amount || amount <= 0) { setError("Montant invalide"); return; }
    if (!formName.trim()) { setError("Nom requis"); return; }

    const body = { name: formName.trim(), amount, type: formType, scope: formScope, dayOfMonth: day, categoryId: formCategoryId || null };

    if (editingId) {
      const res = await fetch(`/api/recurring/${editingId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) { setError("Erreur de mise à jour"); return; }
    } else {
      const res = await fetch("/api/recurring", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) { setError("Erreur de création"); return; }
    }
    resetForm();
    setShowForm(false);
    loadData();
  }

  async function handleToggleActive(t: Template) {
    await fetch(`/api/recurring/${t.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !t.active }),
    });
    loadData();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/recurring/${id}`, { method: "DELETE" });
    loadData();
  }

  async function handleGenerate() {
    setGenLoading(true);
    setGenResult(null);
    try {
      const res = await fetch("/api/recurring/generate", { method: "POST" });
      const data = await res.json();
      setGenResult(`${data.created} transaction(s) créée(s) sur ${data.total} template(s)`);
      loadData();
    } catch { setGenResult("Erreur lors de la génération"); }
    finally { setGenLoading(false); }
  }

  const incomeTemplates = templates.filter(t => t.type === "income");
  const expenseTemplates = templates.filter(t => t.type === "expense");

  if (loading) return (
    <div className="space-y-3">
      <h1 className="text-2xl font-[family-name:var(--font-dm-sans)] font-bold">Récurrentes</h1>
      <div className="card p-8 text-center text-muted text-sm">Chargement...</div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-[family-name:var(--font-dm-sans)] font-bold">Récurrentes</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleGenerate} disabled={genLoading} className="btn-secondary text-sm flex items-center gap-1.5">
            <FontAwesomeIcon icon={genLoading ? faSpinner : faBolt} className={`w-4 h-4 ${genLoading ? "animate-spin" : ""}`} />
            Générer
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary text-sm flex items-center gap-1.5">
            <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
            Ajouter
          </button>
        </div>
      </div>

      {genResult && (
        <div className="card bg-pos-bg text-pos-light text-sm p-3 flex items-center gap-2">
          <FontAwesomeIcon icon={faCircleCheck} className="w-4 h-4" />
          {genResult}
        </div>
      )}

      {showForm && (
        <div className="card">
          <h2 className="text-sm font-semibold mb-4">{editingId ? "Modifier" : "Nouvelle"} récurrente</h2>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">Nom</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className="input-field text-sm" placeholder="Loyer, Salaire..." required />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Montant</label>
                <input type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} className="input-field text-sm" min="0" step="any" required />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Type</label>
                <select value={formType} onChange={e => setFormType(e.target.value as "income" | "expense")} className="input-field text-sm">
                  <option value="expense">Dépense</option>
                  <option value="income">Revenu</option>
                </select>
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
              <div>
                <label className="block text-xs text-muted mb-1">Jour d'échéance</label>
                <input type="number" value={formDayOfMonth} onChange={e => setFormDayOfMonth(e.target.value)} className="input-field text-sm" min="1" max={daysInMonth} required />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Catégorie</label>
                <select value={formCategoryId} onChange={e => setFormCategoryId(e.target.value)} className="input-field text-sm">
                  <option value="">Sans catégorie</option>
                  {categories.filter(c => c.type === formType).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {error && <p className="text-neg text-sm">{error}</p>}
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => { resetForm(); setShowForm(false); }} className="btn-secondary text-sm">Annuler</button>
              <button type="submit" className="btn-primary text-sm">{editingId ? "Enregistrer" : "Créer"}</button>
            </div>
          </form>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="w-12 h-12 bg-sand rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FontAwesomeIcon icon={faRotate} className="w-5 h-5 text-muted" />
          </div>
          <p className="text-sm text-muted">Aucune récurrente configurée</p>
        </div>
      ) : (
        <div className="space-y-4">
          {expenseTemplates.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2 px-1">Dépenses récurrentes</p>
              <div className="space-y-2">
                {expenseTemplates.map(t => <TemplateRow key={t.id} template={t} onEdit={() => openEdit(t)} onToggle={() => handleToggleActive(t)} onDelete={() => handleDelete(t.id)} />)}
              </div>
            </div>
          )}
          {incomeTemplates.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2 px-1">Revenus récurrents</p>
              <div className="space-y-2">
                {incomeTemplates.map(t => <TemplateRow key={t.id} template={t} onEdit={() => openEdit(t)} onToggle={() => handleToggleActive(t)} onDelete={() => handleDelete(t.id)} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TemplateRow({ template: t, onEdit, onToggle, onDelete }: { template: Template; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  const isDue = t.dayOfMonth <= new Date().getDate();
  return (
    <div className={`card flex items-center justify-between gap-3 ${!t.active ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onToggle} className="shrink-0" title={t.active ? "Désactiver" : "Activer"}>
          <FontAwesomeIcon icon={t.active ? faCircleCheck : faCircle} className={`w-5 h-5 ${t.active ? "text-pos" : "text-muted"}`} />
        </button>
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink truncate">{t.name}</p>
          <p className="text-xs text-muted">
            Jour {t.dayOfMonth} · {t.category?.name || "Sans catégorie"} {t.scope === "activity" ? "· Activité" : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className={`text-sm font-semibold tabular-nums ${t.type === "income" ? "text-pos" : "text-neg"}`}>
            {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
          </p>
          <p className="text-[10px] text-muted">
            {isDue && t.active ? (
              t.generatedThisMonth > 0
                ? <span className="text-pos">✓ Généré</span>
                : <span className="text-gold">En attente</span>
            ) : (
              <span className="text-muted">Jour {t.dayOfMonth}</span>
            )}
          </p>
        </div>
        <button onClick={onEdit} className="text-muted hover:text-ink transition-colors" title="Modifier">
          <FontAwesomeIcon icon={faPen} className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="text-muted hover:text-neg transition-colors" title="Supprimer">
          <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
