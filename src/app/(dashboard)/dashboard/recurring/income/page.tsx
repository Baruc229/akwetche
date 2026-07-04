"use client";

import { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTrash, faCircleCheck, faCircle, faPen, faBolt, faSpinner, faArrowTrendUp, faClock, faCalendar, faCheck, faMoneyBillWave, faBriefcase, faHandHoldingDollar, faBuilding, faChartLine, faGift, faHandshake } from '@fortawesome/free-solid-svg-icons';
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

const FALLBACK_ICONS_INCOME: Record<string, any> = {
  salaire: faBriefcase, paie: faBriefcase,
  pension: faHandHoldingDollar, retraite: faHandHoldingDollar,
  loyer: faBuilding, location: faBuilding, immobilier: faBuilding,
  investissement: faChartLine, dividende: faChartLine, bourse: faChartLine,
  don: faGift, cadeau: faGift,
  freelance: faHandshake, consult: faHandshake, contrat: faHandshake,
  activité: faMoneyBillWave, business: faMoneyBillWave, commerce: faMoneyBillWave,
};

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
    setFormName(""); setFormAmount(""); setFormScope("personal");
    setFormDayOfMonth("1"); setFormCategoryId(""); setEditingId(null); setError("");
  }

  function openEdit(t: Template) {
    setFormName(t.name);
    setFormAmount(String(roundByCurrency(toDisplayCurrency(t.amount, currency), currency)));
    setFormScope(t.scope); setFormDayOfMonth(String(t.dayOfMonth));
    setFormCategoryId(t.categoryId ? String(t.categoryId) : "");
    setEditingId(t.id); setShowForm(true); setError("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setError("");
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
    resetForm(); setShowForm(false); loadData();
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
    setGenLoading(true); setGenResult(null);
    try {
      const res = await fetch("/api/recurring/generate", { method: "POST" });
      const data = await res.json();
      setGenResult(`${data.created} transaction(s) créée(s)`);
      loadData();
    } catch { setGenResult("Erreur lors de la génération"); }
    finally { setGenLoading(false); }
  }

  const activeTemplates = templates.filter(t => t.active);
  const totalMonthly = activeTemplates.reduce((s, t) => s + t.amount, 0);
  const generatedCount = templates.filter(t => t.generatedThisMonth > 0).length;
  const pendingCount = templates.filter(t => t.active && t.dayOfMonth <= today && t.generatedThisMonth === 0).length;
  const inactiveCount = templates.filter(t => !t.active).length;

  const pastTemplates = activeTemplates.filter(t => t.dayOfMonth <= today).sort((a, b) => a.dayOfMonth - b.dayOfMonth);
  const futureTemplates = activeTemplates.filter(t => t.dayOfMonth > today).sort((a, b) => a.dayOfMonth - b.dayOfMonth);

  if (loading) return (
    <div className="space-y-3">
      <div className="card p-8 text-center text-muted text-sm">Chargement...</div>
    </div>
  );

  function TemplateCard({ t }: { t: Template }) {
    const isDue = t.dayOfMonth <= today;
    const isGenerated = t.generatedThisMonth > 0;
    const catIcon = t.category?.icon ? t.category.icon : (Object.entries(FALLBACK_ICONS_INCOME).find(([key]) => t.name.toLowerCase().includes(key))?.[1] || faMoneyBillWave);

    return (
      <div className="card flex items-center gap-4 px-5 py-4">
        {/* Date badge */}
        <div className="w-14 h-14 shrink-0 rounded-xl flex flex-col items-center justify-center leading-none" style={{
          background: isDue ? (isGenerated ? 'var(--color-pos-bg)' : 'var(--color-pos-bg)') : 'var(--color-pos-bg)',
          border: `1.5px solid ${isDue ? (isGenerated ? 'var(--color-pos)' : 'var(--color-gold)') : 'var(--color-brand)'}`,
        }}>
          <span className="text-[10px] font-semibold" style={{
            color: isDue ? (isGenerated ? 'var(--color-pos)' : 'var(--color-gold)') : 'var(--color-brand)',
          }}>{isDue ? (isGenerated ? 'REÇU' : 'DU') : 'JOUR'}</span>
          <span className="text-xl font-bold" style={{
            color: isDue ? (isGenerated ? 'var(--color-pos)' : 'var(--color-gold)') : 'var(--color-ink)',
          }}>{t.dayOfMonth}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold truncate">{t.name}</p>
            {t.scope === "activity" && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{background:'rgba(255,183,77,0.15)', color:'var(--color-gold)'}}>Activité</span>
            )}
            {!t.active && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-sand text-muted">Inactif</span>
            )}
          </div>
          <p className="text-xs text-muted mt-0.5 flex items-center gap-1.5 flex-wrap">
            {catIcon && <FontAwesomeIcon icon={catIcon} className="w-3 h-3" style={{color:'var(--color-muted)'}} />}
            <span>{t.category?.name || 'Sans catégorie'}</span>
          </p>
        </div>

        {/* Amount */}
        <div className="text-right shrink-0">
          <p className="text-base font-bold text-pos tabular-nums leading-none">{formatCurrency(t.amount)}</p>
          <p className="text-[10px] text-muted mt-0.5">/ mois</p>
        </div>

        {/* Status */}
        <div className="shrink-0">
          {isDue && !isGenerated && t.active ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold" style={{background:'rgba(255,183,77,0.15)', color:'var(--color-gold)'}}>
              <FontAwesomeIcon icon={faClock} className="w-3 h-3" />
              En attente
            </div>
          ) : isGenerated ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-pos-bg text-pos">
              <FontAwesomeIcon icon={faCheck} className="w-3 h-3" />
              Reçu
            </div>
          ) : t.active ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold" style={{background:'var(--color-brand-subtle)', color:'var(--color-muted)'}}>
              <FontAwesomeIcon icon={faCalendar} className="w-3 h-3" />
              J+{t.dayOfMonth - today}
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
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
    );
  }

  return (
    <div className="space-y-4">
      {/* Hero header */}
      <div className="card overflow-hidden" style={{
        background: 'linear-gradient(135deg, var(--color-pos) 0%, #15803d 100%)',
      }}>
        <div className="flex items-center justify-between p-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:'rgba(255,255,255,0.2)'}}>
                <FontAwesomeIcon icon={faArrowTrendUp} className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Revenus récurrents</h1>
                <p className="text-xs text-white/70">Salaires, pensions, revenus locatifs</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-white mt-4 tabular-nums">{formatCurrency(totalMonthly)}</p>
            <p className="text-xs text-white/60 mt-0.5">Total mensuel des revenus actifs</p>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all" style={{background:'rgba(255,255,255,0.2)', color:'white'}}>
              <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
              Ajouter
            </button>
            <button onClick={handleGenerate} disabled={genLoading} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all" style={{background:'rgba(255,255,255,0.12)', color:'white'}}>
              <FontAwesomeIcon icon={genLoading ? faSpinner : faBolt} className={`w-4 h-4 ${genLoading ? "animate-spin" : ""}`} />
              Générer
            </button>
          </div>
        </div>
        {/* Mini stats row */}
        <div className="grid grid-cols-3 gap-px" style={{background:'rgba(255,255,255,0.1)'}}>
          <div className="p-3" style={{background:'rgba(0,0,0,0.15)'}}>
            <p className="text-[10px] text-white/60">Actifs</p>
            <p className="text-sm font-bold text-white">{activeTemplates.length}/{templates.length}</p>
          </div>
          <div className="p-3" style={{background:'rgba(0,0,0,0.15)'}}>
            <p className="text-[10px] text-white/60">Reçus</p>
            <p className="text-sm font-bold text-white">{generatedCount}</p>
          </div>
          <div className="p-3" style={{background:'rgba(0,0,0,0.15)'}}>
            <p className="text-[10px] text-white/60">En attente</p>
            <p className="text-sm font-bold text-amber-200">{pendingCount}</p>
          </div>
        </div>
      </div>

      {/* Gen result */}
      {genResult && (
        <div className="card text-sm p-3 flex items-center gap-2" style={{background:'var(--color-pos-bg)', color:'var(--color-pos)'}}>
          <FontAwesomeIcon icon={faCircleCheck} className="w-4 h-4" />
          {genResult}
        </div>
      )}

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

      {/* Empty state */}
      {templates.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{background:'var(--color-pos-bg)'}}>
            <FontAwesomeIcon icon={faMoneyBillWave} className="w-7 h-7" style={{color:'var(--color-pos)'}} />
          </div>
          <p className="text-base font-medium mb-1">Aucun revenu récurrent</p>
          <p className="text-sm text-muted mb-5">Ajoutez vos salaires, pensions et revenus réguliers</p>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary text-sm" style={{background:'var(--color-pos)', borderColor:'var(--color-pos)'}}>
            <FontAwesomeIcon icon={faPlus} className="w-4 h-4 mr-1.5" />
            Ajouter un revenu
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Past due section */}
          {pastTemplates.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className="w-2 h-2 rounded-full" style={{background: pendingCount > 0 ? 'var(--color-gold)' : 'var(--color-pos)'}} />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  À percevoir ce mois ({pastTemplates.length})
                </p>
                {pendingCount > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{background:'rgba(255,183,77,0.15)', color:'var(--color-gold)'}}>
                    {pendingCount} en attente
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {pastTemplates.map(t => <TemplateCard key={t.id} t={t} />)}
              </div>
            </div>
          )}

          {/* Future section */}
          {futureTemplates.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className="w-2 h-2 rounded-full bg-muted" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  À venir ({futureTemplates.length})
                </p>
              </div>
              <div className="space-y-2">
                {futureTemplates.map(t => <TemplateCard key={t.id} t={t} />)}
              </div>
            </div>
          )}

          {/* Inactive section */}
          {inactiveCount > 0 && (
            <details className="group">
              <summary className="flex items-center gap-2 mb-2 px-1 cursor-pointer text-muted hover:text-ink transition-colors">
                <div className="w-2 h-2 rounded-full bg-sand" />
                <p className="text-xs font-semibold uppercase tracking-wider">
                  Désactivés ({inactiveCount})
                </p>
                <FontAwesomeIcon icon={faCircle} className="w-3 h-3 ml-auto group-open:rotate-90 transition-transform" />
              </summary>
              <div className="space-y-2 mt-2">
                {templates.filter(t => !t.active).map(t => <TemplateCard key={t.id} t={t} />)}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
