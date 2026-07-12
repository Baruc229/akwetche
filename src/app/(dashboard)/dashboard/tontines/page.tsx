"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faPeopleGroup, faHandHoldingDollar, faSackDollar, faCircleExclamation, faCheckCircle, faArrowRight, faXmark, faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from "@/lib/utils";
import { detectCurrency } from "@/lib/currency";
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
  membreCount: number;
  retardsCount: number;
};

export default function TontinesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tontines, setTontines] = useState<Tontine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");
  const [newTnt, setNewTnt] = useState({
    nom: "",
    type: "vivres_fin_annee",
    montantCotisation: "",
    frequence: "hebdomadaire",
    dateDebut: "",
    fraisOrganisateurParDefaut: "0",
    scopeCommission: "activite",
    nombreTours: "",
    dateDistribution: "",
  });

  async function loadData() {
    try {
      const res = await fetch("/api/tontines");
      const data = await res.json();
      setTontines(data.tontines || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = "Mes Tontines — Akwetche";
    loadData();
  }, []);

  useEffect(() => {
    if (searchParams.get("action") === "create") {
      setShowCreate(true);
      router.replace("/dashboard/tontines");
    }
  }, [searchParams]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const body: Record<string, unknown> = { ...newTnt };
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
      setNewTnt({ nom: "", type: "vivres_fin_annee", montantCotisation: "", frequence: "", dateDebut: "", fraisOrganisateurParDefaut: "0", scopeCommission: "activite", nombreTours: "", dateDistribution: "" });
      loadData();
    } catch { setError("Erreur"); }
  }

  if (loading) return (
    <div className="space-y-3 animate-pulse">
      <div className="skeleton h-6 w-48" />
      <div className="card space-y-3">
        <div className="skeleton h-12 w-full" /><div className="skeleton h-12 w-full" /><div className="skeleton h-12 w-full" />
      </div>
    </div>
  );

  const ordered = [...tontines.filter(t => t.statut === "active"), ...tontines.filter(t => t.statut !== "active")];

  return (
    <div className="space-y-3 pb-24 sm:pb-0">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ink">Tontines</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary hidden sm:flex">
          <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
          Créer une tontine
        </button>
      </div>

      {ordered.length === 0 ? (
        <div className="card text-center py-8">
          <FontAwesomeIcon icon={faPeopleGroup} className="w-12 h-12 text-muted/30 mb-3" />
          <p className="text-muted mb-3">Aucune tontine pour le moment</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary"><FontAwesomeIcon icon={faPlus} className="w-4 h-4" /> Créer la première</button>
        </div>
      ) : (
        <div className="card divide-y divide-[var(--color-border)]">
          {ordered.map(t => (
            <a key={t.id} href={`/dashboard/tontines/${t.id}`} className="flex items-center justify-between py-3 px-1 hover:bg-[var(--color-surface-raised)] transition-colors rounded-lg gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${t.type === "rotative_simple" ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-amber-100 dark:bg-amber-900/30"}`}>
                  <FontAwesomeIcon icon={t.type === "rotative_simple" ? faHandHoldingDollar : faSackDollar} className={`w-4 h-4 ${t.type === "rotative_simple" ? "text-emerald-600" : "text-amber-600"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink truncate">{t.nom}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {t.type === "rotative_simple" ? "Rotative" : "Vivres/fin d'année"} · {t.membreCount} membre{t.membreCount > 1 ? "s" : ""} · {t.frequence} · {formatCurrency(t.montantCotisation)}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {t.retardsCount > 0 && (
                    <span className="badge bg-red-500 text-white text-xs"><FontAwesomeIcon icon={faCircleExclamation} className="w-3 h-3 mr-1" />{t.retardsCount} retard{t.retardsCount > 1 ? "s" : ""}</span>
                  )}
                  {t.statut === "active" && t.retardsCount === 0 && (
                    <span className="badge bg-emerald-500 text-white text-xs"><FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3 mr-1" />À jour</span>
                  )}
                  {t.statut !== "active" && <span className="badge bg-stone-400 text-white text-xs capitalize">{t.statut}</span>}
                  <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 text-muted/30" />
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in" onClick={() => { setShowCreate(false); setError(""); }}>
          <div className="bg-[var(--color-surface)] rounded-2xl p-6 w-full max-w-lg shadow-xl animate-scale-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-ink">Nouvelle tontine</h3>
              <button onClick={() => { setShowCreate(false); setError(""); }} className="text-muted hover:text-ink"><FontAwesomeIcon icon={faXmark} className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="field-label">Nom</label>
                <input type="text" value={newTnt.nom} onChange={e => setNewTnt({...newTnt, nom: e.target.value})} className="input-field" placeholder="ex: Tontine 2026" required />
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
                <input type="number" value={newTnt.montantCotisation} onChange={e => setNewTnt({...newTnt, montantCotisation: e.target.value})} className="input-field" placeholder="ex: 10000" required min="1" />
              </div>
              <div>
                <label className="field-label">Fréquence (tous les X jours)</label>
                <input type="number" value={newTnt.frequence === "journaliere" || newTnt.frequence === "hebdomadaire" || newTnt.frequence === "mensuelle" ? "" : newTnt.frequence} onChange={e => setNewTnt({...newTnt, frequence: e.target.value === "" ? "" : e.target.value})} className="input-field" placeholder="ex: 7, 10, 15, 30" required min="1" />
              </div>
              <div>
                <label className="field-label">Date de début</label>
                <DatePicker value={newTnt.dateDebut} onChange={v => setNewTnt({...newTnt, dateDebut: v})} />
              </div>
              <div>
                <label className="field-label">Commission organisateur</label>
                <input type="number" value={newTnt.fraisOrganisateurParDefaut} onChange={e => setNewTnt({...newTnt, fraisOrganisateurParDefaut: e.target.value})} className="input-field" placeholder="0" min="0" />
                <p className="text-xs text-muted mt-1">Montant prélevé comme commission sur chaque cotisation</p>
              </div>
              <div>
                <label className="field-label">Portée commission</label>
                <CustomSelect
                  options={[{ value: "activite", label: "Activité (commercial)" }, { value: "personnel", label: "Personnel" }]}
                  value={newTnt.scopeCommission}
                  onChange={v => setNewTnt({...newTnt, scopeCommission: v})}
                />
              </div>
              {newTnt.type === "rotative_simple" && (
                <div>
                  <label className="field-label">Nombre de tours</label>
                  <input type="number" value={newTnt.nombreTours} onChange={e => setNewTnt({...newTnt, nombreTours: e.target.value})} className="input-field" placeholder="ex: 12" />
                </div>
              )}
              {newTnt.type === "vivres_fin_annee" && (
                <div>
                  <label className="field-label">Date de distribution</label>
                  <DatePicker value={newTnt.dateDistribution} onChange={v => setNewTnt({...newTnt, dateDistribution: v})} min={newTnt.dateDebut || undefined} />
                </div>
              )}
              {error && <div className="alert-inline neg"><FontAwesomeIcon icon={faCircleExclamation} className="w-4 h-4" /><p>{error}</p></div>}
              <button type="submit" className="btn-primary w-full">Créer</button>
            </form>
          </div>
        </div>
      )}

      <button onClick={() => setShowCreate(true)} className="sm:hidden fixed bottom-24 right-5 z-40 w-14 h-14 flex items-center justify-center bg-[var(--color-brand)] text-white shadow-[0_4px_20px_rgba(28,58,47,0.3)] active:scale-95 transition-transform" style={{ borderRadius: "16px" }}>
        <FontAwesomeIcon icon={faPlus} className="w-6 h-6" />
      </button>
    </div>
  );
}
