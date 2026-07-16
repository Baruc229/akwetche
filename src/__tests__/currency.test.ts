import { describe, it, expect, beforeEach } from "vitest";
import {
  EUR_TO_FCFA,
  toStorageCurrency,
  toDisplayCurrency,
  toEUR,
  toXOF,
  formatEUR,
  formatXOF,
  formatCurrency,
  formatDualCurrency,
  roundByCurrency,
  getCountryByCode,
  getPhonePrefix,
  validatePhone,
  validatePhoneMessage,
  validateName,
  getCurrencyForCountry,
  getCountryName,
  getCountryFlag,
  getCountryFlagDisplay,
  setActiveCurrency,
  detectCurrency,
  resolveCurrency,
  convertForStorage,
  convertForDisplay,
} from "@/lib/currency";

describe("currency — Constantes", () => {
  it("EUR_TO_FCFA vaut 655.957", () => {
    expect(EUR_TO_FCFA).toBe(655.957);
  });
});

describe("currency — Conversion vers le stockage (FCFA)", () => {
  it("toStorageCurrency convertit EUR → FCFA", () => {
    expect(toStorageCurrency(1, "EUR")).toBe(656);
    expect(toStorageCurrency(100, "EUR")).toBe(65596);
  });

  it("toStorageCurrency retourne l'entier pour XOF", () => {
    expect(toStorageCurrency(5000, "XOF")).toBe(5000);
  });

  it("toStorageCurrency arrondit au plus proche", () => {
    expect(toStorageCurrency(0.001, "EUR")).toBe(1);
  });
});

describe("currency — Conversion depuis le stockage", () => {
  it("toDisplayCurrency convertit FCFA → EUR", () => {
    const result = toDisplayCurrency(655957, "EUR");
    expect(result).toBeCloseTo(1000, 1);
  });

  it("toDisplayCurrency retourne le montant pour XOF", () => {
    expect(toDisplayCurrency(5000, "XOF")).toBe(5000);
  });
});

describe("currency — Fonctions raccourcis", () => {
  it("toEUR convertit correctement", () => {
    expect(toEUR(655957)).toBeCloseTo(1000, 1);
  });

  it("toXOF convertit correctement", () => {
    expect(toXOF(1000)).toBe(655957);
  });
});

describe("currency — Formatage", () => {
  it("formatEUR retourne une chaîne avec €", () => {
    const result = formatEUR(1234.5);
    expect(result).toContain("1");
    expect(result).toContain("€");
  });

  it("formatXOF retourne une chaîne avec FCFA", () => {
    const result = formatXOF(5000);
    expect(result).toContain("5");
    expect(result).toContain("FCFA");
  });
});

describe("currency — formatCurrency", () => {
  it("affiche en FCFA quand la devise est XOF", () => {
    const result = formatCurrency(5000, "XOF");
    expect(result).toContain("FCFA");
  });

  it("affiche en EUR quand la devise est EUR", () => {
    setActiveCurrency("EUR");
    const result = formatCurrency(655957, "EUR");
    expect(result).toContain("€");
  });
});

describe("currency — formatDualCurrency", () => {
  it("retourne primary FCFA et secondary EUR en mode XOF", () => {
    const result = formatDualCurrency(655957, "XOF");
    expect(result.primary).toContain("FCFA");
    expect(result.secondary).toContain("€");
  });

  it("retourne primary EUR et secondary FCFA en mode EUR", () => {
    const result = formatDualCurrency(655957, "EUR");
    expect(result.primary).toContain("€");
    expect(result.secondary).toContain("FCFA");
  });
});

describe("currency — Arrondi", () => {
  it("roundByCurrency arrondit à l'entier pour XOF", () => {
    expect(roundByCurrency(5000.7, "XOF")).toBe(5001);
  });

  it("roundByCurrency arrondit à 2 décimales pour EUR", () => {
    expect(roundByCurrency(10.456, "EUR")).toBe(10.46);
  });
});

describe("currency — Pays", () => {
  it("getCountryByCode retourne le pays correct", () => {
    const benin = getCountryByCode("BJ");
    expect(benin).not.toBeNull();
    expect(benin!.name).toBe("Bénin");
    expect(benin!.currency).toBe("XOF");
  });

  it("getCountryByCode retourne null pour un code invalide", () => {
    expect(getCountryByCode("XX")).toBeNull();
  });

  it("getPhonePrefix retourne le préfixe correct", () => {
    expect(getPhonePrefix("BJ")).toBe("+229");
    expect(getPhonePrefix("FR")).toBe("+33");
  });

  it("getCountryName retourne le nom du pays", () => {
    expect(getCountryName("CI")).toBe("Côte d'Ivoire");
  });

  it("getCountryFlag retourne le drapeau", () => {
    const flag = getCountryFlag("TG");
    expect(flag.length).toBeGreaterThan(0);
  });

  it("getCountryFlagDisplay retourne drapeau + nom", () => {
    const display = getCountryFlagDisplay("BE");
    expect(display).toContain("Belgique");
  });
});

describe("currency — Validation téléphone", () => {
  it("valide un numéro béninois correct", () => {
    expect(validatePhone("BJ", "+2290197000000")).toBe(true);
  });

  it("rejette un numéro béninois incorrect", () => {
    expect(validatePhone("BJ", "+229999")).toBe(false);
  });

  it("valide un numéro français correct", () => {
    expect(validatePhone("FR", "+33612345678")).toBe(true);
  });

  it("rejette un pays invalide", () => {
    expect(validatePhone("XX", "+1234")).toBe(false);
  });
});

describe("currency — validatePhoneMessage", () => {
  it("retourne null pour un numéro valide", () => {
    expect(validatePhoneMessage("BJ", "+2290197000000")).toBeNull();
  });

  it("retourne un message d'erreur pour un pays invalide", () => {
    expect(validatePhoneMessage("XX", "+123")).toBe("Pays invalide");
  });

  it("demande le numéro si vide", () => {
    expect(validatePhoneMessage("BJ", "")).toBe("Veuillez saisir votre numéro");
  });
});

describe("currency — Validation nom", () => {
  it("valide un nom correct", () => {
    expect(validateName("Jean Dupont")).toBeNull();
  });

  it("rejette un nom trop court", () => {
    expect(validateName("Ab")).toContain("3 caractères");
  });

  it("rejette un nom avec des chiffres", () => {
    expect(validateName("Jean123")).toContain("lettres");
  });
});

describe("currency — Devise par pays", () => {
  it("retourne XOF pour le Bénin", () => {
    expect(getCurrencyForCountry("BJ")).toBe("XOF");
  });

  it("retourne EUR pour la France", () => {
    expect(getCurrencyForCountry("FR")).toBe("EUR");
  });

  it("retourne XOF par défaut pour un pays inconnu", () => {
    expect(getCurrencyForCountry("XX")).toBe("XOF");
  });
});

describe("currency — État global", () => {
  beforeEach(() => {
    setActiveCurrency("XOF");
  });

  it("detectCurrency retourne XOF par défaut", () => {
    setActiveCurrency("XOF");
    expect(detectCurrency()).toBe("XOF");
  });

  it("detectCurrency retourne la devise active", () => {
    setActiveCurrency("EUR");
    expect(detectCurrency()).toBe("EUR");
  });

  it("resolveCurrency retourne la valeur si valide", () => {
    expect(resolveCurrency("EUR")).toBe("EUR");
    expect(resolveCurrency("XOF")).toBe("XOF");
  });

  it("resolveCurrency retourne la devise active si invalide", () => {
    setActiveCurrency("EUR");
    expect(resolveCurrency(null)).toBe("EUR");
    expect(resolveCurrency("auto")).toBe("EUR");
  });
});

describe("currency — Wrappers dépréciés", () => {
  it("convertForStorage délégué à toStorageCurrency", () => {
    expect(convertForStorage(100, "EUR")).toBe(toStorageCurrency(100, "EUR"));
  });

  it("convertForDisplay délégué à toDisplayCurrency", () => {
    expect(convertForDisplay(655957, undefined, "EUR")).toBe(toDisplayCurrency(655957, "EUR"));
  });
});
