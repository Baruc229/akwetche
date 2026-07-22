"use client";

import { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTrash, faLock } from '@fortawesome/free-solid-svg-icons';
import { useDashboard } from "../../layout";
import { EXPENSE_ICONS, INCOME_ICONS, getDefaultIconForName } from "@/lib/categoryIcons";
import { FREE_CATEGORY_LIMIT_PER_TYPE } from "@/lib/limits";

type Category = { id: number; name: string; icon: string; type: string; archived: boolean };

const ICON_SETS = { income: INCOME_ICONS, expense: EXPENSE_ICONS };

export default function CategoriesPage() {
  const { user } = useDashboard();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategoryIds, setActiveCategoryIds] = useState<number[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcons, setNewCatIcons] = useState<{ income: string; expense: string }>({ income: "", expense: "" });
  const [catErrors, setCatErrors] = useState<{ income: string; expense: string }>({ income: "", expense: "" });
  const [catInfos, setCatInfos] = useState<{ income: string; expense: string }>({ income: "", expense: "" });
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<number | null>(null);
  const [presetLoading, setPresetLoading] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState<"income" | "expense" | null>(null);

  const isAdmin = user?.role === "super_admin" || user?.role === "admin";
  const isFree = !isPremium && !isAdmin;
  const limit = FREE_CATEGORY_LIMIT_PER_TYPE;

  async function loadCategories() {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data.categories || []);
      setActiveCategoryIds(data.activeCategoryIds || []);
      setIsPremium(data.isPremium || false);
    } catch { setCatErrors({ income: "Impossible de charger les catégories", expense: "Impossible de charger les catégories" }); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    async function init() { await loadCategories(); }
    init();
  }, []);

  function getUsedIcons(type: "income" | "expense"): string[] {
    return categories
      .filter(c => !c.archived && c.type === type && c.icon)
      .map(c => c.icon);
  }

  function availableIcons(type: "income" | "expense") {
    return ICON_SETS[type].filter(i => !getUsedIcons(type).includes(i.key));
  }

  async function handleAddCategory(e: React.FormEvent, type: "income" | "expense") {
    e.preventDefault();
    setCatErrors(prev => ({ ...prev, [type]: "" }));
    setCatInfos(prev => ({ ...prev, [type]: "" }));
    if (!newCatName.trim()) return;
    const activeOfType = activeCategoryIds.filter(id => categories.find(c => c.id === id)?.type === type).length;
    if (isFree && activeOfType >= limit) {
      setCatErrors(prev => ({ ...prev, [type]: `Limite gratuite atteinte (${limit} catégories par type max).` }));
      return;
    }

    const iconKey = newCatIcons[type] || getDefaultIconForName(newCatName);

    const optimistic: Category = { id: Date.now(), name: newCatName.trim(), icon: iconKey, type, archived: false };
    setCategories(prev => [...prev, optimistic]);
    setActiveCategoryIds(prev => [...prev, optimistic.id]);
    setNewCatName(""); setNewCatIcons(prev => ({ ...prev, [type]: "" }));
    try {
      const res = await fetch("/api/categories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: optimistic.name, type: optimistic.type, icon: iconKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCategories(prev => prev.filter(c => c.id !== optimistic.id));
        setActiveCategoryIds(prev => prev.filter(id => id !== optimistic.id));
        setCatErrors(prev => ({ ...prev, [type]: data.error || "Erreur" }));
        return;
      }
      setCategories(prev => prev.map(c => c.id === optimistic.id ? data.category : c));
      if (data.category) setActiveCategoryIds(prev => [...prev.filter(id => id !== optimistic.id), data.category.id]);
    } catch {
      setCategories(prev => prev.filter(c => c.id !== optimistic.id));
      setActiveCategoryIds(prev => prev.filter(id => id !== optimistic.id));
      setCatErrors(prev => ({ ...prev, [type]: "Erreur" }));
    }
  }

  async function handleArchiveCategory(id: number) {
    const res = await fetch("/api/categories", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, archived: true }) });
    if (res.ok) loadCategories();
  }

  async function handleRestoreCategory(id: number) {
    const res = await fetch("/api/categories", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, archived: false }) });
    if (res.ok) loadCategories();
  }

  async function handleDeleteCategory() {
    if (!confirmDeleteCat) return;
    const id = confirmDeleteCat;
    setConfirmDeleteCat(null);
    setCategories(prev => prev.filter(c => c.id !== id));
    setActiveCategoryIds(prev => prev.filter(cid => cid !== id));
    const res = await fetch("/api/categories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (!res.ok) loadCategories();
  }

  async function addPresetCategories(type: "income" | "expense") {
    setPresetLoading(true);
    setCatErrors(prev => ({ ...prev, [type]: "" }));
    setCatInfos(prev => ({ ...prev, [type]: "" }));
    const presets = type === "income"
      ? [
          { name: "Salaire", icon: "salary" },
          { name: "Freelance", icon: "freelance" },
          { name: "Ventes", icon: "sales" },
          { name: "Investissements", icon: "investment" },
          { name: "Autres revenus", icon: "other" },
        ]
      : [
          { name: "Alimentation", icon: "food" },
          { name: "Logement", icon: "house" },
          { name: "Transport", icon: "car" },
          { name: "Électricité", icon: "bolt" },
          { name: "Eau", icon: "water" },
          { name: "Internet", icon: "wifi" },
          { name: "Santé", icon: "health" },
          { name: "Éducation", icon: "education" },
          { name: "Loisirs", icon: "entertainment" },
          { name: "Vêtements", icon: "clothing" },
          { name: "Autres dépenses", icon: "palette" },
        ];
    try {
      const res = await fetch("/api/categories/bulk", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: presets.map(p => ({ name: p.name, type, icon: p.icon })) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCatErrors(prev => ({ ...prev, [type]: data.error || "Erreur" }));
      } else if (data.skipped > 0) {
        setCatInfos(prev => ({ ...prev, [type]: `${data.categories.length} catégorie${data.categories.length > 1 ? 's' : ''} ajoutée${data.categories.length > 1 ? 's' : ''}. ${data.skipped} autre${data.skipped > 1 ? 's' : ''} réservée${data.skipped > 1 ? 's' : ''} au plan Premium.` }));
      }
      await loadCategories();
    } catch {
      setCatErrors(prev => ({ ...prev, [type]: "Erreur lors de l'ajout" }));
    }
    setPresetLoading(false);
  }

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="skeleton h-8 w-36" />
      </div>
      <div className="card">
        {[1,2].map(i => (
          <div key={i} className="mb-6">
            <div className="skeleton h-5 w-24 mb-3" />
            <div className="flex flex-wrap gap-2 mb-3">
              {[1,2,3].map(j => (
                <div key={j} className="skeleton h-8 w-24 rounded-xl" />
              ))}
            </div>
            <div className="skeleton h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-[family-name:var(--font-dm-sans)] font-bold">Catégories</h1>
      </div>

      <div className="card">
        {isFree && (
          <div className="mb-4 p-4 bg-gold-light rounded-xl border border-border space-y-3">
            <p className="text-sm text-ink">Plan <strong>Gratuit</strong> : {limit} catégories actives par type. Passez à Premium pour des catégories illimitées.</p>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gold">Revenus : {activeCategoryIds.filter(id => categories.find(c => c.id === id)?.type === "income").length}/{categories.filter(c => c.type === "income").length}</span>
              <span className="font-medium text-gold">Dépenses : {activeCategoryIds.filter(id => categories.find(c => c.id === id)?.type === "expense").length}/{categories.filter(c => c.type === "expense").length}</span>
            </div>
          </div>
        )}

        {(["income", "expense"] as const).map((type) => {
          const activeOfType = activeCategoryIds.filter(id => categories.find(c => c.id === id)?.type === type).length;
          const isTypeLocked = isFree && activeOfType >= limit;
          const typeLabel = type === "income" ? "Revenus" : "Dépenses";
          const activeCats = categories.filter(c => !c.archived && c.type === type);
          const archivedCats = categories.filter(c => c.archived && c.type === type);
          const availIcons = availableIcons(type);
          const selectedIconDef = ICON_SETS[type].find(i => i.key === newCatIcons[type]);

          return (
            <div key={type} className="mb-6 last:mb-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-ink">{typeLabel}</h3>
                {isFree && <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${isTypeLocked ? "bg-gold-light text-gold" : "bg-sand text-muted"}`}>({activeOfType}/{limit})</span>}
                <button onClick={() => addPresetCategories(type)} disabled={presetLoading || isTypeLocked} className="text-xs text-brand hover:text-brand font-medium disabled:opacity-40">{isTypeLocked ? "Limite atteinte" : "+ Défaut"}</button>
              </div>

              {activeCats.length === 0 ? (
                <p className="text-sm text-muted mb-3">Aucune catégorie</p>
              ) : (
                <div className="flex flex-wrap gap-2 mb-3">
                  {activeCats.map((cat) => {
                    const isActive = activeCategoryIds.includes(cat.id);
                    const catIconDef = ICON_SETS[type === "income" ? "income" : "expense"].find(i => i.key === cat.icon);
                    return (
                      <div key={cat.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border ${isActive ? "bg-gold-light text-brand border-transparent" : "bg-sand text-muted border-border"}`}>
                        {catIconDef ? (
                          <FontAwesomeIcon icon={catIconDef.icon} className="w-3.5 h-3.5 shrink-0" />
                        ) : !isActive ? (
                          <FontAwesomeIcon icon={faLock} className="w-3 h-3 shrink-0" />
                        ) : null}
                        <span className={!isActive ? "opacity-70" : ""}>{cat.name}</span>
                        <button onClick={() => handleArchiveCategory(cat.id)} className="text-muted hover:text-neg transition-colors ml-0.5" title="Archiver">
                          <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                        </button>
                        {!isActive && <span className="text-[10px] font-medium bg-white/60 text-muted px-1.5 py-0.5 rounded">Premium</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              {archivedCats.length > 0 && (
                <details className="mt-2 group" open={archivedOpen === type}>
                  <summary className="text-xs text-muted cursor-pointer hover:text-ink transition-colors list-none flex items-center gap-1.5" onClick={() => setArchivedOpen(archivedOpen === type ? null : type)}>
                    <span className="text-[10px] font-medium bg-border text-muted px-1.5 py-0.5 rounded">{archivedCats.length} archivée{(archivedCats.length > 1 ? "s" : "")}</span>
                    <svg className={`w-3 h-3 transition-transform ${archivedOpen === type ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </summary>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {archivedCats.map((cat) => (
                      <div key={cat.id} className="flex items-center gap-1.5 bg-sand text-muted px-3 py-1.5 rounded-xl text-sm border border-border opacity-70">
                        <FontAwesomeIcon icon={faLock} className="w-3 h-3 shrink-0" />
                        <span className="opacity-70">{cat.name}</span>
                        <button onClick={() => handleRestoreCategory(cat.id)} className="text-muted hover:text-brand transition-colors ml-0.5" title="Restaurer">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              <form onSubmit={(e) => handleAddCategory(e, type)} className="pt-3 border-t border-border space-y-3">
                <label className="text-xs text-muted font-medium">Nouvelle catégorie</label>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <input type="text" value={newCatName} onChange={e => { setNewCatName(e.target.value); if (!newCatIcons[type] && e.target.value) setNewCatIcons(prev => ({ ...prev, [type]: getDefaultIconForName(e.target.value) })); }} className="input-field text-sm" placeholder="ex: courses, salaire" disabled={isFree && activeOfType >= limit} />
                  </div>
                  <button type="submit" disabled={isFree && activeOfType >= limit} className="btn-primary py-2.5 px-3 text-sm disabled:opacity-40">
                    <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                  </button>
                </div>

                {/* Icon picker */}
                <div>
                  <p className="text-xs text-muted mb-1.5">Icône</p>
                  {availIcons.length === 0 ? (
                    <p className="text-xs text-muted italic">Toutes les icônes sont utilisées</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {availIcons.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setNewCatIcons(prev => ({ ...prev, [type]: item.key }))}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                            newCatIcons[type] === item.key
                              ? 'ring-2 ring-brand bg-brand-subtle text-brand'
                              : 'bg-sand text-muted hover:bg-border hover:text-ink'
                          }`}
                          title={item.label}
                        >
                          <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedIconDef && newCatIcons[type] && (
                    <p className="text-xs text-muted mt-1">
                      Sélectionné : <FontAwesomeIcon icon={selectedIconDef.icon} className="w-3 h-3 mr-1" />
                      {selectedIconDef.label}
                    </p>
                  )}
                </div>
              </form>
              {catErrors[type] && <p className="text-neg text-sm mt-2">{catErrors[type]}</p>}
              {catInfos[type] && <p className="text-sm mt-2" style={{ color: "var(--color-gold, #B8860B)" }}>{catInfos[type]}</p>}
            </div>
          );
        })}
      </div>

      {confirmDeleteCat && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={() => setConfirmDeleteCat(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Supprimer cette catégorie ?</h3>
            <p className="text-sm text-muted mb-4">Les transactions liées ne seront plus associées à une catégorie.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDeleteCat(null)} className="btn-secondary text-sm">Annuler</button>
              <button onClick={handleDeleteCategory} className="btn-danger text-sm">Oui, supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
