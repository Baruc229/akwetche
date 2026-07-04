"use client";

import { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTrash, faCircleCheck, faCircle, faPen, faBolt, faSpinner, faArrowTrendUp, faClock, faCheckCircle, faCalendar, faMoneyBillWave } from '@fortawesome/free-solid-svg-icons';
import { useDashboard } from "../../../layout";
import { formatCurrency, toStorageCurrency, toDisplayCurrency, roundByCurrency } from "@/lib/utils";

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

export default function RevenusRecurrentsPage() {
  const { commercialMode, currency } = useDashboard();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formScope, setFormScope] = useState<"personal" | "activity">("personal");
  const [formDayOfMonth, setFormDayOfMonth] = useState("1");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [error, setError] = useState("");

  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const today = new Date().getDate();

  async function loadData() {
    try {
      const [tRes, cRes] = await Promise.all([
        fetch("/api/recurring"),
        fetch("/api/categories"),
      ]);
      const tData = await tRes.json();
      const cData = await cRes.json();
      setTemplates(tData.templates?.filter((t: Template) => t.type === "income") || []);
      setCategories(cData.categories?.filter((c: Category) => !c.archived) || []);
    } catch { setError("Erreur de chargement"); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, []);

  function resetForm() {
    setFormName("");
    setFormAmount("");
    setFormScope("personal");
    setFormDayOfMonth("1");
    setFormCategoryId("");
    setEditingId(null);
    setError("");
  }

  function openEdit(t: Template) {
    setFormName(t.name);
    setFormAmount(String(roundByCurrency(toDisplayCurrency(t.amount, currency), currency)));
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
    const displayAmount = parseFloat(formAmount);
    if (!displayAmount || displayAmount <= 0) { setError("Montant invalide"); return; }
    if (!formName.trim()) { setError("Nom requis"); return; }

    const amount = toStorageCurrency(displayAmount, currency);
    const body = { name: formName.trim(), amount, type: "income" as const, scope: formScope, dayOfMonth: day, categoryId: formCategoryId || null };

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
      setGenResult(`${data.created} transaction(s) créée(s)`);
      loadData();
    } catch { setGenResult("Erreur lors de la génération"); }
    finally { setGenLoading(false); }
  }

  const totalMonthly = templates.reduce((s, t) => s + (t.active ? t.amount : 0), 0);
  const activeCount = templates.filter(t => t.active).length;
  const generatedCount = templates.filter(t => t.generatedThisMonth > 0).length;
  const pendingCount = templates.filter(t => t.active && t.dayOfMonth <= today && t.generatedThisMonth === 0).length;

  if (loading) return (
    <div className="space-y-3">
      <div className="card p-8 text-center text-muted text-sm">Chargement...</div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-dm-sans)] font-bold">Revenus récurrents</h1>
          <p className="text-sm text-muted mt-0.5">Salaires, pensions, revenus locatifs</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleGenerate} disabled={genLoading} className="btn-secondary text-sm flex items-center gap-1.5">
            <FontAwesomeIcon icon={genLoading ? faSpinner : faBolt} className={`w-4 h-4 ${genLoading ? "animate-spin" : ""}`} />
            Générer
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary text-sm flex items-center gap-1.5" style={{background:'var(--color-pos)', borderColor:'var(--color-pos)'}}>
            <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Gen result */}
      {genResult && (
        <div className="card bg-pos-bg text-pos-light text-sm p-3 flex items-center gap-2">
          <FontAwesomeIcon icon={faCircleCheck} className="w-4 h-4" />
          {genResult}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-3.5">
          <p className="text-xs text-muted mb-1">Total mensuel</p>
          <p className="text-lg font-bold text-pos tabular-nums">{formatCurrency(totalMonthly)}</p>
        </div>
        <div className="card p-3.5">
          <p className="text-xs text-muted mb-1">Actifs</p>
          <p className="text-lg font-bold tabular-nums">{activeCount}<span className="text-sm text-muted font-normal">/{templates.length}</span></p>
        </div>
        <div className="card p-3.5">
          <p className="text-xs text-muted mb-1">Générés ce mois</p>
          <p className="text-lg font-bold text-pos tabular-nums">{generatedCount}</p>
        </div>
        <div className="card p-3.5">
          <p className="text-xs text-muted mb-1">En attente</p>
          <p className="text-lg font-bold text-gold tabular-nums">{pendingCount}</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card" style={{borderLeft:'3px solid var(--color-pos)'}}>
          <h2 className="text-sm font-semibold mb-4">{editingId ? "Modifier" : "Nouveau"} revenu récurrent</h2>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">Nom</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className="input-field text-sm" placeholder="Salaire, Pension, Loyer perçu..." required />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Montant</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs font-semibold pointer-events-none">{currency === "XOF" ? "FCFA" : "EUR"}</span>
                  <input type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} className="input-field text-sm pl-14" min="0" step="any" required />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Jour de versement</label>
                <input type="number" value={formDayOfMonth} onChange={e => setFormDayOfMonth(e.target.value)} className="input-field text-sm" min="1" max={daysInMonth} required />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Catégorie</label>
                <select value={formCategoryId} onChange={e => setFormCategoryId(e.target.value)} className="input-field text-sm">
                  <option value="">Sans catégorie</option>
                  {categories.filter(c => c.type === "income").map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
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
            </div>
            {error && <p className="text-neg text-sm">{error}</p>}
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => { resetForm(); setShowForm(false); }} className="btn-secondary text-sm">Annuler</button>
              <button type="submit" className="btn-primary text-sm" style={{background:'var(--color-pos)', borderColor:'var(--color-pos)'}}>{editingId ? "Enregistrer" : "Créer"}</button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {templates.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{background:'var(--color-pos-bg)'}}>
            <FontAwesomeIcon icon={faMoneyBillWave} className="w-6 h-6" style={{color:'var(--color-pos)'}} />
          </div>
          <p className="text-sm font-medium mb-1">Aucun revenu récurrent</p>
          <p className="text-xs text-muted mb-4">Ajoutez vos salaires, pensions et revenus réguliers</p>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary text-sm" style={{background:'var(--color-pos)', borderColor:'var(--color-pos)'}}>
            <FontAwesomeIcon icon={faPlus} className="w-4 h-4 mr-1.5" />
            Ajouter un revenu
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} className={`card flex items-center gap-3.5 ${!t.active ? "opacity-50" : ""}`}>
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{background:'var(--color-pos-bg)'}}>
                <FontAwesomeIcon icon={faArrowTrendUp} className="w-[18px] h-[18px]" style={{color:'var(--color-pos)'}} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate">{t.name}</p>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${t.active ? 'bg-pos-bg text-pos' : 'bg-sand text-muted'}`}>
                    {t.active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <span className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faCalendar} className="w-3 h-3" />
                    Jour {t.dayOfMonth}
                  </span>
                  <span>·</span>
                  <span>{t.category?.icon} {t.category?.name || "Sans catégorie"}</span>
                  {t.scope === "activity" && (
                    <><span>·</span><span className="text-gold">Activité</span></>
                  )}
                </p>
              </div>

              {/* Amount + Status */}
              <div className="text-right shrink-0">
                <p className="text-base font-bold text-pos tabular-nums leading-none">{formatCurrency(t.amount)}</p>
                <p className="text-xs mt-0.5">
                  {t.active && t.dayOfMonth <= today ? (
                    t.generatedThisMonth > 0 ? (
                      <span className="flex items-center gap-1 justify-end text-pos">
                        <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3" />
                        Généré
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 justify-end" style={{color:'var(--color-gold)'}}>
                        <FontAwesomeIcon icon={faClock} className="w-3 h-3" />
                        En attente
                      </span>
                    )
                  ) : t.active ? (
                    <span className="text-muted flex items-center gap-1 justify-end">
                        <FontAwesomeIcon icon={faCalendar} className="w-3 h-3" />
                          Versement j{t.dayOfMonth}
                    </span>
                  ) : (
                    <span className="text-muted">Désactivé</span>
                  )}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button onClick={() => handleToggleActive(t)} className="p-1.5 rounded-lg hover:bg-sand text-muted hover:text-ink transition-all" title={t.active ? "Désactiver" : "Activer"}>
                  <FontAwesomeIcon icon={t.active ? faCircleCheck : faCircle} className="w-4 h-4" />
                </button>
                <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-sand text-muted hover:text-ink transition-all" title="Modifier">
                  <FontAwesomeIcon icon={faPen} className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded-lg hover:bg-neg-bg text-muted hover:text-neg transition-all" title="Supprimer">
                  <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
