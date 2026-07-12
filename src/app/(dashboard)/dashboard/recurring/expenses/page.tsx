"use client";

import { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTrash, faCircleCheck, faCircle, faPen, faBolt, faSpinner, faArrowTrendDown, faClock, faCalendar, faTriangleExclamation, faCheck, faCreditCard, faHouse, faWifi, faCar, faHeart, faGraduationCap, faUtensils } from '@fortawesome/free-solid-svg-icons';
import { useDashboard } from "../../../layout";
import { formatCurrency, toStorageCurrency, toDisplayCurrency, roundByCurrency } from "@/lib/utils";
import CustomSelect from "@/components/ui/CustomSelect";

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

export default function DepensesRecurrentesPage() {
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

  const categoryOptions = [
    { value: "", label: "Sans catégorie" },
    ...categories
      .filter(c => c.type === "expense")
      .sort((a, b) => a.id - b.id)
      .map(c => ({ value: String(c.id), label: c.name })),
  ];

  async function loadData() {
    try {
      const [tRes, cRes] = await Promise.all([
        fetch("/api/recurring"),
        fetch("/api/categories"),
      ]);
      const tData = await tRes.json();
      const cData = await cRes.json();
      setTemplates(tData.templates?.filter((t: Template) => t.type === "expense") || []);
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
    const body = { name: formName.trim(), amount, type: "expense" as const, scope: formScope, dayOfMonth: day, categoryId: formCategoryId || null };
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
      fetch("/api/recurring/generate", { method: "POST" }).catch(() => {});
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
    <div className="space-y-4 animate-pulse">
      <div className="card overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--color-neg) 0%, #b91c1c 100%)' }}>
        <div className="p-3 sm:p-5">
          <div className="flex items-center gap-3 mb-6">
            <div className="skeleton w-10 h-10 rounded-xl" />
            <div className="space-y-2"><div className="skeleton h-5 w-48" /><div className="skeleton h-3 w-32" /></div>
          </div>
          <div className="skeleton h-8 w-36 mb-1" />
          <div className="skeleton h-3 w-52" />
        </div>
        <div className="grid grid-cols-3" style={{ background:'rgba(255,255,255,0.1)' }}>
          {[1,2,3].map(i => (
            <div key={i} className="p-2 sm:p-3" style={{ background:'rgba(0,0,0,0.15)' }}>
              <div className="skeleton h-3 w-12 mb-1.5" style={{ background:'rgba(255,255,255,0.3)' }} />
              <div className="skeleton h-5 w-8" style={{ background:'rgba(255,255,255,0.3)' }} />
            </div>
          ))}
        </div>
      </div>
      {[1,2,3].map(i => (
        <div key={i} className="card flex items-center gap-3 px-3 py-3">
          <div className="skeleton w-10 h-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-3 w-20" />
          </div>
          <div className="skeleton h-5 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );

  function TemplateCard({ t }: { t: Template }) {
    const isDue = t.dayOfMonth <= today;
    const isGenerated = t.generatedThisMonth > 0;

    const statusBadge = isDue && !isGenerated && t.active ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{background:'rgba(255,183,77,0.15)', color:'var(--color-gold)'}}>
        <FontAwesomeIcon icon={faClock} className="w-2.5 h-2.5" />
        <span className="hidden sm:inline">En attente</span>
      </span>
    ) : isGenerated ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-pos-bg text-pos">
        <FontAwesomeIcon icon={faCheck} className="w-2.5 h-2.5" />
        <span className="hidden sm:inline">Généré</span>
      </span>
    ) : t.active ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{background:'var(--color-brand-subtle)', color:'var(--color-muted)'}}>
        <FontAwesomeIcon icon={faCalendar} className="w-2.5 h-2.5" />
        J+{t.dayOfMonth - today}
      </span>
    ) : null;

    return (
      <div className="card px-3 py-3 sm:px-4 sm:py-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-lg flex flex-col items-center justify-center leading-none" style={{
            background: isDue ? (isGenerated ? 'var(--color-pos-bg)' : 'var(--color-neg-bg)') : 'var(--color-brand-subtle)',
            border: `1.5px solid ${isDue ? (isGenerated ? 'var(--color-pos)' : 'var(--color-neg)') : 'transparent'}`,
          }}>
            <span className="text-[8px] sm:text-[9px] font-bold uppercase" style={{
              color: isDue ? (isGenerated ? 'var(--color-pos)' : 'var(--color-neg)') : 'var(--color-muted)',
            }}>{isDue ? (isGenerated ? 'FAIT' : 'DU') : ''}</span>
            <span className="text-base sm:text-lg font-bold" style={{
              color: isDue ? (isGenerated ? 'var(--color-pos)' : 'var(--color-neg)') : 'var(--color-ink)',
            }}>{t.dayOfMonth}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold truncate">{t.name}</p>
              {t.scope === "activity" && (
                <span className="text-[9px] font-semibold px-1 py-0.5 rounded-full shrink-0" style={{background:'rgba(255,183,77,0.15)', color:'var(--color-gold)'}}>Act.</span>
              )}
              {!t.active && (
                <span className="text-[9px] font-semibold px-1 py-0.5 rounded-full bg-sand text-muted shrink-0">Off</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[11px] text-muted truncate">{t.category?.name || 'Sans catégorie'}</p>
              {statusBadge}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <p className="text-sm font-bold text-neg tabular-nums leading-none">{formatCurrency(t.amount)}</p>
            <p className="text-[9px] text-muted">/ mois</p>
            <div className="flex items-center gap-0.5">
              <button onClick={() => handleToggleActive(t)} className="p-1 rounded-md hover:bg-sand text-muted hover:text-ink transition-all" title={t.active ? "Désactiver" : "Activer"}>
                <FontAwesomeIcon icon={t.active ? faCircleCheck : faCircle} className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => openEdit(t)} className="p-1 rounded-md hover:bg-sand text-muted hover:text-ink transition-all" title="Modifier">
                <FontAwesomeIcon icon={faPen} className="w-3 h-3" />
              </button>
              <button onClick={() => handleDelete(t.id)} className="p-1 rounded-md hover:bg-neg-bg text-muted hover:text-neg transition-all" title="Supprimer">
                <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const scopeOptions = [
    { value: "personal", label: "Personnel" },
    { value: "activity", label: "Activité" },
  ];

  if (showForm) {
    const formFields = (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="field-label">Nom</label>
            <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className="input-field text-sm" placeholder="ex: Loyer, Netflix" required />
          </div>
          <div>
            <label className="field-label">Montant</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs font-semibold pointer-events-none">{currency === "XOF" ? "FCFA" : "EUR"}</span>
              <input type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} className="input-field text-sm pl-14" min="0" step="any" required />
            </div>
          </div>
          <div>
            <label className="field-label">Jour d'échéance</label>
            <input type="number" value={formDayOfMonth} onChange={e => setFormDayOfMonth(e.target.value)} className="input-field text-sm" min="1" max={daysInMonth} required />
          </div>
          <div>
            <label className="field-label">Catégorie</label>
            <CustomSelect options={categoryOptions} value={formCategoryId} onChange={(v) => setFormCategoryId(v)} placeholder="Sélectionner..." />
          </div>
          {commercialMode && (
            <div className="sm:col-span-2">
              <label className="field-label">Portée</label>
              <CustomSelect options={scopeOptions} value={formScope} onChange={(v) => setFormScope(v as "personal" | "activity")} placeholder="Sélectionner..." />
            </div>
          )}
        </div>
        {error && <p className="alert-inline neg text-sm">{error}</p>}
      </>
    );

    return (
      <>
        {/* Mobile: full-page overlay */}
        <div className="fixed inset-0 z-50 md:hidden bg-[var(--color-bg)] animate-slide-up flex flex-col">
          <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-[var(--color-surface)] border-b">
            <button onClick={() => { resetForm(); setShowForm(false); }} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-sand transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 rotate-180"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            </button>
            <h1 className="text-base font-bold text-ink truncate">{editingId ? "Modifier" : "Nouvelle"} dépense</h1>
          </div>
          <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 space-y-4">{formFields}</div>
            <div className="shrink-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] p-5">
              {error && <div className="alert-inline neg mb-3 text-sm">{error}</div>}
              <button type="submit" className="btn-primary w-full py-3 text-sm" style={{background:'var(--color-neg)', borderColor:'var(--color-neg)'}}>
                {editingId ? "Enregistrer" : "Créer"}
              </button>
            </div>
          </form>
        </div>

        {/* Desktop: centered modal */}
        <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4 bg-black/40 animate-fade-in">
          <div className="bg-[var(--color-surface)] rounded-2xl p-6 w-full max-w-md shadow-xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">{editingId ? "Modifier" : "Nouvelle"} dépense récurrente</h2>
              <button onClick={() => { resetForm(); setShowForm(false); }} className="text-xs text-muted hover:text-ink">Annuler</button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              {formFields}
              <button type="submit" className="btn-primary w-full py-3 text-sm" style={{background:'var(--color-neg)', borderColor:'var(--color-neg)'}}>
                {editingId ? "Enregistrer" : "Créer"}
              </button>
            </form>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden" style={{
        background: 'linear-gradient(135deg, var(--color-neg) 0%, #b91c1c 100%)',
      }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-3 sm:p-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center" style={{background:'rgba(255,255,255,0.2)'}}>
                <FontAwesomeIcon icon={faArrowTrendDown} className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white">Dépenses récurrentes</h1>
                <p className="text-[10px] sm:text-xs text-white/70">Abonnements, loyers, charges mensuelles</p>
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white mt-3 sm:mt-4 tabular-nums">{formatCurrency(totalMonthly)}</p>
            <p className="text-[10px] sm:text-xs text-white/60 mt-0.5">Total mensuel des dépenses actives</p>
          </div>
          <div className="flex gap-2 sm:flex-col">
            <button onClick={() => { resetForm(); setShowForm(true); }} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all" style={{background:'rgba(255,255,255,0.2)', color:'white'}}>
              <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
              Ajouter
            </button>
            <button onClick={handleGenerate} disabled={genLoading} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all" style={{background:'rgba(255,255,255,0.12)', color:'white'}}>
              <FontAwesomeIcon icon={genLoading ? faSpinner : faBolt} className={`w-4 h-4 ${genLoading ? "animate-spin" : ""}`} />
              Générer
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-px" style={{background:'rgba(255,255,255,0.1)'}}>
          <div className="p-2 sm:p-3" style={{background:'rgba(0,0,0,0.15)'}}>
            <p className="text-[9px] sm:text-[10px] text-white/60">Actives</p>
            <p className="text-xs sm:text-sm font-bold text-white">{activeTemplates.length}/{templates.length}</p>
          </div>
          <div className="p-2 sm:p-3" style={{background:'rgba(0,0,0,0.15)'}}>
            <p className="text-[9px] sm:text-[10px] text-white/60">Générées</p>
            <p className="text-xs sm:text-sm font-bold text-white">{generatedCount}</p>
          </div>
          <div className="p-2 sm:p-3" style={{background:'rgba(0,0,0,0.15)'}}>
            <p className="text-[9px] sm:text-[10px] text-white/60">En attente</p>
            <p className="text-xs sm:text-sm font-bold text-amber-200">{pendingCount}</p>
          </div>
        </div>
      </div>

      {genResult && (
        <div className="card text-sm p-3 flex items-center gap-2" style={{background:'var(--color-pos-bg)', color:'var(--color-pos)'}}>
          <FontAwesomeIcon icon={faCircleCheck} className="w-4 h-4" />
          {genResult}
        </div>
      )}

      {templates.length === 0 ? (
        <div className="card p-8 sm:p-12 text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{background:'var(--color-neg-bg)'}}>
            <FontAwesomeIcon icon={faArrowTrendDown} className="w-6 h-6 sm:w-7 sm:h-7" style={{color:'var(--color-neg)'}} />
          </div>
          <p className="text-base font-medium mb-1">Aucune dépense récurrente</p>
          <p className="text-sm text-muted mb-5">Ajoutez vos abonnements, loyers et charges mensuelles</p>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary text-sm" style={{background:'var(--color-neg)', borderColor:'var(--color-neg)'}}>
            <FontAwesomeIcon icon={faPlus} className="w-4 h-4 mr-1.5" />
            Ajouter une dépense
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {pastTemplates.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className="w-2 h-2 rounded-full" style={{background: pendingCount > 0 ? 'var(--color-gold)' : 'var(--color-pos)'}} />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  À traiter ce mois ({pastTemplates.length})
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

          {inactiveCount > 0 && (
            <details className="group">
              <summary className="flex items-center gap-2 mb-2 px-1 cursor-pointer text-muted hover:text-ink transition-colors">
                <div className="w-2 h-2 rounded-full bg-sand" />
                <p className="text-xs font-semibold uppercase tracking-wider">
                  Désactivées ({inactiveCount})
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
