"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faPlus, faXmark, faCircleExclamation, faCheckCircle, faArrowRight, faPencil, faTrash } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from "@/lib/utils";
import { useDashboard } from "@/app/(dashboard)/layout";
import { useScrollLock } from "@/hooks/useScrollLock";
import CustomSelect from "@/components/ui/CustomSelect";
import DatePicker from "@/components/ui/DatePicker";
import ConfirmModal from "@/components/ConfirmModal";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Membre = {
  id: number; nom: string; contact: string | null; ordrePassage: number | null;
  statut: string; _count: { cotisations: number };
  nbPayees: number; montantTotalPaye: number; nbRetards: number;
  soldeAvance: number;
};

type Cotisation = {
  id: number; periode: string; montantBase: number; fraisOrganisateur: number;
  montantTotal: number; montantPaye: number; montantPenalite: number;
  datePaiement: string | null; statut: string;
  membre: { id: number; nom: string };
};

type Tour = { id: number; numeroTour: number; datePrevue: string; beneficiaireId: number; montantAttendu: number; montantCollecte: number; statut: string };

type Distribution = { id: number; dateDistribution: string; dateLimiteCotisation: string | null; montantTotalCollecte: number; montantAlloueVivres: number; montantAlloueArgent: number; statut: string };

type Tontine = {
  id: number; nom: string; type: string; montantCotisation: number; frequence: string;
  dateDebut: string; fraisOrganisateurParDefaut: number; scopeCommission: string;
  nombreTours: number | null; dateDistribution: string | null; statut: string;
  penaliteRetardActive: boolean; penaliteRetardMontant: number; penaliteRetardDelaiJours: number;
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
  const [newMembreContact, setNewMembreContact] = useState("");
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
  const [editMembreNom, setEditMembreNom] = useState("");
  const [deleteMembreConfirm, setDeleteMembreConfirm] = useState<number | null>(null);
  const [deleteCotisationConfirm, setDeleteCotisationConfirm] = useState<number | null>(null);
  const [deleteTourConfirm, setDeleteTourConfirm] = useState<number | null>(null);
  const [editingCotisation, setEditingCotisation] = useState<number | null>(null);
  const [editCotisationMontant, setEditCotisationMontant] = useState("");
  const [detailMembre, setDetailMembre] = useState<number | null>(null);
  const [editMembreContact, setEditMembreContact] = useState("");
  const [cotisationFilter, setCotisationFilter] = useState<string>("tous");
  const [cotisationGroupBy, setCotisationGroupBy] = useState<"none" | "membre">("none");

  useScrollLock(
    showNewMembre || showNewCotisation || showNewTour || showDistribution || detailMembre !== null || showDeleteConfirm || deleteMembreConfirm !== null || deleteCotisationConfirm !== null || deleteTourConfirm !== null
  );

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

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { loadData(); }, [id]);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => {
    document.title = tontine ? `${tontine.nom} — Tontine — Akwetche` : "Tontine — Akwetche";
  }, [tontine]);

  const [now] = useState(() => Date.now());

  // Calculs
  const actifs = tontine?.membres?.filter(m => m.statut === "actif") || [];
  const cotisationsPayees = tontine?.cotisations?.filter(c => c.statut === "paye" || c.statut === "partiel") || [];

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
  let nbPeriodesTotal = 0;
  if (tontine?.dateDistribution) {
    const diff = new Date(tontine.dateDistribution).getTime() - now;
    joursRestants = Math.max(0, Math.round(diff / (1000 * 3600 * 24)));
    const frequenceJours = parseInt(tontine.frequence) || 1;
    const diffDebut = new Date(tontine.dateDistribution).getTime() - new Date(tontine.dateDebut).getTime();
    nbPeriodesTotal = Math.max(1, Math.floor(diffDebut / (frequenceJours * 1000 * 3600 * 24)) + 1);
    partProjetee = tontine.montantCotisation * nbPeriodesTotal;
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
        body: JSON.stringify({ nom: newMembreNom, contact: newMembreContact || null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erreur"); return; }
      setShowNewMembre(false); setNewMembreNom(""); setNewMembreContact("");
      loadData();
    } catch { setError("Erreur"); }
  }

  async function handleRemoveMembre(membreId: number) {
    try {
      const res = await fetch(`/api/tontines/${id}/membres/${membreId}`, { method: "DELETE" });
      if (!res.ok) { const data = await res.json(); setError(data.error || "Erreur"); return; }
      setDeleteMembreConfirm(null);
      loadData();
    } catch { setError("Erreur"); }
  }

  async function handleEditMembre(membreId: number) {
    if (!editMembreNom.trim()) return;
    try {
      const res = await fetch(`/api/tontines/${id}/membres/${membreId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: editMembreNom.trim(), contact: editMembreContact || null }),
      });
      if (!res.ok) { const data = await res.json(); setError(data.error || "Erreur"); return; }
      setDetailMembre(null);
      loadData();
    } catch { setError("Erreur"); }
  }

  async function handleEditCotisation(cotisationId: number) {
    try {
      const res = await fetch(`/api/tontines/${id}/cotisations/${cotisationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ montantPaye: parseFloat(editCotisationMontant) || 0 }),
      });
      if (!res.ok) { const data = await res.json(); setError(data.error || "Erreur"); return; }
      setEditingCotisation(null);
      loadData();
    } catch { setError("Erreur"); }
  }

  async function handleDeleteCotisation(cotisationId: number) {
    try {
      const res = await fetch(`/api/tontines/${id}/cotisations/${cotisationId}`, { method: "DELETE" });
      if (!res.ok) { const data = await res.json(); setError(data.error || "Erreur"); return; }
      setDeleteCotisationConfirm(null);
      loadData();
    } catch { setError("Erreur"); }
  }

  async function handleDeleteTour(tourId: number) {
    try {
      const res = await fetch(`/api/tontines/${id}/tours?tourId=${tourId}`, { method: "DELETE" });
      if (!res.ok) { const data = await res.json(); setError(data.error || "Erreur"); return; }
      setDeleteTourConfirm(null);
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

  const detailMembreData = detailMembre ? actifs.find(m => m.id === detailMembre) : null;
  const cotisationsDuMembre = detailMembre ? tontine?.cotisations?.filter(c => c.membre.id === detailMembre) || [] : [];

  function renderCotisation(c: Cotisation) {
    const bandiere = c.statut === "paye" ? "bg-emerald-100 text-emerald-700" : c.statut === "partiel" ? "bg-amber-100 text-amber-700" : c.statut === "en_retard" ? "bg-red-100 text-red-700" : "bg-stone-100 text-stone-600";
    const statutLabel = c.statut === "paye" ? "Payé" : c.statut === "partiel" ? "Partiel" : c.statut === "en_retard" ? "En retard" : "En attente";
    const isEditing = editingCotisation === c.id;
    return (
      <div key={c.id} className={`flex items-center justify-between py-2 px-1 ${isEditing ? "bg-[var(--color-surface-raised)] rounded-lg" : ""}`}>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink truncate">{c.membre.nom}</p>
          <p className="text-xs text-muted">
            {new Date(c.periode).toLocaleDateString("fr-FR")}
            {" · "}{formatCurrency(c.montantPaye)}
            {c.montantTotal > c.montantPaye && <span className="text-red-400"> / {formatCurrency(c.montantTotal)}</span>}
          </p>
          {c.montantPenalite > 0 && (
            <p className="text-xs text-amber-600">dont pénalité: {formatCurrency(c.montantPenalite)}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {c.fraisOrganisateur > 0 && c.statut !== "en_attente" && (
            <span className="text-xs text-muted hidden sm:inline">comm. {formatCurrency(c.fraisOrganisateur)}</span>
          )}
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input type="number" value={editCotisationMontant} onChange={e => setEditCotisationMontant(e.target.value)} className="input-field text-xs py-1 px-2 w-24" min="0" step="0.01" autoFocus />
              <button onClick={() => handleEditCotisation(c.id)} className="btn-primary-sm text-xs">OK</button>
              <button onClick={() => setEditingCotisation(null)} className="btn-mono text-xs">X</button>
            </div>
          ) : (
            <>
              <span className={`badge text-xs ${bandiere}`}>{statutLabel}</span>
              <button onClick={() => { setEditingCotisation(c.id); setEditCotisationMontant(c.montantPaye.toString()); }} className="btn-ghost p-1.5" title="Modifier">
                <FontAwesomeIcon icon={faPencil} className="w-3 h-3" />
              </button>
              <button onClick={() => setDeleteCotisationConfirm(c.id)} className="btn-ghost p-1.5 hover:text-[var(--color-neg)]" title="Supprimer">
                <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

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
          <div className="flex items-center gap-3 min-w-0 group/name">
          <Link href="/dashboard/tontines" className="text-muted hover:text-ink transition-colors shrink-0">
            <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-ink truncate group-hover/name:whitespace-normal group-hover/name:break-words">{tontine.nom}</h1>
            <span className="text-xs text-muted truncate block">{tontine.type === "rotative_simple" ? "Rotative simple" : "Vivres / fin d'année"} · Écart {tontine.frequence}j · {formatCurrency(tontine.montantCotisation)}</span>
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
            <p className="text-label">Collecté brut</p>
            <p className="text-amount text-base mt-1">{formatCurrency(totalCollecte + revenuCommission)}</p>
            <p className="text-xs text-muted mt-0.5">ce que les membres ont versé</p>
          </div>
          <div className="card-inset text-center">
            <p className="text-label">Collecté net</p>
            <p className="text-amount text-base mt-1">{formatCurrency(totalCollecte)}</p>
            <p className="text-xs text-muted mt-0.5">cagnotte commune</p>
          </div>
          {tontine.fraisOrganisateurParDefaut > 0 && (
            <div className="card-inset text-center">
              <p className="text-label">Commission</p>
              <p className="text-amount text-base mt-1">{formatCurrency(revenuCommission)}</p>
              <p className="text-xs text-muted mt-0.5">revenu organisateur</p>
            </div>
          )}
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
              const enRetard = m.nbRetards > 0;
              return (
                <button key={m.id} onClick={() => { setDetailMembre(m.id); setEditMembreNom(m.nom); setEditMembreContact(m.contact || ""); }} className="w-full flex items-center justify-between py-2.5 text-left hover:bg-[var(--color-surface-raised)] rounded-lg px-1 transition-colors">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${enRetard ? "bg-red-100 dark:bg-red-900/30" : "bg-emerald-100 dark:bg-emerald-900/30"}`}>
                      <FontAwesomeIcon icon={enRetard ? faCircleExclamation : faCheckCircle} className={`w-3.5 h-3.5 ${enRetard ? "text-red-500" : "text-emerald-500"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-ink font-medium block truncate">{m.ordrePassage ? `#${m.ordrePassage} ` : ""}{m.nom}</span>
                      {m.contact && <span className="text-xs text-muted block truncate">{m.contact}</span>}
                    </div>
                    {enRetard && <span className="badge bg-red-500 text-white text-xs shrink-0">Retard</span>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2 text-right">
                    <div className="text-xs text-muted">
                      <span className="font-semibold text-ink">{m.nbPayees}</span>/{m._count.cotisations}
                      <span className="block">{formatCurrency(m.montantTotalPaye)}</span>
                    </div>
                    <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3 text-muted/30" />
                  </div>
                </button>
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
            {tontine.statut === "active" && (
              <div className="flex items-center gap-2">
                {(tontine.tours || []).length === 0 && tontine.nombreTours && actifs.length > 0 && (
                  <button onClick={async () => {
                    const res = await fetch(`/api/tontines/${id}/tours`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ generer: true }),
                    });
                    if (res.ok) loadData();
                    else { const d = await res.json(); setError(d.error || "Erreur"); }
                  }} className="btn-mono text-xs">Générer</button>
                )}
                <button onClick={() => setShowNewTour(true)} className="btn-primary-sm"><FontAwesomeIcon icon={faPlus} /> Ajouter</button>
              </div>
            )}
          </div>
          {(tontine.tours || []).length === 0 ? (
            <p className="text-sm text-muted">Aucun tour planifié</p>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {(tontine.tours || []).map(tour => {
                const beneficiaire = actifs.find(m => m.id === tour.beneficiaireId);
                const estEnCours = tour.statut === "en_cours";
                const estPlanifie = tour.statut === "planifie";
                const bgTouch = estEnCours ? "bg-emerald-50 dark:bg-emerald-900/20" : "";
                const statutLabel = tour.statut === "en_cours" ? "En cours" : tour.statut === "planifie" ? "Planifié" : tour.statut === "collecte_terminee" ? "Collecte terminée" : "Clôturé";
                const statutColor = tour.statut === "en_cours" ? "bg-amber-100 text-amber-700" : tour.statut === "planifie" ? "bg-stone-100 text-stone-600" : "bg-green-100 text-green-700";
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
                      {!estEnCours && tontine.statut === "active" && (
                        <button onClick={() => setDeleteTourConfirm(tour.id)} className="btn-ghost p-1.5 hover:text-[var(--color-neg)]" title="Supprimer">
                          <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                        </button>
                      )}
                      <span className={`badge text-xs ${statutColor}`}>
                        {statutLabel}
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
                  {nbPeriodesTotal > 0 && <> sur {nbPeriodesTotal} période(s) ⨯ {actifs.length} membre(s)</>}
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
                    body: JSON.stringify({ statut: "effectuee" }),
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
          <>
            {/* Filtres */}
            <div className="flex items-center gap-2 mb-3 overflow-x-auto scrollbar-hide">
              {["tous", "paye", "partiel", "en_retard", "en_attente"].map(f => (
                <button key={f} onClick={() => setCotisationFilter(f)} className={`btn-mono text-xs whitespace-nowrap ${cotisationFilter === f ? "!bg-[var(--color-brand-subtle)] !border-[var(--color-brand)] !text-[var(--color-brand)]" : ""}`}>
                  {f === "tous" ? "Tous" : f === "paye" ? "Payé" : f === "partiel" ? "Partiel" : f === "en_retard" ? "En retard" : "En attente"}
                </button>
              ))}
              <span className="text-xs text-muted/30">|</span>
              <button onClick={() => setCotisationGroupBy(cotisationGroupBy === "none" ? "membre" : "none")} className={`btn-mono text-xs whitespace-nowrap ${cotisationGroupBy === "membre" ? "!bg-[var(--color-brand-subtle)] !border-[var(--color-brand)] !text-[var(--color-brand)]" : ""}`}>
                {cotisationGroupBy === "membre" ? "Par membre" : "Par date"}
              </button>
            </div>
            <div className="divide-y divide-[var(--color-border)] max-h-96 overflow-y-auto custom-select-scrollbar">
              {(() => {
                const allCotisations = (tontine.cotisations || []).slice().reverse();
                const filtered = cotisationFilter === "tous" ? allCotisations : allCotisations.filter(c => c.statut === cotisationFilter);

                if (cotisationGroupBy === "membre") {
                  const grouped = new Map<number, { membre: Membre; cotisations: Cotisation[] }>();
                  actifs.forEach(m => grouped.set(m.id, { membre: m, cotisations: [] }));
                  filtered.forEach(c => {
                    const g = grouped.get(c.membre.id);
                    if (g) g.cotisations.push(c);
                  });
                  return Array.from(grouped.values()).filter(g => g.cotisations.length > 0).map(g => (
                    <div key={g.membre.id}>
                      <div className="flex items-center justify-between py-1.5 px-1 bg-[var(--color-surface-raised)]">
                        <span className="text-xs font-semibold text-ink">{g.membre.ordrePassage ? `#${g.membre.ordrePassage} ` : ""}{g.membre.nom}</span>
                        <span className="text-xs text-muted">{g.cotisations.length} · {formatCurrency(g.membre.montantTotalPaye)}</span>
                      </div>
                      {g.cotisations.map(c => renderCotisation(c))}
                    </div>
                  ));
                }

                return filtered.slice(0, 50).map(c => renderCotisation(c));
              })()}
            </div>
          </>
        )}
      </div>

      {/* Modals */}

      {/* Détail Membre Modal */}
      {detailMembreData && (
        <>
          <div className="fixed inset-0 z-50 md:hidden bg-[var(--color-bg)] animate-slide-up flex flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <button onClick={() => setDetailMembre(null)} className="w-9 h-9 flex items-center justify-center text-muted hover:text-ink rounded-lg hover:bg-[var(--color-surface-raised)] transition-colors">
                  <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 rotate-180" />
                </button>
                <h3 className="text-base font-semibold text-ink">{detailMembreData.nom}</h3>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="card-inset text-center py-2">
                  <p className="text-label">Payées</p>
                  <p className="text-base font-semibold text-ink">{detailMembreData.nbPayees}/{detailMembreData._count.cotisations}</p>
                </div>
                <div className="card-inset text-center py-2">
                  <p className="text-label">Total payé</p>
                  <p className="text-base font-semibold text-ink">{formatCurrency(detailMembreData.montantTotalPaye)}</p>
                </div>
                <div className="card-inset text-center py-2">
                  <p className="text-label">Retards</p>
                  <p className={`text-base font-semibold ${detailMembreData.nbRetards > 0 ? "text-red-500" : "text-ink"}`}>{detailMembreData.nbRetards}</p>
                </div>
              </div>
              {/* Infos */}
              {detailMembreData.ordrePassage && (
                <p className="text-sm text-muted">Ordre de passage : <strong className="text-ink">#{detailMembreData.ordrePassage}</strong></p>
              )}
              {detailMembreData.contact && (
                <p className="text-sm text-muted">Contact : <strong className="text-ink">{detailMembreData.contact}</strong></p>
              )}
              {/* Édition */}
              {tontine.statut === "active" && (
                <div className="border-t border-[var(--color-border)] pt-4">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Modifier</p>
                  <form onSubmit={e => { e.preventDefault(); handleEditMembre(detailMembreData.id); }} className="space-y-3">
                    <div>
                      <label className="field-label">Nom</label>
                      <input type="text" value={editMembreNom} onChange={e => setEditMembreNom(e.target.value)} className="input-field" required />
                    </div>
                    <div>
                      <label className="field-label">Contact</label>
                      <input type="text" value={editMembreContact} onChange={e => setEditMembreContact(e.target.value)} className="input-field" placeholder="Téléphone, email..." />
                    </div>
                    <button type="submit" className="btn-primary w-full">Enregistrer</button>
                  </form>
                </div>
              )}
              {/* Cotisations */}
              {cotisationsDuMembre.length > 0 && (
                <div className="border-t border-[var(--color-border)] pt-4">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Cotisations ({cotisationsDuMembre.length})</p>
                  <div className="space-y-2">
                    {cotisationsDuMembre.slice(0, 10).map(c => {
                      const bandiere = c.statut === "paye" ? "bg-emerald-100 text-emerald-700" : c.statut === "partiel" ? "bg-amber-100 text-amber-700" : c.statut === "en_retard" ? "bg-red-100 text-red-700" : "bg-stone-100 text-stone-600";
                      const statutLabel = c.statut === "paye" ? "Payé" : c.statut === "partiel" ? "Partiel" : c.statut === "en_retard" ? "En retard" : "En attente";
                      return (
                        <div key={c.id} className="flex items-center justify-between py-1.5">
                          <div>
                            <span className="text-sm text-muted">{new Date(c.periode).toLocaleDateString("fr-FR")}</span>
                            {c.montantPenalite > 0 && <span className="text-xs text-amber-600 ml-1">+{formatCurrency(c.montantPenalite)}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-ink">{formatCurrency(c.montantPaye)}</span>
                            <span className={`badge text-xs ${bandiere}`}>{statutLabel}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Actions */}
              {tontine.statut === "active" && (
                <div className="border-t border-[var(--color-border)] pt-4">
                  <button onClick={() => { setDetailMembre(null); setDeleteMembreConfirm(detailMembreData.id); }} className="btn-danger-sm w-full justify-center">
                    <FontAwesomeIcon icon={faTrash} className="w-3 h-3" /> Retirer ce membre
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4 bg-black/40 animate-fade-in" onClick={() => setDetailMembre(null)}>
            <div className="bg-[var(--color-surface)] rounded-2xl w-full max-w-md shadow-xl animate-scale-in max-h-[90vh] flex flex-col overflow-hidden border border-[var(--color-border)]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 pt-6 pb-0 shrink-0">
                <h3 className="text-lg font-semibold text-ink">{detailMembreData.nom}</h3>
                <button onClick={() => setDetailMembre(null)} className="text-muted hover:text-ink"><FontAwesomeIcon icon={faXmark} className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="card-inset text-center py-2">
                    <p className="text-label">Payées</p>
                    <p className="text-base font-semibold text-ink">{detailMembreData.nbPayees}/{detailMembreData._count.cotisations}</p>
                  </div>
                  <div className="card-inset text-center py-2">
                    <p className="text-label">Total payé</p>
                    <p className="text-base font-semibold text-ink">{formatCurrency(detailMembreData.montantTotalPaye)}</p>
                  </div>
                  <div className="card-inset text-center py-2">
                    <p className="text-label">Retards</p>
                    <p className={`text-base font-semibold ${detailMembreData.nbRetards > 0 ? "text-red-500" : "text-ink"}`}>{detailMembreData.nbRetards}</p>
                  </div>
                </div>
                {detailMembreData.ordrePassage && (
                  <p className="text-sm text-muted">Ordre de passage : <strong className="text-ink">#{detailMembreData.ordrePassage}</strong></p>
                )}
                {detailMembreData.contact && (
                  <p className="text-sm text-muted">Contact : <strong className="text-ink">{detailMembreData.contact}</strong></p>
                )}
                {tontine.statut === "active" && (
                  <div className="border-t border-[var(--color-border)] pt-4">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Modifier</p>
                    <form onSubmit={e => { e.preventDefault(); handleEditMembre(detailMembreData.id); }} className="space-y-3">
                      <div>
                        <label className="field-label">Nom</label>
                        <input type="text" value={editMembreNom} onChange={e => setEditMembreNom(e.target.value)} className="input-field" required />
                      </div>
                      <div>
                        <label className="field-label">Contact</label>
                        <input type="text" value={editMembreContact} onChange={e => setEditMembreContact(e.target.value)} className="input-field" placeholder="Téléphone, email..." />
                      </div>
                      <button type="submit" className="btn-primary w-full">Enregistrer</button>
                    </form>
                  </div>
                )}
                {cotisationsDuMembre.length > 0 && (
                  <div className="border-t border-[var(--color-border)] pt-4">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Cotisations ({cotisationsDuMembre.length})</p>
                    <div className="space-y-2">
                      {cotisationsDuMembre.slice(0, 10).map(c => {
                        const bandiere = c.statut === "paye" ? "bg-emerald-100 text-emerald-700" : c.statut === "partiel" ? "bg-amber-100 text-amber-700" : c.statut === "en_retard" ? "bg-red-100 text-red-700" : "bg-stone-100 text-stone-600";
                        const statutLabel = c.statut === "paye" ? "Payé" : c.statut === "partiel" ? "Partiel" : c.statut === "en_retard" ? "En retard" : "En attente";
                        return (
                          <div key={c.id} className="flex items-center justify-between py-1.5">
                            <div>
                              <span className="text-sm text-muted">{new Date(c.periode).toLocaleDateString("fr-FR")}</span>
                              {c.montantPenalite > 0 && <span className="text-xs text-amber-600 ml-1">+{formatCurrency(c.montantPenalite)}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-ink">{formatCurrency(c.montantPaye)}</span>
                              <span className={`badge text-xs ${bandiere}`}>{statutLabel}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {tontine.statut === "active" && (
                  <div className="border-t border-[var(--color-border)] pt-4">
                    <button onClick={() => { setDetailMembre(null); setDeleteMembreConfirm(detailMembreData.id); }} className="btn-danger-sm w-full justify-center">
                      <FontAwesomeIcon icon={faTrash} className="w-3 h-3" /> Retirer ce membre
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* New Membre Modal */}
      {showNewMembre && (
        <>
          <div className="fixed inset-0 z-50 md:hidden bg-[var(--color-bg)] animate-slide-up flex flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowNewMembre(false)} className="w-9 h-9 flex items-center justify-center text-muted hover:text-ink rounded-lg hover:bg-[var(--color-surface-raised)] transition-colors">
                  <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 rotate-180" />
                </button>
                <h3 className="text-base font-semibold text-ink">Nouveau membre</h3>
              </div>
            </div>
            <form onSubmit={handleAddMembre} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                  <label className="field-label">Nom</label>
                  <input type="text" value={newMembreNom} onChange={e => setNewMembreNom(e.target.value)} className="input-field" placeholder="Nom complet du membre" required />
                </div>
                <div>
                  <label className="field-label">Contact</label>
                  <input type="text" value={newMembreContact} onChange={e => setNewMembreContact(e.target.value)} className="input-field" placeholder="Téléphone, email..." />
                </div>
              </div>
              <div className="shrink-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] p-5">
                <button type="submit" className="btn-primary w-full py-3">Ajouter</button>
              </div>
            </form>
          </div>
          <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4 bg-black/40 animate-fade-in" onClick={() => setShowNewMembre(false)}>
            <div className="bg-[var(--color-surface)] rounded-2xl w-full max-w-md shadow-xl animate-scale-in max-h-[90vh] flex flex-col overflow-hidden border border-[var(--color-border)]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 pt-6 pb-0">
                <h3 className="text-lg font-semibold text-ink">Nouveau membre</h3>
                <button onClick={() => setShowNewMembre(false)} className="text-muted hover:text-ink"><FontAwesomeIcon icon={faXmark} className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddMembre} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div>
                    <label className="field-label">Nom</label>
                    <input type="text" value={newMembreNom} onChange={e => setNewMembreNom(e.target.value)} className="input-field" placeholder="Nom complet du membre" required />
                  </div>
                  <div>
                    <label className="field-label">Contact</label>
                    <input type="text" value={newMembreContact} onChange={e => setNewMembreContact(e.target.value)} className="input-field" placeholder="Téléphone, email..." />
                  </div>
                </div>
                <div className="shrink-0 border-t border-[var(--color-border)] px-6 py-4">
                  <button type="submit" className="btn-primary w-full">Ajouter</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* New Cotisation Modal */}
      {showNewCotisation && (
        <>
          <div className="fixed inset-0 z-50 md:hidden bg-[var(--color-bg)] animate-slide-up flex flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowNewCotisation(false)} className="w-9 h-9 flex items-center justify-center text-muted hover:text-ink rounded-lg hover:bg-[var(--color-surface-raised)] transition-colors">
                  <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 rotate-180" />
                </button>
                <h3 className="text-base font-semibold text-ink">Enregistrer un paiement</h3>
              </div>
            </div>
            <form onSubmit={handleAddCotisation} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                  <label className="field-label">Membre</label>
                  <CustomSelect
                    options={actifs.map(m => {
                      const nbCotisations = m.nbPayees || 0;
                      const montantPaye = m.montantTotalPaye || 0;
                      const statutBadge = m.nbRetards > 0 ? `${m.nbRetards} retard(s)` : nbCotisations > 0 ? `${nbCotisations} cotisation(s)` : "Aucune cotisation";
                      return {
                        value: String(m.id),
                        label: m.ordrePassage ? `#${m.ordrePassage} ${m.nom}` : m.nom,
                        description: `${formatCurrency(montantPaye)} · ${statutBadge}`,
                      };
                    })}
                    value={membreIdForCotisation}
                    onChange={v => setMembreIdForCotisation(v)}
                    placeholder="Sélectionner un membre"
                  />
                </div>
                <div>
                  <label className="field-label">Période</label>
                  <DatePicker value={cotisationPeriode} onChange={v => setCotisationPeriode(v)} />
                </div>
                {cotisationPeriode && (() => {
                  const periodeDate = new Date(cotisationPeriode);
                  const now = new Date();
                  const frequenceJ = parseInt(tontine.frequence) || 1;
                  const dateLimite = new Date(periodeDate.getTime() + frequenceJ * 24 * 60 * 60 * 1000);
                  const estEnRetard = now > dateLimite;
                  const penaliteActive = tontine.penaliteRetardActive && tontine.penaliteRetardMontant > 0;
                  const dateLimitePenalite = new Date(periodeDate.getTime() + (tontine.penaliteRetardDelaiJours) * 24 * 60 * 60 * 1000);
                  const penaliteAppliquee = penaliteActive && now > dateLimitePenalite;
                  const montantDus = tontine.montantCotisation + (penaliteAppliquee ? tontine.penaliteRetardMontant : 0);
                  const montantPaye = parseFloat(cotisationMontant) || 0;
                  const surplus = Math.max(0, montantPaye - montantDus);
                  const statutResultant = montantPaye <= 0 ? (estEnRetard ? "En retard" : "En attente")
                    : montantPaye >= montantDus ? "Payé" : "Partiel";
                  return (
                    <div className="card-inset space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted">Montant dû</span>
                        <span className="text-sm font-semibold text-ink">{formatCurrency(montantDus)}</span>
                      </div>
                      {penaliteAppliquee && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-amber-600">Pénalité retard</span>
                          <span className="text-sm font-semibold text-amber-600">+ {formatCurrency(tontine.penaliteRetardMontant)}</span>
                        </div>
                      )}
                      {estEnRetard && !penaliteAppliquee && penaliteActive && (
                        <p className="text-xs text-amber-500">Retard — pénalité dans {Math.max(0, Math.ceil((dateLimitePenalite.getTime() - now.getTime()) / (1000 * 3600 * 24)))} jour(s)</p>
                      )}
                      {montantPaye > 0 && (
                        <>
                          <div className="border-t border-[var(--color-border)] pt-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted">Statut résultant</span>
                              <span className={`text-sm font-semibold ${statutResultant === "Payé" ? "text-emerald-600" : statutResultant === "Partiel" ? "text-amber-600" : statutResultant === "En retard" ? "text-red-500" : "text-muted"}`}>{statutResultant}</span>
                            </div>
                          </div>
                          {surplus > 0 && (
                            <p className="text-xs text-emerald-600 font-medium">Surplus de {formatCurrency(surplus)} — imputé sur les périodes suivantes</p>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}
                <div>
                  <label className="field-label">Montant payé</label>
                  <input type="number" value={cotisationMontant} onChange={e => setCotisationMontant(e.target.value)} className="input-field" placeholder={tontine.montantCotisation.toString()} min="0" step="0.01" />
                  <p className="text-xs text-muted mt-1">Total (base + commission + pénalité éventuelle) que le membre a versé</p>
                </div>
              </div>
              <div className="shrink-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] p-5">
                <button type="submit" className="btn-primary w-full py-3">Enregistrer</button>
              </div>
            </form>
          </div>
          <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4 bg-black/40 animate-fade-in" onClick={() => setShowNewCotisation(false)}>
            <div className="bg-[var(--color-surface)] rounded-2xl w-full max-w-md shadow-xl animate-scale-in max-h-[90vh] flex flex-col overflow-hidden border border-[var(--color-border)]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 pt-6 pb-0">
                <h3 className="text-lg font-semibold text-ink">Enregistrer un paiement</h3>
                <button onClick={() => setShowNewCotisation(false)} className="text-muted hover:text-ink"><FontAwesomeIcon icon={faXmark} className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddCotisation} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div>
                    <label className="field-label">Membre</label>
                    <CustomSelect
                      options={actifs.map(m => {
                        const nbCotisations = m.nbPayees || 0;
                        const montantPaye = m.montantTotalPaye || 0;
                        const statutBadge = m.nbRetards > 0 ? `${m.nbRetards} retard(s)` : nbCotisations > 0 ? `${nbCotisations} cotisation(s)` : "Aucune cotisation";
                        return {
                          value: String(m.id),
                          label: m.ordrePassage ? `#${m.ordrePassage} ${m.nom}` : m.nom,
                          description: `${formatCurrency(montantPaye)} · ${statutBadge}`,
                        };
                      })}
                      value={membreIdForCotisation}
                      onChange={v => setMembreIdForCotisation(v)}
                      placeholder="Sélectionner un membre"
                    />
                  </div>
                  <div>
                    <label className="field-label">Période</label>
                    <DatePicker value={cotisationPeriode} onChange={v => setCotisationPeriode(v)} />
                  </div>
                  {cotisationPeriode && (() => {
                    const periodeDate = new Date(cotisationPeriode);
                    const now = new Date();
                    const frequenceJ = parseInt(tontine.frequence) || 1;
                    const dateLimite = new Date(periodeDate.getTime() + frequenceJ * 24 * 60 * 60 * 1000);
                    const estEnRetard = now > dateLimite;
                    const penaliteActive = tontine.penaliteRetardActive && tontine.penaliteRetardMontant > 0;
                    const dateLimitePenalite = new Date(periodeDate.getTime() + (tontine.penaliteRetardDelaiJours) * 24 * 60 * 60 * 1000);
                    const penaliteAppliquee = penaliteActive && now > dateLimitePenalite;
                    const montantDus = tontine.montantCotisation + (penaliteAppliquee ? tontine.penaliteRetardMontant : 0);
                    const montantPaye = parseFloat(cotisationMontant) || 0;
                    const surplus = Math.max(0, montantPaye - montantDus);
                    const statutResultant = montantPaye <= 0 ? (estEnRetard ? "En retard" : "En attente")
                      : montantPaye >= montantDus ? "Payé" : "Partiel";
                    return (
                      <div className="card-inset space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted">Montant dû</span>
                          <span className="text-sm font-semibold text-ink">{formatCurrency(montantDus)}</span>
                        </div>
                        {penaliteAppliquee && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-amber-600">Pénalité retard</span>
                            <span className="text-sm font-semibold text-amber-600">+ {formatCurrency(tontine.penaliteRetardMontant)}</span>
                          </div>
                        )}
                        {estEnRetard && !penaliteAppliquee && penaliteActive && (
                          <p className="text-xs text-amber-500">Retard — pénalité dans {Math.max(0, Math.ceil((dateLimitePenalite.getTime() - now.getTime()) / (1000 * 3600 * 24)))} jour(s)</p>
                        )}
                        {montantPaye > 0 && (
                          <>
                            <div className="border-t border-[var(--color-border)] pt-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted">Statut résultant</span>
                                <span className={`text-sm font-semibold ${statutResultant === "Payé" ? "text-emerald-600" : statutResultant === "Partiel" ? "text-amber-600" : statutResultant === "En retard" ? "text-red-500" : "text-muted"}`}>{statutResultant}</span>
                              </div>
                            </div>
                            {surplus > 0 && (
                              <p className="text-xs text-emerald-600 font-medium">Surplus de {formatCurrency(surplus)} — imputé sur les périodes suivantes</p>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })()}
                  <div>
                    <label className="field-label">Montant payé</label>
                    <input type="number" value={cotisationMontant} onChange={e => setCotisationMontant(e.target.value)} className="input-field" placeholder={tontine.montantCotisation.toString()} min="0" step="0.01" />
                    <p className="text-xs text-muted mt-1">Total (base + commission + pénalité éventuelle) que le membre a versé</p>
                  </div>
                </div>
                <div className="shrink-0 border-t border-[var(--color-border)] px-6 py-4">
                  <button type="submit" className="btn-primary w-full">Enregistrer</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* New Tour Modal */}
      {showNewTour && (
        <>
          <div className="fixed inset-0 z-50 md:hidden bg-[var(--color-bg)] animate-slide-up flex flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowNewTour(false)} className="w-9 h-9 flex items-center justify-center text-muted hover:text-ink rounded-lg hover:bg-[var(--color-surface-raised)] transition-colors">
                  <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 rotate-180" />
                </button>
                <h3 className="text-base font-semibold text-ink">Nouveau tour</h3>
              </div>
            </div>
            <form onSubmit={handleAddTour} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
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
                    placeholder="Sélectionner un membre"
                  />
                </div>
                <div>
                  <label className="field-label">Montant attendu</label>
                  <input type="number" value={newTourData.montantAttendu} onChange={e => setNewTourData({...newTourData, montantAttendu: e.target.value})} className="input-field" required min="1" />
                  <p className="text-xs text-muted mt-1">montantCotisation × membres = {formatCurrency(tontine.montantCotisation * actifs.length)}</p>
                </div>
              </div>
              <div className="shrink-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] p-5">
                <button type="submit" className="btn-primary w-full py-3">Créer</button>
              </div>
            </form>
          </div>
          <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4 bg-black/40 animate-fade-in" onClick={() => setShowNewTour(false)}>
            <div className="bg-[var(--color-surface)] rounded-2xl w-full max-w-md shadow-xl animate-scale-in max-h-[90vh] flex flex-col overflow-hidden border border-[var(--color-border)]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 pt-6 pb-0">
                <h3 className="text-lg font-semibold text-ink">Nouveau tour</h3>
                <button onClick={() => setShowNewTour(false)} className="text-muted hover:text-ink"><FontAwesomeIcon icon={faXmark} className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddTour} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                      placeholder="Sélectionner un membre"
                    />
                  </div>
                  <div>
                    <label className="field-label">Montant attendu</label>
                    <input type="number" value={newTourData.montantAttendu} onChange={e => setNewTourData({...newTourData, montantAttendu: e.target.value})} className="input-field" required min="1" />
                    <p className="text-xs text-muted mt-1">montantCotisation × membres = {formatCurrency(tontine.montantCotisation * actifs.length)}</p>
                  </div>
                </div>
                <div className="shrink-0 border-t border-[var(--color-border)] px-6 py-4">
                  <button type="submit" className="btn-primary w-full">Créer</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Dist Modal */}
      {showDistribution && (
        <>
          <div className="fixed inset-0 z-50 md:hidden bg-[var(--color-bg)] animate-slide-up flex flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowDistribution(false)} className="w-9 h-9 flex items-center justify-center text-muted hover:text-ink rounded-lg hover:bg-[var(--color-surface-raised)] transition-colors">
                  <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 rotate-180" />
                </button>
                <h3 className="text-base font-semibold text-ink">Planifier distribution</h3>
              </div>
            </div>
            <form onSubmit={handleSaveDistribution} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
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
              </div>
              <div className="shrink-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] p-5">
                <button type="submit" className="btn-primary w-full py-3">Planifier</button>
              </div>
            </form>
          </div>
          <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4 bg-black/40 animate-fade-in" onClick={() => setShowDistribution(false)}>
            <div className="bg-[var(--color-surface)] rounded-2xl w-full max-w-md shadow-xl animate-scale-in max-h-[90vh] flex flex-col overflow-hidden border border-[var(--color-border)]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 pt-6 pb-0">
                <h3 className="text-lg font-semibold text-ink">Planifier distribution</h3>
                <button onClick={() => setShowDistribution(false)} className="text-muted hover:text-ink"><FontAwesomeIcon icon={faXmark} className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSaveDistribution} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                </div>
                <div className="shrink-0 border-t border-[var(--color-border)] px-6 py-4">
                  <button type="submit" className="btn-primary w-full">Planifier</button>
                </div>
              </form>
            </div>
          </div>
        </>
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

      {/* Delete Membre Confirm Modal */}
      <ConfirmModal
        open={deleteMembreConfirm !== null}
        title="Retirer le membre"
        message="Êtes-vous sûr de vouloir retirer ce membre de la tontine ?"
        confirmLabel="Retirer"
        variant="danger"
        onConfirm={() => { if (deleteMembreConfirm !== null) handleRemoveMembre(deleteMembreConfirm); }}
        onCancel={() => setDeleteMembreConfirm(null)}
      />

      {/* Delete Cotisation Confirm Modal */}
      <ConfirmModal
        open={deleteCotisationConfirm !== null}
        title="Supprimer la cotisation"
        message="Êtes-vous sûr de vouloir supprimer cette cotisation ? La commission associée sera aussi supprimée."
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={() => { if (deleteCotisationConfirm !== null) handleDeleteCotisation(deleteCotisationConfirm); }}
        onCancel={() => setDeleteCotisationConfirm(null)}
      />

      {/* Delete Tour Confirm Modal */}
      <ConfirmModal
        open={deleteTourConfirm !== null}
        title="Supprimer le tour"
        message="Êtes-vous sûr de vouloir supprimer ce tour ?"
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={() => { if (deleteTourConfirm !== null) handleDeleteTour(deleteTourConfirm); }}
        onCancel={() => setDeleteTourConfirm(null)}
      />
    </div>
  );
}
