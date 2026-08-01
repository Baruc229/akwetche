import { describe, it, expect } from "vitest";
import {
  getFrequenceJours,
  startOfDay,
  datePlusJours,
  genererGrilleMises,
  calculerMisesMembre,
  planifierImputation,
} from "@/lib/tontine-utils";

describe("tontine-utils — getFrequenceJours", () => {
  it("parse un entier", () => {
    expect(getFrequenceJours("4")).toBe(4);
    expect(getFrequenceJours("7")).toBe(7);
  });

  it("retourne 1 pour un format invalide", () => {
    expect(getFrequenceJours("hebdo")).toBe(1);
    expect(getFrequenceJours("")).toBe(1);
    expect(getFrequenceJours("0")).toBe(1);
  });
});

describe("tontine-utils — startOfDay / datePlusJours", () => {
  it("met l'heure à 00:00:00", () => {
    const d = startOfDay(new Date("2026-07-16T15:45:30"));
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getDate()).toBe(16);
  });

  it("ajoute des jours sans toucher à l'heure", () => {
    const d = datePlusJours(new Date("2026-07-16T10:00:00"), 4);
    expect(d.getDate()).toBe(20);
    expect(d.getHours()).toBe(0);
  });

  it("accepte une string", () => {
    const d = datePlusJours("2026-07-16", 3);
    expect(d.getDate()).toBe(19);
  });
});

describe("tontine-utils — genererGrilleMises", () => {
  it("génère une grille régulière jusqu'à dateFin", () => {
    const grille = genererGrilleMises({
      dateDebut: "2026-01-01",
      frequenceJours: 4,
      dateFin: "2026-01-13",
    });
    expect(grille.length).toBe(4);
    expect(grille[0].getDate()).toBe(1);
    expect(grille[1].getDate()).toBe(5);
    expect(grille[2].getDate()).toBe(9);
    expect(grille[3].getDate()).toBe(13);
  });

  it("génère n dates quand pas de dateFin", () => {
    const grille = genererGrilleMises({
      dateDebut: "2026-01-01",
      frequenceJours: 7,
      nombre: 3,
    });
    expect(grille.length).toBe(3);
    expect(grille[2].getDate()).toBe(15);
  });

  it("utilise les dates de tours (rotative) et déduplique", () => {
    const grille = genererGrilleMises({
      dateDebut: "2026-01-01",
      frequenceJours: 7,
      tourDates: ["2026-01-10", "2026-01-10", "2026-01-17"],
    });
    expect(grille.length).toBe(2);
    expect(grille[0].getDate()).toBe(10);
    expect(grille[1].getDate()).toBe(17);
  });
});

describe("tontine-utils — calculerMisesMembre", () => {
  it("4800 payés avec mise de 1200 → 4 mises complètes", () => {
    const m = calculerMisesMembre({ montantMise: 1200, totalPaye: 4800, totalPenalites: 0, soldeAvance: 0 });
    expect(m.misesCompletes).toBe(4);
    expect(m.restePartiel).toBe(0);
    expect(m.estPartiel).toBe(false);
  });

  it("5100 payés avec mise de 1200 → 4 mises + 300 sur la 5e", () => {
    const m = calculerMisesMembre({ montantMise: 1200, totalPaye: 5100, totalPenalites: 0, soldeAvance: 0 });
    expect(m.misesCompletes).toBe(4);
    expect(m.restePartiel).toBe(300);
    expect(m.estPartiel).toBe(true);
  });

  it("inclut le solde d'avance dans le total versé", () => {
    const m = calculerMisesMembre({ montantMise: 1200, totalPaye: 0, totalPenalites: 0, soldeAvance: 1200 });
    expect(m.totalVerses).toBe(1200);
    expect(m.misesCompletes).toBe(1);
  });

  it("retranche les pénalités du montant imputable", () => {
    const m = calculerMisesMembre({ montantMise: 1200, totalPaye: 5100, totalPenalites: 300, soldeAvance: 0 });
    expect(m.montantImputable).toBe(4800);
    expect(m.misesCompletes).toBe(4);
    expect(m.restePartiel).toBe(0);
  });
});

describe("tontine-utils — planifierImputation", () => {
  const montantMise = 1200;
  const montantBase = 1000;
  const fraisOrganisateur = 200;
  const dates = ["2026-01-05", "2026-01-09", "2026-01-13"].map((s) => new Date(s));

  it("remplit d'abord les périodes existantes en attente", () => {
    const plan = planifierImputation({
      surplus: 2400,
      montantMise,
      montantBase,
      fraisOrganisateur,
      periodesExistantes: [
        { id: 1, periode: new Date("2026-01-05"), montantTotal: 1200, montantPaye: 0, commissionAmount: 0 },
        { id: 2, periode: new Date("2026-01-09"), montantTotal: 1200, montantPaye: 300, commissionAmount: 50 },
      ],
      dates,
    });
    expect(plan.updates.map((u) => u.id)).toEqual([1, 2]);
    expect(plan.updates[0].aImputer).toBe(1200);
    expect(plan.updates[0].nouveauStatut).toBe("paye");
    expect(plan.updates[1].aImputer).toBe(900);
    expect(plan.updates[1].nouveauPaye).toBe(1200);
    // Le reste continue sur la prochaine période disponible (partiel sur la 5e mise).
    expect(plan.creates.length).toBe(1);
    expect(plan.creates[0].aImputer).toBe(300);
    expect(plan.creates[0].statut).toBe("partiel");
    expect(plan.soldeRestant).toBe(0);
    // Commission incrémentale au prorata de la part payée maintenant.
    expect(plan.updates[0].commission).toBe(200);
    expect(plan.updates[1].commission).toBe(150);
    expect(plan.creates[0].commission).toBe(50);
  });

  it("matérialise les périodes manquantes puis laisse l'excédent en solde", () => {
    const plan = planifierImputation({
      surplus: 2400,
      montantMise,
      montantBase,
      fraisOrganisateur,
      periodesExistantes: [],
      dates,
    });
    expect(plan.creates.length).toBe(2);
    expect(plan.creates[0].periode.getDate()).toBe(5);
    expect(plan.creates[0].statut).toBe("paye");
    expect(plan.creates[1].aImputer).toBe(1200);
    expect(plan.soldeRestant).toBe(0);
  });

  it("laisse le surplus hors grille en soldeRestant", () => {
    const plan = planifierImputation({
      surplus: 5000,
      montantMise,
      montantBase,
      fraisOrganisateur,
      periodesExistantes: [],
      dates,
    });
    // 3 dates × 1200 = 3600 imputables → 1400 restent en avance.
    expect(plan.creates.length).toBe(3);
    expect(plan.soldeRestant).toBe(1400);
  });

  it("ne recrée pas une période déjà matérialisée", () => {
    const plan = planifierImputation({
      surplus: 2400,
      montantMise,
      montantBase,
      fraisOrganisateur,
      periodesExistantes: [],
      dates,
    });
    const plan2 = planifierImputation({
      surplus: 1200,
      montantMise,
      montantBase,
      fraisOrganisateur,
      periodesExistantes: plan.creates.map((c) => ({
        id: c.periode.getDate(),
        periode: c.periode,
        montantTotal: c.montantTotal,
        montantPaye: c.aImputer,
        commissionAmount: c.commission,
      })),
      dates,
    });
    // Jan 5 et Jan 9 sont déjà payées → seul Jan 13 est créé.
    expect(plan2.updates.length).toBe(0);
    expect(plan2.creates.length).toBe(1);
    expect(plan2.creates[0].aImputer).toBe(1200);
    expect(plan2.soldeRestant).toBe(0);
  });
});
