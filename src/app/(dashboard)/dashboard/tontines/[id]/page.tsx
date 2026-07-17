"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faPlus, faXmark, faCircleExclamation, faCheckCircle, faArrowRight, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from "@/lib/utils";
import { useDashboard } from "@/app/(dashboard)/layout";
import CustomSelect from "@/components/ui/CustomSelect";
import DatePicker from "@/components/ui/DatePicker";
import ConfirmModal from "@/components/ConfirmModal";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Membre = {
  id: number; nom: string; contact: string | null; ordrePassage: number | null;
  statut: string; _count: { cotisations: number };
};

type Cotisation = {
  id: number; periode: string; montantBase: number; fraisOrganisateur: number;
  montantTotal: number; montantPaye: number; datePaiement: string | null; statut: string;
  membre: { id: number; nom: string };
};

type Tour = { id: number; numeroTour: number; datePrevue: string; beneficiaireId: number; montantAttendu: number; montantCollecte: number; statut: string };

type Distribution = { id: number; dateDistribution: string; montantTotalCollecte: number; montantAlloueVivres: number; montantAlloueArgent: number; statut: string };

type Tontine = {
  id: number; nom: string; type: string; montantCotisation: number; frequence: string;
  dateDebut: string; fraisOrganisateurParDefaut: number; scopeCommission: string;
  nombreTours: number | null; dateDistribution: string | null; statut: string;
  organisateurId: number; createdAt: string;
  membres: Membre[];
  cotisations: Cotisation[];
  tours: Tour[];
  distribution: Distribution | null;
};

export default function TontineDetail() {
  const { currency: _currency } = useDashboard();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tontine, setTontine] = useState<Tontine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNewMembre, setShowNewMembre] = useState(false);
  const [newMembreNom, setNewMembreNom] = useState("");
  const [membreIdForCotisation, setMembreIdForCotisation] = useState("");
  const [cotisationPeriode, setCotisationPeriode] = useState("");
  const [cotisationMontant, setCotisationMontant] = useState("");
  const [showNewCotisation, setShowNewCotisation] = useState(false);
  const [showNewTour, setShowNewTour] = useState(false);
  const [newTourData, setNewTourData] = useState({ numeroTour: "", datePrevue: "", beneficiaireId: "", montantAttendu: "" });
  const [showDistribution, setShowDistribution] = useState(false);
  const [distData, setDistData] = useState({ dateDistribution: "", montantAlloueVivres: "", montantAlloueArgent: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const mParams = { include: { _count: { select: { cotisations: true } } } };

  async function loadData() {
    try {
      const [res, membresRes] = await Promise.all([
        fetch(`/api/tontines/${id}`),
        fetch(`/api/tontines/${id}/membres`),
      ]);
      const data = await res.json();
      const membresData = await membresRes.json();
      if (!data.tontine) { setError("Tontine introuvable"); return; }
      const membresMap = new Map<number, Membre>();
      (membresData.membres || []).forEach((m: Membre) => membresMap.set(m.id, m));
      data.tontine.membres = Array.from(membresMap.values());
      setTontine(data.tontine);
    } catch { setError("Erreur de chargement"); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, [id]);
  document.title = tontine ? `${tontine.nom} — Tontine — Akwetche` : "Tontine — Akwetche";

  // Calculs
  const actifs = tontine?.membres?.filter(m => m.statut === "actif") || [];
  const cotisationsPayees = tontine?.cotisations?.filter(c => c.statut === "paye" || c.statut === "partiel") || [];
  const cotisationsEnRetard = tontine?.cotisations?.filter(c => c.statut === "en_retard") || [];

  const totalCollecte = cotisationsPayees.reduce((sum, c) => {
    const ratio = c.montantTotal > 0 ? c.montantPaye / c.montantTotal : 1;
    return sum + Math.round(c.montantBase * ratio * 100) / 100;
  }, 0);

  const revenuCommission = cotisationsPayees.reduce((sum, c) => {
    const ratio = c.montantTotal > 0 ? c.montantPaye / c.montantTotal : 1;
    return sum + Math.round(c.fraisOrganisateur * ratio * 100) / 100;
  }, 0);

  let joursRestants = 0;
  let partProjetee = 0;
  let nbPeriodesRestantes = 0;
  if (tontine?.dateDistribution) {
    const diff = new Date(tontine.dateDistribution).getTime() - Date.now();
    joursRestants = Math.max(0, Math.round(diff / (1000 * 3600 * 24)));
    const frequenceJours = parseInt(tontine.frequence) || (tontine.frequence === "journaliere" ? 1 : tontine.frequence === "hebdomadaire" ? 7 : 30);
    nbPeriodesRestantes = Math.floor(joursRestants / frequenceJours);
    const projection = totalCollecte + (tontine.montantCotisation - tontine.fraisOrganisateurParDefaut) * actifs.length * nbPeriodesRestantes;
    partProjetee = actifs.length > 0 ? projection / actifs.length : 0;
  }

  // ROTATIVE: tour en cours
  const tourEnCours = tontine?.tours?.find(t => t.statut === "en_cours");
  const tauxCollecte = tourEnCours && tourEnCours.montantAttendu > 0
    ? Math.round((tourEnCours.montantCollecte / tourEnCours.montantAttendu) * 100) : 0;

  async function handleAddMembre(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/tontines/${id}/membres`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: newMembreNom }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erreur"); return; }
      setShowNewMembre(false); setNewMembreNom("");
      loadData();
    } catch { setError("Erreur"); }
  }

  async function handleRemoveMembre(membreId: number) {
    try {
      await fetch(`/api/tontines/${id}/membres/${membreId}`, { method: "DELETE" });
      loadData();
    } catch { setError("Erreur"); }
  }

  async function handleAddCotisation(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/tontines/${id}/cotisations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membreId: membreIdForCotisation, periode: cotisationPeriode, montantPaye: parseFloat(cotisationMontant) || 0 }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erreur"); return; }
      setShowNewCotisation(false);
      setMembreIdForCotisation(""); setCotisationPeriode(""); setCotisationMontant("");
      loadData();
    } catch { setError("Erreur"); }
  }

  async function handleAddTour(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/tontines/${id}/tours`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numeroTour: parseInt(newTourData.numeroTour),
          datePrevue: newTourData.datePrevue,
          beneficiaireId: parseInt(newTourData.beneficiaireId),
          montantAttendu: parseFloat(newTourData.montantAttendu),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erreur"); return; }
      setShowNewTour(false); setNewTourData({ numeroTour: "", datePrevue: "", beneficiaireId: "", montantAttendu: "" });
      loadData();
    } catch { setError("Erreur"); }
  }

  async function handleCloturerTour(tourId: number, montantCollecte: number) {
    try {
      await fetch(`/api/tontines/${id}/tours`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tourId, statut: "cloture", montantCollecte }),
      });
      loadData();
    } catch { setError("Erreur"); }
  }

  async function handleSaveDistribution(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/tontines/${id}/distribution`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(distData),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erreur"); return; }
      setShowDistribution(false);
      loadData();
    } catch { setError("Erreur"); }
  }

  if (loading) return (
    <div className="space-y-3 animate-pulse">
      <div className="skeleton h-6 w-48" />
      <div className="card space-y-3"><div className="skeleton h-20 w-full" /></div>
      <div className="card space-y-3"><div className="skeleton h-12 w-40" /><div className="skeleton h-20 w-full" /></div>
    </div>
  );

  if (error || !tontine) return (
    <div className="space-y-3">
      <Link href="/dashboard/tontines" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink transition-colors">
        <FontAwesomeIcon icon={faArrowLeft} className="w-3 h-3" /> Retour aux tontines
      </Link>
      <div className="card text-center py-8 text-muted">{error || "Tontine introuvable"}</div>
    </div>
  );

  return (
    <div className="space-y-3 pb-24 sm:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard/tontines" className="text-muted hover:text-ink transition-colors shrink-0">
            <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-ink truncate">{tontine.nom}</h1>
            <span className="text-xs text-muted">{tontine.type === "rotative_simple" ? "Rotative simple" : "Vivres / fin d'année"} · tts. {tontine.frequence} jours · {formatCurrency(tontine.montantCotisation)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`badge shrink-0 ${tontine.statut === "active" ? "bg-emerald-500 text-white" : "bg-stone-400 text-white"}`}>{tontine.statut === "active" ? "Active" : tontine.statut}</span>
          {tontine.statut === "active" && (
            <button onClick={() => setShowDeleteConfirm(true)} className="btn-danger-sm shrink-0">
              <FontAwesomeIcon icon={faXmark} className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert-inline neg">
          <FontAwesomeIcon icon={faCircleExclamation} className="w-4 h-4 shrink-0" />
          <p>{error}</p>
          <button onClick={() => setError("")} className="opacity-50 hover:opacity-100"><FontAwesomeIcon icon={faXmark} className="w-4 h-4" /></button>
        </div>
      )}

      {/* KPIs */}
      <div className="card">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div className="card-inset text-center">
            <p className="text-label">Total collecté</p>
            <p className="text-amount text-base mt-1">{formatCurrency(totalCollecte)}</p>
          </div>
          <div className="card-inset text-center">
            <p className="text-label">{tontine.type === "rotative_simple" ? "Tours" : "Membres"}</p>
            <p className="text-amount text-base mt-1">{tontine.type === "rotative_simple" ? tontine.tours?.length || 0 : actifs.length}</p>
          </div>
          {tontine.type === "vivres_fin_annee" && tontine.dateDistribution && (
            partProjetee > 0 && (
              <div className="card-inset text-center">
                <p className="text-label">Part projetée</p>
                <p className="text-base font-semibold mt-1">{formatCurrency(partProjetee)}</p>
              </div>
            )
          )}
          {tontine.type === "vivres_fin_annee" && tontine.dateDistribution && (
            <div className="card-inset text-center">
              <p className="text-label">Jours restants</p>
              <p className="text-base font-semibold mt-1">{joursRestants}</p>
            </div>
          )}
          {tontine.type === "rotative_simple" && (
            <div className="card-inset text-center">
              <p className="text-label">Taux collecte</p>
              <p className={`text-base font-semibold mt-1 ${tauxCollecte < 80 ? "text-red-500" : "text-green-500"}`}>{tauxCollecte}%</p>
            </div>
          )}
          {tontine.fraisOrganisateurParDefaut > 0 && (
            <div className="card-inset text-center">
              <p className="text-label">Revenu commission</p>
              <p className="text-amount text-base mt-1">{formatCurrency(revenuCommission)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Membres */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-ink">Membres ({actifs.length})</h3>
          {tontine.statut === "active" && <button onClick={() => setShowNewMembre(true)} className="btn-primary-sm"><FontAwesomeIcon icon={faPlus} /> Ajouter</button>}
        </div>
        {actifs.length === 0 ? (
          <p className="text-sm text-muted py-2">Aucun membre</p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {actifs.map(m => {
              const cotMembre = tontine.cotisations?.filter(c => c.membre.nom === m.nom) || [];
              const enRetard = cotMembre.some(c => c.statut === "en_retard" || (c.statut === "en_attente" && new Date(c.periode) < new Date()));
              return (
                <div key={m.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${enRetard ? "bg-red-100 dark:bg-red-900/30" : "bg-emerald-100 dark:bg-emerald-900/30"}`}>
                      <FontAwesomeIcon icon={enRetard ? faCircleExclamation : faCheckCircle} className={`w-3.5 h-3.5 ${enRetard ? "text-red-500" : "text-emerald-500"}`} />
                    </div>
                    <span className="text-sm text-ink font-medium">{m.ordrePassage ? `#${m.ordrePassage} ` : ""}{m.nom}</span>
                    {enRetard && <span className="badge bg-red-500 text-white text-xs">Retard</span>}
                  </div>
                  <span className="text-xs text-muted">{cotMembre.filter(c => c.statut === "paye" || c.statut === "partiel").length} cotisation{cotMembre.filter(c => c.statut === "paye" || c.statut === "partiel").length > 1 ? "s" : ""}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rotative: Tours */}
      {tontine.type === "rotative_simple" && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-ink">Tours</h3>
            {tontine.statut === "active" && <button onClick={() => setShowNewTour(true)} className="btn-primary-sm"><FontAwesomeIcon icon={faPlus} /> Ajouter</button>}
          </div>
          {(tontine.tours || []).length === 0 ? (
            <p className="text-sm text-muted">Aucun tour planifié</p>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {(tontine.tours || []).map(tour => {
                const beneficiaire = actifs.find(m => m.id === tour.beneficiaireId);
                const estEnCours = tour.statut === "en_cours";
                const bgTouch = estEnCours ? "bg-emerald-50 dark:bg-emerald-900/20" : "";
                return (
                  <div key={tour.id} className={`flex items-center justify-between py-2.5 px-1 rounded-lg ${bgTouch}`}>
                    <div>
                      <p className="text-sm text-ink font-medium">{tour.numeroTour}. Bénéficiaire: <strong>{beneficiaire?.nom || "—"}</strong></p>
                      <p className="text-xs text-muted mt-0.5">{formatCurrency(tour.montantAttendu)} attendu · {formatCurrency(tour.montantCollecte)} collecté</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {estEnCours && (
                        <button onClick={() => handleCloturerTour(tour.id, 0)} className="btn-mono text-xs">Clôturer</button>
                      )}
                      <span className={`badge text-xs ${tour.statut === "en_cours" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                        {tour.statut === "en_cours" ? "En cours" : "Clôturé"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Vivres: Distribution */}
      {tontine.type === "vivres_fin_annee" && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-ink">Distribution</h3>
            {tontine.statut === "active" && !tontine.distribution && (
              <button onClick={() => { setDistData({ dateDistribution: tontine.dateDistribution || "", montantAlloueVivres: "", montantAlloueArgent: (actifs.length > 0 ? totalCollecte / actifs.length : 0).toString() }); setShowDistribution(true); }} className="btn-primary-sm">
                <FontAwesomeIcon icon={faPlus} /> Planifier
              </button>
            )}
          </div>
          {tontine.dateDistribution && (
            <div className="card-inset mb-3">
              <p className="text-sm text-muted">
                Distribution prévue le <strong className="text-ink">{new Date(tontine.dateDistribution).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</strong>
                {joursRestants > 0 && <> · <strong className="text-ink">{joursRestants} jours</strong> restants</>}
              </p>
              {actifs.length > 0 && partProjetee > 0 && (
                <p className="text-sm text-muted mt-1">
                  Part par membre (projetée) : <strong className="text-ink">{formatCurrency(partProjetee)}</strong>
                  {nbPeriodesRestantes > 0 && <> sur {nbPeriodesRestantes} période(s) ⨯ {actifs.length} membre(s)</>}
                </p>
              )}
            </div>
          )}
          {tontine.distribution && (
            <div className="card-inset">
              <p className="text-sm mb-1">
                <strong>{tontine.distribution.statut === "planifiee" ? "Planifiée" : tontine.distribution.statut}</strong>
              </p>
              <p className="text-sm text-muted">Total collecté : <strong>{formatCurrency(tontine.distribution.montantTotalCollecte)}</strong></p>
              <p className="text-sm text-muted">Vivres : <strong>{formatCurrency(tontine.distribution.montantAlloueVivres)}</strong></p>
              <p className="text-sm text-muted">Argent : <strong>{formatCurrency(tontine.distribution.montantAlloueArgent)}</strong></p>
              {tontine.distribution.statut !== "effectuee" && (
                <button onClick={async () => {
                  if (!tontine.distribution) return;
                  const res = await fetch(`/api/tontines/${id}/distribution`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ statut: "effectue" }),
                  });
                  if (res.ok) loadData();
                  else { const d = await res.json(); setError(d.error || "Erreur"); }
                }} className="btn-primary-sm mt-2">Effectuer la distribution</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cotisations */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-ink">Cotisations</h3>
          {tontine.statut === "active" && <button onClick={() => setShowNewCotisation(true)} className="btn-primary-sm"><FontAwesomeIcon icon={faPlus} /> Enregistrer</button>}
        </div>
        {(tontine.cotisations || []).length === 0 ? (
          <p className="text-sm text-muted">Aucune cotisation</p>
        ) : (
          <div className="divide-y divide-[var(--color-border)] max-h-80 overflow-y-auto">
            {(tontine.cotisations || []).slice().reverse().slice(0, 50).map(c => {
              const bandiere = c.statut === "paye" ? "bg-emerald-100 text-emerald-700" : c.statut === "partiel" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
              return (
                <div key={c.id} className="flex items-center justify-between py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink truncate">{c.membre.nom}</p>
                    <p className="text-xs text-muted">{new Date(c.periode).toLocaleDateString("fr-FR")} · {formatCurrency(c.montantPaye)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {c.fraisOrganisateur > 0 && c.statut !== "en_attente" && (
                      <span className="text-xs text-muted">comm. {formatCurrency(c.fraisOrganisateur)}</span>
                    )}
                    <span className={`badge text-xs ${bandiere}`}>{c.statut}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}

      {/* New Membre Modal */}
      {showNewMembre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in" onClick={() => setShowNewMembre(false)}>
          <div className="bg-[var(--color-surface)] rounded-2xl p-6 w-full max-w-md shadow-xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-ink">Nouveau membre</h3>
              <button onClick={() => setShowNewMembre(false)} className="text-muted hover:text-ink"><FontAwesomeIcon icon={faXmark} /></button>
            </div>
            <form onSubmit={handleAddMembre} className="space-y-4">
              <div>
                <label className="field-label">Nom</label>
                <input type="text" value={newMembreNom} onChange={e => setNewMembreNom(e.target.value)} className="input-field" placeholder="Nom complet du membre" required />
              </div>
              <button type="submit" className="btn-primary w-full">Ajouter</button>
            </form>
          </div>
        </div>
      )}

      {/* New Cotisation Modal */}
      {showNewCotisation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in" onClick={() => setShowNewCotisation(false)}>
          <div className="bg-[var(--color-surface)] rounded-2xl p-6 w-full max-w-md shadow-xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-ink">Enregistrer un paiement</h3>
              <button onClick={() => setShowNewCotisation(false)} className="text-muted hover:text-ink"><FontAwesomeIcon icon={faXmark} /></button>
            </div>
            <form onSubmit={handleAddCotisation} className="space-y-4">
              <div>
                <label className="field-label">Membre</label>
                <CustomSelect
                  options={actifs.map(m => ({ value: String(m.id), label: m.ordrePassage ? `#${m.ordrePassage} ${m.nom}` : m.nom }))}
                  value={membreIdForCotisation}
                  onChange={v => setMembreIdForCotisation(v)}
                  placeholder="Sélectionner"
                />
              </div>
              <div>
                <label className="field-label">Période</label>
                <DatePicker value={cotisationPeriode} onChange={v => setCotisationPeriode(v)} />
              </div>
              <div>
                <label className="field-label">Montant payé</label>
                <input type="number" value={cotisationMontant} onChange={e => setCotisationMontant(e.target.value)} className="input-field" placeholder={tontine.montantCotisation.toString()} min="0" step="0.01" />
                <p className="text-xs text-muted mt-1">Total (base + commission) que le membre a versé</p>
              </div>
              <button type="submit" className="btn-primary w-full">Enregistrer</button>
            </form>
          </div>
        </div>
      )}

      {/* New Tour Modal */}
      {showNewTour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in" onClick={() => setShowNewTour(false)}>
          <div className="bg-[var(--color-surface)] rounded-2xl p-6 w-full max-w-md shadow-xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-ink">Nouveau tour</h3>
              <button onClick={() => setShowNewTour(false)}><FontAwesomeIcon icon={faXmark} /></button>
            </div>
            <form onSubmit={handleAddTour} className="space-y-4">
              <div>
                <label className="field-label">Numéro de tour</label>
                <input type="number" value={newTourData.numeroTour} onChange={e => setNewTourData({...newTourData, numeroTour: e.target.value})} className="input-field" required min="1" />
              </div>
              <div>
                <label className="field-label">Date prévue</label>
                <DatePicker value={newTourData.datePrevue} onChange={v => setNewTourData({...newTourData, datePrevue: v})} />
              </div>
              <div>
                <label className="field-label">Bénéficiaire</label>
                <CustomSelect
                  options={actifs.map(m => ({ value: String(m.id), label: m.ordrePassage ? `#${m.ordrePassage} ${m.nom}` : m.nom }))}
                  value={newTourData.beneficiaireId}
                  onChange={v => setNewTourData({...newTourData, beneficiaireId: v})}
                  placeholder="Sélectionner"
                />
              </div>
              <div>
                <label className="field-label">Montant attendu</label>
                <input type="number" value={newTourData.montantAttendu} onChange={e => setNewTourData({...newTourData, montantAttendu: e.target.value})} className="input-field" required min="1" />
                <p className="text-xs text-muted mt-1">montantCotisation × membres = {formatCurrency(tontine.montantCotisation * actifs.length)}</p>
              </div>
              <button type="submit" className="btn-primary w-full">Créer</button>
            </form>
          </div>
        </div>
      )}

      {/* Dist Modal */}
      {showDistribution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in" onClick={() => setShowDistribution(false)}>
          <div className="bg-[var(--color-surface)] rounded-2xl p-6 w-full max-w-md shadow-xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-ink">Planifier distribution</h3>
              <button onClick={() => setShowDistribution(false)}><FontAwesomeIcon icon={faXmark} /></button>
            </div>
            <form onSubmit={handleSaveDistribution} className="space-y-4">
              <div>
                <label className="field-label">Date</label>
                <DatePicker value={distData.dateDistribution} onChange={v => setDistData({...distData, dateDistribution: v})} />
              </div>
              <div>
                <label className="field-label">Montant alloué aux vivres</label>
                <input type="number" value={distData.montantAlloueVivres} onChange={e => setDistData({...distData, montantAlloueVivres: e.target.value})} className="input-field" min="0" />
              </div>
              <div>
                <label className="field-label">Montant distribué en argent</label>
                <input type="number" value={distData.montantAlloueArgent} onChange={e => setDistData({...distData, montantAlloueArgent: e.target.value})} className="input-field" min="0" />
              </div>
              <p className="text-xs text-muted">Total collecté : {formatCurrency(totalCollecte)}</p>
              <button type="submit" className="btn-primary w-full">Planifier</button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      <ConfirmModal
        open={showDeleteConfirm}
        title="Supprimer la tontine"
        message={`Êtes-vous sûr de vouloir supprimer définitivement « ${tontine.nom} » ? Cette action est irréversible et supprimera toutes les cotisations, tours et données associées.`}
        confirmLabel={deleting ? "Suppression..." : "Supprimer définitivement"}
        variant="danger"
        onConfirm={async () => {
          setDeleting(true);
          try {
            const res = await fetch(`/api/tontines/${id}`, { method: "DELETE" });
            if (res.ok) { router.push("/dashboard/tontines"); return; }
            const data = await res.json();
            setError(data.error || "Erreur lors de la suppression");
          } catch { setError("Erreur"); }
          setDeleting(false);
          setShowDeleteConfirm(false);
        }}
        onCancel={() => { setShowDeleteConfirm(false); setError(""); }}
      />
    </div>
  );
}
