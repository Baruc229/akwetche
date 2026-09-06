"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faPeopleGroup, faHandHoldingDollar, faSackDollar, faCircleExclamation, faCheckCircle, faArrowRight, faXmark, faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from "@/lib/utils";
import { useDashboard } from "@/app/(dashboard)/layout";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useModalBack } from "@/hooks/useModalBack";
import CustomSelect from "@/components/ui/CustomSelect";
import DatePicker from "@/components/ui/DatePicker";

type Tontine = {
  id: number;
  nom: string;
  type: string;
  statut: string;
  montantCotisation: number;
  frequence: string;
  fraisOrganisateurParDefaut: number;
  scopeCommission: string;
  nbPersonnesPrevue: number | null;
  membreCount: number;
  retardsCount: number;
};

/* eslint-disable @typescript-eslint/no-unused-vars */
export default function TontinesPage() {
  const { currency: _currency, user } = useDashboard();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (user && user.role === "user" && !user.tontineAccess) {
      router.replace("/dashboard");
    }
  }, [user, router]);
  const [tontines, setTontines] = useState<Tontine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");
  const [newTnt, setNewTnt] = useState({
    nom: "",
    type: "vivres_fin_annee",
    montantCotisation: "",
    frequencePreset: "30",
    frequenceCustom: "",
    dateDebut: "",
    fraisOrganisateurParDefaut: "0",
    scopeCommission: "personnel",
    nombreTours: "",
    nbPersonnesPrevue: "",
    dateDistribution: "",
    penaliteRetardActive: false,
    penaliteRetardMontant: "0",
    penaliteRetardDelaiJours: "3",
    description: "",
    objectifMontant: "",
    commissionsTransactionsEnabled: true,
  });

  const prefsAppliedRef = useRef(false);
  useEffect(() => {
    if (!user || prefsAppliedRef.current) return;
    prefsAppliedRef.current = true;
    setNewTnt(prev => ({
      ...prev,
      scopeCommission: user.commissionScopeDefault || "personnel",
      commissionsTransactionsEnabled: user.recoitCommissions !== false,
      fraisOrganisateurParDefaut: user.recoitCommissions === false ? "0" : prev.fraisOrganisateurParDefaut,
    }));
  }, [user]);

  const anyModalOpen = showCreate;
  useScrollLock(anyModalOpen);

  function closeAllModals() {
    setShowCreate(false);
    setError("");
  }

  useModalBack(anyModalOpen, closeAllModals);

  async function loadData(signal?: AbortSignal) {
    try {
      const res = await fetch("/api/tontines", { signal });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("akwetche_session");
          router.push("/login?expired=1");
          return;
        } else {
          setError("Erreur de chargement");
        }
        return;
      }
      const data = await res.json();
      setTontines(data.tontines || []);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    document.title = "Mes Tontines — Akwetche";
    const ac = new AbortController();
    loadData(ac.signal);
    return () => ac.abort();
  }, []);

  useEffect(() => {
    if (searchParams.get("action") === "create") {
      setShowCreate(true);
      router.replace("/dashboard/tontines");
    }
  }, [searchParams]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const frequenceJours = newTnt.frequencePreset === "custom"
        ? newTnt.frequenceCustom
        : newTnt.frequencePreset;
      const nbPersonnes = newTnt.nbPersonnesPrevue ? parseInt(newTnt.nbPersonnesPrevue) : null;
      const body: Record<string, unknown> = {
        nom: newTnt.nom,
        type: newTnt.type,
        montantCotisation: newTnt.montantCotisation,
        frequence: frequenceJours,
        dateDebut: newTnt.dateDebut,
        fraisOrganisateurParDefaut: newTnt.fraisOrganisateurParDefaut,
        scopeCommission: newTnt.scopeCommission,
        nombreTours: newTnt.type === "rotative_simple" ? (nbPersonnes || parseInt(newTnt.nombreTours) || null) : null,
        nbPersonnesPrevue: nbPersonnes,
        dateDistribution: newTnt.dateDistribution || null,
        penaliteRetardActive: newTnt.penaliteRetardActive,
        penaliteRetardMontant: newTnt.penaliteRetardMontant,
        penaliteRetardDelaiJours: newTnt.penaliteRetardDelaiJours,
        description: newTnt.description || null,
        objectifMontant: newTnt.objectifMontant ? parseFloat(newTnt.objectifMontant) : null,
        commissionsTransactionsEnabled: newTnt.commissionsTransactionsEnabled,
      };
      if (body.type === "vivres_fin_annee" && !body.dateDistribution) {
        setError("Date de distribution requise pour les tontines vivres/fin d'année");
        return;
      }
      const res = await fetch("/api/tontines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erreur"); return; }
      setShowCreate(false);
      setNewTnt({ nom: "", type: "vivres_fin_annee", montantCotisation: "", frequencePreset: "30", frequenceCustom: "", dateDebut: "", fraisOrganisateurParDefaut: "0", scopeCommission: user?.commissionScopeDefault || "personnel", nombreTours: "", nbPersonnesPrevue: "", dateDistribution: "", penaliteRetardActive: false, penaliteRetardMontant: "0", penaliteRetardDelaiJours: "3", description: "", objectifMontant: "", commissionsTransactionsEnabled: user?.recoitCommissions !== false });
      loadData();
    } catch { setError("Erreur"); }
  }

  if (loading) return (
    <div className="space-y-3 animate-pulse">
      <div className="skeleton h-6 max-w-48 w-full sm:w-48" />
      <div className="card space-y-3">
        <div className="skeleton h-12 w-full" /><div className="skeleton h-12 w-full" /><div className="skeleton h-12 w-full" />
      </div>
    </div>
  );

  const ordered = [...tontines.filter(t => t.statut === "active"), ...tontines.filter(t => t.statut !== "active")];

  return (
    <div className="space-y-4 pb-24 sm:pb-0">
      <div className="relative overflow-hidden rounded-2xl bg-[var(--color-brand)] p-5 sm:p-6 text-white shadow-sm">

        <div className="relative flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                <FontAwesomeIcon icon={faLayerGroup} className="w-4 h-4 text-white/90" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Tontines</h1>
            </div>
            <p className="text-sm text-white/60 mt-1">{"Gérez vos groupes d'épargne collective"}</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary bg-white/15 hover:bg-white/25 text-white border border-white/10 backdrop-blur-sm shrink-0">
            <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
            <span className="hidden sm:inline">Créer une tontine</span>
            <span className="sm:hidden">Créer</span>
          </button>
        </div>
      </div>

      {ordered.length === 0 ? (
        <div className="card text-center py-12 px-6">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-brand-subtle)] flex items-center justify-center mx-auto mb-4">
            <FontAwesomeIcon icon={faPeopleGroup} className="w-7 h-7 text-[var(--color-brand)]/40" />
          </div>
          <h3 className="text-base font-semibold text-ink mb-1.5">Aucune tontine</h3>
          <p className="text-sm text-muted max-w-xs mx-auto mb-5">Créez votre première tontine pour commencer à gérer vos cotisations et épargnes collectives.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
            Créer la première tontine
          </button>
        </div>
      ) : (
        <div className="card shadow-sm shadow-black/5 divide-y divide-[var(--color-border)] overflow-hidden">
          {ordered.map((t, idx) => (
            <a key={t.id} href={`/dashboard/tontines/${t.id}`} className="group flex items-center justify-between py-4 px-1 -mx-1 hover:bg-[var(--color-surface-raised)] hover:shadow-sm hover:shadow-black/[0.03] hover:border-[var(--color-brand)]/10 transition-all duration-200 gap-3" style={{ animationDelay: `${idx * 40}ms` }}>
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${t.type === "rotative_simple" ? "bg-[var(--color-pos-bg)]" : "bg-[var(--color-gold-light)]"}`}>
                  <FontAwesomeIcon icon={t.type === "rotative_simple" ? faHandHoldingDollar : faSackDollar} className={`w-[18px] h-[18px] ${t.type === "rotative_simple" ? "text-emerald-600" : "text-amber-600"}`} />
                </div>
                <div className="min-w-0 flex-1 group/name">
                  <p className="text-sm font-semibold text-ink truncate group-hover/name:whitespace-normal group-hover/name:break-words">{t.nom}</p>
                    <p className="text-xs text-muted mt-0.5 truncate">
                      {t.type === "rotative_simple" ? "Rotative" : "Vivres/fin d'année"} · {t.membreCount} membre{t.membreCount > 1 ? "s" : ""}<span className="hidden sm:inline"> · Écart {t.frequence}j</span> · {formatCurrency(t.montantCotisation)}
                    </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {t.retardsCount > 0 && (
                    <span className="badge bg-red-500/10 text-red-600 border border-red-200 text-xs gap-1.5 py-1 px-2.5"><FontAwesomeIcon icon={faCircleExclamation} className="w-3 h-3" />{t.retardsCount} retard{t.retardsCount > 1 ? "s" : ""}</span>
                  )}
                  {t.statut === "active" && t.retardsCount === 0 && (
                    <span className="badge bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs gap-1.5 py-1 px-2.5"><FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3" />À jour</span>
                  )}
                  {t.statut !== "active" && <span className="badge bg-stone-100 text-stone-500 border border-stone-200 text-xs capitalize py-1 px-2.5">{t.statut}</span>}
                  <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 text-muted/25 group-hover:text-[var(--color-brand)] transition-colors" />
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {showCreate && (
        <>
          {/* Mobile — full page */}
          <div className="fixed inset-0 z-50 md:hidden bg-[var(--color-bg)] animate-slide-up flex flex-col">
            <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3.5 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
              <button onClick={() => { setShowCreate(false); setError(""); }} className="w-11 h-11 flex items-center justify-center text-muted hover:text-ink rounded-lg hover:bg-[var(--color-surface-raised)] transition-colors">
                <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 rotate-180" />
              </button>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-subtle)] flex items-center justify-center">
                  <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5 text-[var(--color-brand)]" />
                </div>
                <h3 className="text-base font-semibold text-ink">Nouvelle tontine</h3>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="field-label">Nom</label>
                  <input type="text" value={newTnt.nom} onChange={e => setNewTnt({...newTnt, nom: e.target.value})} className="input-field" placeholder="ex: Tontine 2026" required />
                </div>
                <div>
                  <label className="field-label">Description (optionnel)</label>
                  <textarea value={newTnt.description} onChange={e => setNewTnt({...newTnt, description: e.target.value})} className="input-field" placeholder="ex: Épargne pour les vivres de fin d'année" rows={2} />
                </div>
                <div>
                  <label className="field-label">Type</label>
                  <CustomSelect
                    options={[{ value: "vivres_fin_annee", label: "Vivres / Fin d'année" }, { value: "rotative_simple", label: "Rotative simple" }]}
                    value={newTnt.type}
                    onChange={v => setNewTnt({...newTnt, type: v})}
                  />
                </div>
                <div>
                  <label className="field-label">Montant cotisation</label>
                  <input type="number" inputMode="decimal" step="0.01" value={newTnt.montantCotisation} onChange={e => setNewTnt({...newTnt, montantCotisation: e.target.value})} className="input-field" placeholder="ex: 10 000" required min="1" />
                </div>
                <div>
                  <label className="field-label">Fréquence des cotisations</label>
                  <CustomSelect
                    options={[
                      { value: "7", label: "Chaque semaine" },
                      { value: "14", label: "Toutes les 2 semaines" },
                      { value: "30", label: "Chaque mois" },
                      { value: "60", label: "Chaque 2 mois" },
                      { value: "custom", label: "Personnalisé" },
                    ]}
                    value={newTnt.frequencePreset}
                    onChange={v => setNewTnt({...newTnt, frequencePreset: v})}
                  />
                  {newTnt.frequencePreset === "custom" && (
                    <div className="mt-2">
                      <input type="number" inputMode="numeric" step="1" value={newTnt.frequenceCustom} onChange={e => setNewTnt({...newTnt, frequenceCustom: e.target.value})} className="input-field" placeholder="Nombre de jours" required min="1" />
                    </div>
                  )}
                  {(() => {
                    const jours = newTnt.frequencePreset === "custom" ? parseInt(newTnt.frequenceCustom) : parseInt(newTnt.frequencePreset);
                    if (!jours || jours < 1) return null;
                    const debut = newTnt.dateDebut ? new Date(newTnt.dateDebut + "T00:00:00") : new Date();
                    const d2 = new Date(debut); d2.setDate(d2.getDate() + jours);
                    const d3 = new Date(d2); d3.setDate(d3.getDate() + jours);
                    const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
                    return (
                      <div className="mt-2 p-3 rounded-lg bg-[var(--color-brand-subtle)] text-xs text-ink leading-relaxed">
                        <p className="font-medium mb-1">Comment ça marche ?</p>
                        <p>Chaque membre cotise tous les <span className="font-semibold">{jours} jours</span>.</p>
                        <p className="mt-1">Ex: 1ère cotisation le <span className="font-semibold">{fmt(debut)}</span> → 2e le <span className="font-semibold">{fmt(d2)}</span> → 3e le <span className="font-semibold">{fmt(d3)}</span>...</p>
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <label className="field-label">Nombre de personnes prévu</label>
                  <input type="number" inputMode="numeric" step="1" value={newTnt.nbPersonnesPrevue} onChange={e => setNewTnt({...newTnt, nbPersonnesPrevue: e.target.value, nombreTours: newTnt.type === "rotative_simple" ? e.target.value : newTnt.nombreTours})} className="input-field" placeholder="ex: 10" min="2" />
                  {newTnt.type === "rotative_simple" && newTnt.nbPersonnesPrevue && (
                    <p className="text-xs text-muted mt-1">= {newTnt.nbPersonnesPrevue} tours (1 tour par personne)</p>
                  )}
                </div>
                <div>
                  <label className="field-label">Date de début</label>
                  <DatePicker value={newTnt.dateDebut} onChange={v => setNewTnt({...newTnt, dateDebut: v})} />
                </div>
                <div className="card-inset">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div>
                      <label className="field-label mb-0">Commission organisateur</label>
                      <p className="text-xs text-muted mt-0.5">Montant prélevé sur chaque cotisation</p>
                    </div>
                    <button type="button" onClick={() => setNewTnt({...newTnt, commissionsTransactionsEnabled: !newTnt.commissionsTransactionsEnabled})} role="switch" aria-checked={newTnt.commissionsTransactionsEnabled} aria-label="Comptabiliser les commissions comme revenu" className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${newTnt.commissionsTransactionsEnabled ? "bg-emerald-500" : "bg-stone-300"}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${newTnt.commissionsTransactionsEnabled ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                  <div className="mt-2">
                    <input type="number" inputMode="decimal" step="0.01" value={newTnt.fraisOrganisateurParDefaut} onChange={e => setNewTnt({...newTnt, fraisOrganisateurParDefaut: e.target.value})} className="input-field" placeholder="ex: 500" min="0" />
                    <p className="text-xs text-muted mt-1">Comptabilisées comme revenu automatiquement.</p>
                  </div>
                  {newTnt.commissionsTransactionsEnabled && (
                    <div className="mt-3">
                      <label className="field-label text-xs">Portée commission</label>
                      <CustomSelect
                        options={[{ value: "activite", label: "Activité (commercial)" }, { value: "personnel", label: "Personnel" }]}
                        value={newTnt.scopeCommission}
                        onChange={v => setNewTnt({...newTnt, scopeCommission: v})}
                      />
                    </div>
                  )}
                </div>
                <div className="card-inset">
                  <div className="flex items-center justify-between mb-2">
                    <label className="field-label mb-0">Pénalité de retard</label>
                    <button type="button" onClick={() => setNewTnt({...newTnt, penaliteRetardActive: !newTnt.penaliteRetardActive})} role="switch" aria-checked={newTnt.penaliteRetardActive} aria-label="Pénalité de retard" className={`relative w-10 h-5 rounded-full transition-colors ${newTnt.penaliteRetardActive ? "bg-emerald-500" : "bg-stone-300"}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${newTnt.penaliteRetardActive ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                  {newTnt.penaliteRetardActive && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                      <div>
                        <label className="field-label text-xs">Montant pénalité</label>
                        <input type="number" inputMode="decimal" step="0.01" value={newTnt.penaliteRetardMontant} onChange={e => setNewTnt({...newTnt, penaliteRetardMontant: e.target.value})} className="input-field" placeholder="ex: 500" min="0" />
                      </div>
                      <div>
                        <label className="field-label text-xs">Jours de grâce</label>
                        <input type="number" inputMode="numeric" step="1" value={newTnt.penaliteRetardDelaiJours} onChange={e => setNewTnt({...newTnt, penaliteRetardDelaiJours: e.target.value})} className="input-field" placeholder="ex: 3" min="0" />
                      </div>
                    </div>
                  )}
                </div>
                {newTnt.type === "vivres_fin_annee" && (
                  <>
                    <div>
                      <label className="field-label">Date de distribution</label>
                      <DatePicker value={newTnt.dateDistribution} onChange={v => setNewTnt({...newTnt, dateDistribution: v})} min={newTnt.dateDebut || undefined} />
                    </div>
                    <div>
                      <label className="field-label">Objectif d&apos;épargne (optionnel)</label>
                      <input type="number" inputMode="decimal" step="0.01" value={newTnt.objectifMontant} onChange={e => setNewTnt({...newTnt, objectifMontant: e.target.value})} className="input-field" placeholder="ex: 250000" min="0" />
                      <p className="text-xs text-muted mt-1">Montant total à atteindre d&apos;ici la distribution.</p>
                    </div>
                  </>
                )}
                {newTnt.type === "rotative_simple" && newTnt.montantCotisation && newTnt.nbPersonnesPrevue && (
                  <div className="card-inset bg-[var(--color-brand-subtle)]">
                    <p className="text-xs text-muted">Part projetée par personne</p>
                    <p className="text-lg font-bold text-ink">{formatCurrency(parseFloat(newTnt.montantCotisation) * parseInt(newTnt.nbPersonnesPrevue))}</p>
                  </div>
                )}
                {error && <div className="alert-inline neg"><FontAwesomeIcon icon={faCircleExclamation} className="w-4 h-4" /><p>{error}</p></div>}
                <button type="submit" className="btn-primary w-full py-3 shadow-sm">Créer</button>
              </form>
            </div>
          </div>
          {/* Desktop — centered popup */}
          <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => { setShowCreate(false); setError(""); }}>
            <div className="bg-[var(--color-surface)] rounded-2xl p-6 w-full max-w-lg shadow-2xl shadow-black/10 animate-scale-in max-h-[90vh] overflow-y-auto border border-[var(--color-border)]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-subtle)] flex items-center justify-center">
                    <FontAwesomeIcon icon={faPlus} className="w-4 h-4 text-[var(--color-brand)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-ink">Nouvelle tontine</h3>
                    <p className="text-xs text-muted">{"Configurez votre groupe d'épargne"}</p>
                  </div>
                </div>
                <button onClick={() => { setShowCreate(false); setError(""); }} className="text-muted hover:text-ink transition-colors w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--color-surface-raised)]"><FontAwesomeIcon icon={faXmark} className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="field-label">Nom</label>
                  <input type="text" value={newTnt.nom} onChange={e => setNewTnt({...newTnt, nom: e.target.value})} className="input-field" placeholder="ex: Tontine 2026" required />
                </div>
                <div>
                  <label className="field-label">Description (optionnel)</label>
                  <textarea value={newTnt.description} onChange={e => setNewTnt({...newTnt, description: e.target.value})} className="input-field" placeholder="ex: Épargne pour les vivres de fin d'année" rows={2} />
                </div>
                <div>
                  <label className="field-label">Type</label>
                  <CustomSelect
                    options={[{ value: "vivres_fin_annee", label: "Vivres / Fin d'année" }, { value: "rotative_simple", label: "Rotative simple" }]}
                    value={newTnt.type}
                    onChange={v => setNewTnt({...newTnt, type: v})}
                  />
                </div>
                <div>
                  <label className="field-label">Montant cotisation</label>
                  <input type="number" inputMode="decimal" step="0.01" value={newTnt.montantCotisation} onChange={e => setNewTnt({...newTnt, montantCotisation: e.target.value})} className="input-field" placeholder="ex: 10 000" required min="1" />
                </div>
                <div>
                  <label className="field-label">Fréquence des cotisations</label>
                  <CustomSelect
                    options={[
                      { value: "7", label: "Chaque semaine" },
                      { value: "14", label: "Toutes les 2 semaines" },
                      { value: "30", label: "Chaque mois" },
                      { value: "60", label: "Chaque 2 mois" },
                      { value: "custom", label: "Personnalisé" },
                    ]}
                    value={newTnt.frequencePreset}
                    onChange={v => setNewTnt({...newTnt, frequencePreset: v})}
                  />
                  {newTnt.frequencePreset === "custom" && (
                    <div className="mt-2">
                      <input type="number" inputMode="numeric" step="1" value={newTnt.frequenceCustom} onChange={e => setNewTnt({...newTnt, frequenceCustom: e.target.value})} className="input-field" placeholder="Nombre de jours" required min="1" />
                    </div>
                  )}
                  {(() => {
                    const jours = newTnt.frequencePreset === "custom" ? parseInt(newTnt.frequenceCustom) : parseInt(newTnt.frequencePreset);
                    if (!jours || jours < 1) return null;
                    const debut = newTnt.dateDebut ? new Date(newTnt.dateDebut + "T00:00:00") : new Date();
                    const d2 = new Date(debut); d2.setDate(d2.getDate() + jours);
                    const d3 = new Date(d2); d3.setDate(d3.getDate() + jours);
                    const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
                    return (
                      <div className="mt-2 p-3 rounded-lg bg-[var(--color-brand-subtle)] text-xs text-ink leading-relaxed">
                        <p className="font-medium mb-1">Comment ça marche ?</p>
                        <p>Chaque membre cotise tous les <span className="font-semibold">{jours} jours</span>.</p>
                        <p className="mt-1">Ex: 1ère cotisation le <span className="font-semibold">{fmt(debut)}</span> → 2e le <span className="font-semibold">{fmt(d2)}</span> → 3e le <span className="font-semibold">{fmt(d3)}</span>...</p>
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <label className="field-label">Nombre de personnes prévu</label>
                  <input type="number" inputMode="numeric" step="1" value={newTnt.nbPersonnesPrevue} onChange={e => setNewTnt({...newTnt, nbPersonnesPrevue: e.target.value, nombreTours: newTnt.type === "rotative_simple" ? e.target.value : newTnt.nombreTours})} className="input-field" placeholder="ex: 10" min="2" />
                  {newTnt.type === "rotative_simple" && newTnt.nbPersonnesPrevue && (
                    <p className="text-xs text-muted mt-1">= {newTnt.nbPersonnesPrevue} tours (1 tour par personne)</p>
                  )}
                </div>
                <div>
                  <label className="field-label">Date de début</label>
                  <DatePicker value={newTnt.dateDebut} onChange={v => setNewTnt({...newTnt, dateDebut: v})} />
                </div>
                <div className="card-inset">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div>
                      <label className="field-label mb-0">Commission organisateur</label>
                      <p className="text-xs text-muted mt-0.5">Montant prélevé sur chaque cotisation</p>
                    </div>
                    <button type="button" onClick={() => setNewTnt({...newTnt, commissionsTransactionsEnabled: !newTnt.commissionsTransactionsEnabled})} role="switch" aria-checked={newTnt.commissionsTransactionsEnabled} aria-label="Comptabiliser les commissions comme revenu" className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${newTnt.commissionsTransactionsEnabled ? "bg-emerald-500" : "bg-stone-300"}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${newTnt.commissionsTransactionsEnabled ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                  <div className="mt-2">
                    <input type="number" inputMode="decimal" step="0.01" value={newTnt.fraisOrganisateurParDefaut} onChange={e => setNewTnt({...newTnt, fraisOrganisateurParDefaut: e.target.value})} className="input-field" placeholder="ex: 500" min="0" />
                    <p className="text-xs text-muted mt-1">Comptabilisées comme revenu automatiquement.</p>
                  </div>
                  {newTnt.commissionsTransactionsEnabled && (
                    <div className="mt-3">
                      <label className="field-label text-xs">Portée commission</label>
                      <CustomSelect
                        options={[{ value: "activite", label: "Activité (commercial)" }, { value: "personnel", label: "Personnel" }]}
                        value={newTnt.scopeCommission}
                        onChange={v => setNewTnt({...newTnt, scopeCommission: v})}
                      />
                    </div>
                  )}
                </div>
                <div className="card-inset">
                  <div className="flex items-center justify-between mb-2">
                    <label className="field-label mb-0">Pénalité de retard</label>
                    <button type="button" onClick={() => setNewTnt({...newTnt, penaliteRetardActive: !newTnt.penaliteRetardActive})} role="switch" aria-checked={newTnt.penaliteRetardActive} aria-label="Pénalité de retard" className={`relative w-10 h-5 rounded-full transition-colors ${newTnt.penaliteRetardActive ? "bg-emerald-500" : "bg-stone-300"}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${newTnt.penaliteRetardActive ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                  {newTnt.penaliteRetardActive && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                      <div>
                        <label className="field-label text-xs">Montant pénalité</label>
                        <input type="number" inputMode="decimal" step="0.01" value={newTnt.penaliteRetardMontant} onChange={e => setNewTnt({...newTnt, penaliteRetardMontant: e.target.value})} className="input-field" placeholder="ex: 500" min="0" />
                      </div>
                      <div>
                        <label className="field-label text-xs">Jours de grâce</label>
                        <input type="number" inputMode="numeric" step="1" value={newTnt.penaliteRetardDelaiJours} onChange={e => setNewTnt({...newTnt, penaliteRetardDelaiJours: e.target.value})} className="input-field" placeholder="ex: 3" min="0" />
                      </div>
                    </div>
                  )}
                </div>
                {newTnt.type === "vivres_fin_annee" && (
                  <>
                    <div>
                      <label className="field-label">Date de distribution</label>
                      <DatePicker value={newTnt.dateDistribution} onChange={v => setNewTnt({...newTnt, dateDistribution: v})} min={newTnt.dateDebut || undefined} />
                    </div>
                    <div>
                      <label className="field-label">Objectif d&apos;épargne (optionnel)</label>
                      <input type="number" inputMode="decimal" step="0.01" value={newTnt.objectifMontant} onChange={e => setNewTnt({...newTnt, objectifMontant: e.target.value})} className="input-field" placeholder="ex: 250000" min="0" />
                      <p className="text-xs text-muted mt-1">Montant total à atteindre d&apos;ici la distribution.</p>
                    </div>
                  </>
                )}
                {newTnt.type === "rotative_simple" && newTnt.montantCotisation && newTnt.nbPersonnesPrevue && (
                  <div className="card-inset bg-[var(--color-brand-subtle)]">
                    <p className="text-xs text-muted">Part projetée par personne</p>
                    <p className="text-lg font-bold text-ink">{formatCurrency(parseFloat(newTnt.montantCotisation) * parseInt(newTnt.nbPersonnesPrevue))}</p>
                  </div>
                )}
                {error && <div className="alert-inline neg"><FontAwesomeIcon icon={faCircleExclamation} className="w-4 h-4" /><p>{error}</p></div>}
                <button type="submit" className="btn-primary w-full shadow-sm">Créer</button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
