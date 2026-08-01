// Utils purs du module tontine — utilisables côté serveur ET client (aucun import prisma).
// Le concept central : une "mise" = une cotisation (ex: 1 200 FCFA tous les 4 jours).
// Tout est dérivé du TOTAL versé par le membre → le système est valable sur
// toutes les tontines, y compris celles déjà existantes.

export function getFrequenceJours(frequence: string): number {
  const parsed = parseInt(frequence);
  if (!isNaN(parsed) && parsed > 0) return parsed;
  return 1;
}

export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function datePlusJours(d: Date | string, jours: number): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() + jours);
  return copy;
}

/**
 * Grille des jours de mise d'une tontine.
 * - Si des dates de tours existent (rotative) : ce sont les jours de mise.
 * - Sinon (vivres/fin d'année) : dateDebut + i×fréquence jusqu'à dateFin.
 * - Sinon (rotative sans tours) : nombre de périodes = nombreTours.
 */
export function genererGrilleMises(opts: {
  dateDebut: Date | string;
  frequenceJours: number;
  dateFin?: Date | string | null;
  nombre?: number | null;
  tourDates?: (Date | string)[] | null;
}): Date[] {
  const debut = startOfDay(new Date(opts.dateDebut));
  const freq = opts.frequenceJours > 0 ? opts.frequenceJours : 1;

  if (opts.tourDates && opts.tourDates.length > 0) {
    const dates = opts.tourDates
      .map((d) => startOfDay(new Date(d)).getTime())
      .sort((a, b) => a - b)
      .filter((d, i, arr) => i === 0 || d !== arr[i - 1]);
    return dates.map((t) => new Date(t));
  }

  const result: Date[] = [];
  if (opts.dateFin) {
    const fin = startOfDay(new Date(opts.dateFin));
    let cur = new Date(debut);
    let guard = 0;
    while (cur.getTime() <= fin.getTime() && guard < 10000) {
      result.push(new Date(cur));
      cur = datePlusJours(cur, freq);
      guard++;
    }
    return result;
  }

  const n = opts.nombre && opts.nombre > 0 ? opts.nombre : 1;
  for (let i = 0; i < n; i++) {
    result.push(datePlusJours(debut, i * freq));
  }
  return result;
}

export interface MisesMembre {
  montantMise: number;
  totalPaye: number; // Σ montantPaye des périodes enregistrées
  totalPenalites: number; // Σ montantPenalite facturées
  soldeAvance: number;
  totalVerses: number; // argent réellement reçu (périodes + avance)
  montantImputable: number; // totalVerses − pénalités → ce qui compte comme mises
  misesCompletes: number; // mises entièrement couvertes (ex: 4)
  restePartiel: number; // reste sur la mise suivante (ex: 300)
  estPartiel: boolean;
}

/**
 * Calcule les KPIs "mises" d'un membre à partir de ses paiements.
 * misesCompletes = floor(montantImputable / montantMise)
 * restePartiel   = montantImputable % montantMise
 */
export function calculerMisesMembre(opts: {
  montantMise: number;
  totalPaye: number;
  totalPenalites: number;
  soldeAvance: number;
}): MisesMembre {
  const montantMise = opts.montantMise > 0 ? opts.montantMise : 1;
  const totalVerses = Math.max(0, opts.totalPaye + opts.soldeAvance);
  const montantImputable = Math.max(0, totalVerses - Math.max(0, opts.totalPenalites));
  const misesCompletes = Math.floor(montantImputable / montantMise);
  const restePartiel = montantImputable - misesCompletes * montantMise;
  return {
    montantMise,
    totalPaye: Math.max(0, opts.totalPaye),
    totalPenalites: Math.max(0, opts.totalPenalites),
    soldeAvance: Math.max(0, opts.soldeAvance),
    totalVerses,
    montantImputable,
    misesCompletes,
    restePartiel,
    estPartiel: restePartiel > 0,
  };
}

export interface PeriodeImputable {
  id: number;
  periode: Date;
  montantTotal: number;
  montantPaye: number;
  commissionAmount: number;
}

export interface ImputationUpdate {
  id: number;
  aImputer: number;
  nouveauPaye: number;
  nouveauStatut: "paye" | "partiel";
  commission: number; // commission incrémentale à comptabiliser
}

export interface ImputationCreate {
  periode: Date;
  montantTotal: number;
  montantBase: number;
  fraisOrganisateur: number;
  aImputer: number;
  statut: "paye" | "partiel";
  commission: number;
}

function prorataCommission(montantTotal: number, fraisOrganisateur: number, montantPaye: number): number {
  if (montantTotal <= 0 || montantPaye <= 0) return 0;
  return Math.round((fraisOrganisateur * (montantPaye / montantTotal)) * 100) / 100;
}

/**
 * Planifie l'imputation d'un surplus (avance) sur les jours de mise suivants.
 * Pure : aucune écriture DB. Remplit d'abord les périodes existantes, puis en
 * crée de nouvelles jusqu'à épuisement du surplus. L'excédent hors grille reste
 * en "soldeAvance".
 */
export function planifierImputation(args: {
  surplus: number;
  montantMise: number;
  montantBase: number;
  fraisOrganisateur: number;
  periodesExistantes: PeriodeImputable[];
  dates: Date[]; // dates de mise futures (après la période courante), croissantes
}): { updates: ImputationUpdate[]; creates: ImputationCreate[]; soldeRestant: number } {
  const updates: ImputationUpdate[] = [];
  const creates: ImputationCreate[] = [];
  let reste = Math.max(0, args.surplus);

  const existingByKey = new Map<number, PeriodeImputable>();
  for (const p of args.periodesExistantes) {
    existingByKey.set(startOfDay(p.periode).getTime(), p);
  }

  const sortedExisting = [...args.periodesExistantes].sort((a, b) => a.periode.getTime() - b.periode.getTime());
  for (const p of sortedExisting) {
    if (reste <= 0) break;
    const manque = Math.max(0, p.montantTotal - p.montantPaye);
    if (manque <= 0) continue;
    const aImputer = Math.min(reste, manque);
    const nouveauPaye = p.montantPaye + aImputer;
    updates.push({
      id: p.id,
      aImputer,
      nouveauPaye,
      nouveauStatut: nouveauPaye >= p.montantTotal ? "paye" : "partiel",
      commission: prorataCommission(p.montantTotal, args.fraisOrganisateur, aImputer),
    });
    reste -= aImputer;
  }

  const montantTotal = args.montantMise > 0 ? args.montantMise : 1;
  for (const d of args.dates) {
    if (reste <= 0) break;
    const key = startOfDay(d).getTime();
    if (existingByKey.has(key)) continue;
    const aImputer = Math.min(reste, montantTotal);
    creates.push({
      periode: d,
      montantTotal,
      montantBase: args.montantBase,
      fraisOrganisateur: args.fraisOrganisateur,
      aImputer,
      statut: aImputer >= montantTotal ? "paye" : "partiel",
      commission: prorataCommission(montantTotal, args.fraisOrganisateur, aImputer),
    });
    reste -= aImputer;
  }

  return { updates, creates, soldeRestant: reste };
}
