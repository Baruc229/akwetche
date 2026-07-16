import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatDateShort,
  getWeekId,
  getMonthId,
  getYear,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  getStartOfYear,
  getEndOfYear,
} from "@/lib/utils";

describe("utils — formatDate", () => {
  it("formate une date en français long", () => {
    const result = formatDate(new Date("2026-03-15"));
    expect(result).toContain("15");
    expect(result).toContain("2026");
  });

  it("accepte une string", () => {
    const result = formatDate("2026-07-01");
    expect(result).toContain("1");
    expect(result).toContain("2026");
  });
});

describe("utils — formatDateShort", () => {
  it("formate une date courte", () => {
    const result = formatDateShort(new Date("2026-03-15"));
    expect(result).toContain("15");
  });
});

describe("utils — getWeekId", () => {
  it("retourne un ID de semaine au format YYYY-WXX", () => {
    const id = getWeekId(new Date("2026-01-05"));
    expect(id).toMatch(/^\d{4}-W\d{1,2}$/);
  });
});

describe("utils — getMonthId", () => {
  it("retourne YYYY-MM", () => {
    expect(getMonthId(new Date("2026-03-15"))).toBe("2026-03");
  });

  it("ajoute un zéro devant le mois < 10", () => {
    expect(getMonthId(new Date("2026-01-10"))).toBe("2026-01");
  });
});

describe("utils — getYear", () => {
  it("retourne l'année", () => {
    expect(getYear(new Date("2026-07-16"))).toBe(2026);
  });
});

describe("utils — Début/Fin de semaine", () => {
  it("getStartOfWeek retourne un lundi", () => {
    const start = getStartOfWeek(new Date("2026-07-16")); // mercredi
    expect(start.getDay()).toBe(1); // lundi
  });

  it("getEndOfWeek retourne un dimanche", () => {
    const end = getEndOfWeek(new Date("2026-07-16")); // mercredi
    expect(end.getDay()).toBe(0); // dimanche
  });

  it("getEndOfWeek est après getStartOfWeek", () => {
    const start = getStartOfWeek(new Date("2026-07-16"));
    const end = getEndOfWeek(new Date("2026-07-16"));
    expect(end.getTime()).toBeGreaterThan(start.getTime());
  });
});

describe("utils — Début/Fin de mois", () => {
  it("getStartOfMonth retourne le 1er du mois", () => {
    const start = getStartOfMonth(new Date("2026-03-15"));
    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(0);
  });

  it("getEndOfMonth retourne le dernier jour du mois", () => {
    const end = getEndOfMonth(new Date("2026-02-10")); // 2026 n'est pas bissextile
    expect(end.getDate()).toBe(28);
    expect(end.getHours()).toBe(23);
  });

  it("getEndOfMonth gère les mois de 31 jours", () => {
    const end = getEndOfMonth(new Date("2026-01-10"));
    expect(end.getDate()).toBe(31);
  });
});

describe("utils — Début/Fin d'année", () => {
  it("getStartOfYear retourne le 1er janvier", () => {
    const start = getStartOfYear(new Date("2026-07-16"));
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
  });

  it("getEndOfYear retourne le 31 décembre", () => {
    const end = getEndOfYear(new Date("2026-07-16"));
    expect(end.getMonth()).toBe(11);
    expect(end.getDate()).toBe(31);
    expect(end.getHours()).toBe(23);
  });
});
