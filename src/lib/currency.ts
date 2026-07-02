import * as flagSvgs from "country-flag-icons/string/3x2";

export type CurrencyCode = "EUR" | "XOF";

export type CountryCode = "BJ" | "TG" | "BF" | "CI" | "FR" | "BE";

export interface CountryInfo {
  code: CountryCode;
  name: string;
  flag: string;
  phonePrefix: string;
  phonePattern: RegExp;
  phoneExample: string;
  currency: CurrencyCode;
}

export const COUNTRY_CONFIG: Record<CountryCode, CountryInfo> = {
  BJ: {
    code: "BJ",
    name: "Bénin",
    flag: "🇧🇯",
    phonePrefix: "+229",
    phonePattern: /^\+22901\d{8}$/,
    phoneExample: "+2290197000000",
    currency: "XOF",
  },
  TG: {
    code: "TG",
    name: "Togo",
    flag: "🇹🇬",
    phonePrefix: "+228",
    phonePattern: /^\+228\d{8}$/,
    phoneExample: "+22890123456",
    currency: "XOF",
  },
  BF: {
    code: "BF",
    name: "Burkina Faso",
    flag: "🇧🇫",
    phonePrefix: "+226",
    phonePattern: /^\+226\d{8}$/,
    phoneExample: "+22670123456",
    currency: "XOF",
  },
  CI: {
    code: "CI",
    name: "Côte d'Ivoire",
    flag: "🇨🇮",
    phonePrefix: "+225",
    phonePattern: /^\+225\d{10}$/,
    phoneExample: "+2250701020304",
    currency: "XOF",
  },
  FR: {
    code: "FR",
    name: "France",
    flag: "🇫🇷",
    phonePrefix: "+33",
    phonePattern: /^\+33\d{9}$/,
    phoneExample: "+33612345678",
    currency: "EUR",
  },
  BE: {
    code: "BE",
    name: "Belgique",
    flag: "🇧🇪",
    phonePrefix: "+32",
    phonePattern: /^\+32\d{8,9}$/,
    phoneExample: "+32470123456",
    currency: "EUR",
  },
};

export const ALLOWED_COUNTRIES: CountryInfo[] = Object.values(COUNTRY_CONFIG);

export const ALLOWED_COUNTRY_CODES: CountryCode[] = ["BJ", "TG", "BF", "CI", "FR", "BE"];

export function getCountryByCode(code: string): CountryInfo | null {
  return COUNTRY_CONFIG[code as CountryCode] ?? null;
}

export function getPhonePrefix(countryCode: string): string {
  return COUNTRY_CONFIG[countryCode as CountryCode]?.phonePrefix ?? "";
}

export function validatePhone(countryCode: string, phone: string): boolean {
  const country = getCountryByCode(countryCode);
  if (!country) return false;
  return country.phonePattern.test(phone);
}

const PHONE_EXPECTED: Record<string, { min: number; max: number }> = {
  BJ: { min: 10, max: 10 },
  TG: { min: 8, max: 8 },
  BF: { min: 8, max: 8 },
  CI: { min: 10, max: 10 },
  FR: { min: 9, max: 9 },
  BE: { min: 8, max: 9 },
};

export function validatePhoneMessage(countryCode: string, phone: string): string | null {
  const country = getCountryByCode(countryCode);
  if (!country) return "Pays invalide";

  const prefix = country.phonePrefix;
  if (!phone || phone === prefix) return "Veuillez saisir votre numéro";
  if (!phone.startsWith(prefix)) return null;

  const digits = phone.slice(prefix.length);
  const expected = PHONE_EXPECTED[countryCode];

  if (digits.length < expected.min) {
    const missing = expected.min - digits.length;
    return `Il manque ${missing} chiffre${missing > 1 ? "s" : ""}`;
  }

  if (digits.length > expected.max) {
    const extra = digits.length - expected.max;
    return `${extra} chiffre${extra > 1 ? "s" : ""} en trop`;
  }

  if (!country.phonePattern.test(phone)) {
    if (countryCode === "BJ") return "Doit commencer par 01 après +229. Exemple : +2290197000000";
    if (countryCode === "FR") return "Doit commencer par 06 ou 07 après +33. Exemple : +33612345678";
    return `Format invalide. Exemple : ${country.phoneExample}`;
  }

  return null;
}

export const NAME_PATTERN = /^[\p{L}' \-]{3,}$/u;

export function validateName(name: string): string | null {
  if (!name || name.trim().length < 3) return "Le nom doit contenir au moins 3 caractères";
  if (!NAME_PATTERN.test(name.trim())) return "Le nom ne doit contenir que des lettres, espaces, tirets et apostrophes";
  return null;
}

export function getCurrencyForCountry(countryCode: string): CurrencyCode {
  return COUNTRY_CONFIG[countryCode as CountryCode]?.currency ?? "XOF";
}

// ============================================================
// CONSTANTE DE CONVERSION — taux fixe invariable
// ============================================================

export const EUR_TO_FCFA = 655.957;

// ============================================================
// FORMATAGE AFFICHAGE (inchangé)
// ============================================================

export function formatEUR(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatXOF(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + " FCFA";
}

// ============================================================
// FONCTIONS DE CONVERSION — PIVOT UNIQUE FCFA
// ============================================================

/** Convertir un montant saisi en devise quelconque vers l'entier FCFA de stockage */
export function toStorageCurrency(amount: number, fromCurrency: CurrencyCode): number {
  if (fromCurrency === "EUR") return Math.round(amount * EUR_TO_FCFA);
  return Math.round(amount);
}

/** Convertir un montant FCFA stocké vers la devise d'affichage */
export function toDisplayCurrency(fcfaAmount: number, toCurrency: CurrencyCode): number {
  if (toCurrency === "EUR") return fcfaAmount / EUR_TO_FCFA;
  return fcfaAmount;
}

/** Convertir FCFA → EUR (précision totale, pas d'arrondi) */
export function toEUR(amountXOF: number): number {
  return amountXOF / EUR_TO_FCFA;
}

/** Convertir EUR → FCFA (entier) */
export function toXOF(amountEUR: number): number {
  return Math.round(amountEUR * EUR_TO_FCFA);
}

// ============================================================
// ÉTAT GLOBAL D'AFFICHAGE (inchangé)
// ============================================================

let _activeCurrency: CurrencyCode | null = null;
let _activeBaseCurrency: CurrencyCode | null = null;

export function setActiveCurrency(c: CurrencyCode) {
  _activeCurrency = c;
}

export function detectCurrency(): CurrencyCode {
  if (_activeCurrency) return _activeCurrency;
  return "XOF";
}

/** @deprecated Le stockage est toujours en FCFA — cette fonction n'a plus d'utilité */
export function setActiveBaseCurrency(_c: CurrencyCode) {
  _activeBaseCurrency = "XOF";
}

/** @deprecated Le stockage est toujours en FCFA — retourne toujours "XOF" */
export function detectBaseCurrency(): CurrencyCode {
  return "XOF";
}

export function resolveCurrency(pref?: string | null): CurrencyCode {
  if (pref === "EUR" || pref === "XOF") return pref;
  return detectCurrency();
}

// ============================================================
// FORMATAGE — version simplifiée, prend un montant FCFA
// ============================================================

export function formatCurrency(fcfaAmount: number, currency?: CurrencyCode, _baseCurrency?: CurrencyCode): string {
  if (!currency) currency = detectCurrency();
  if (currency === "EUR") return formatEUR(toDisplayCurrency(fcfaAmount, "EUR"));
  return formatXOF(fcfaAmount);
}

export function formatDualCurrency(fcfaAmount: number, currency?: CurrencyCode): { primary: string; secondary: string } {
  if (!currency) currency = detectCurrency();
  if (currency === "EUR") {
    return {
      primary: formatEUR(toDisplayCurrency(fcfaAmount, "EUR")),
      secondary: formatXOF(fcfaAmount),
    };
  }
  return {
    primary: formatXOF(fcfaAmount),
    secondary: formatEUR(toDisplayCurrency(fcfaAmount, "EUR")),
  };
}

// ============================================================
// DÉPRÉCIÉ — wrappers temporaires pour migration progressive
// ============================================================

/** @deprecated Utiliser toStorageCurrency(amount, fromCurrency) */
export function convertForStorage(amount: number, fromCurrency: CurrencyCode, _baseCurrency?: CurrencyCode): number {
  return toStorageCurrency(amount, fromCurrency);
}

/** @deprecated Utiliser toDisplayCurrency(fcfaAmount, toCurrency) */
export function convertForDisplay(fcfaAmount: number, _baseCurrency?: CurrencyCode, toCurrency?: CurrencyCode): number {
  return toDisplayCurrency(fcfaAmount, toCurrency ?? "XOF");
}

// ============================================================
// ARRONDI PAR DEVISE
// ============================================================

export function roundByCurrency(amount: number, currency: CurrencyCode): number {
  if (currency === "XOF") return Math.round(amount);
  return Math.round(amount * 100) / 100;
}

// ============================================================
// FONCTIONS PAYS / TÉLÉPHONE (inchangées)
// ============================================================

export function getCountryName(code: string): string {
  return COUNTRY_CONFIG[code as CountryCode]?.name ?? code;
}

export function formatPhoneForDisplay(phone: string): string {
  return phone;
}

export function getCountryFlag(code: string): string {
  return COUNTRY_CONFIG[code as CountryCode]?.flag ?? "";
}

export function getCountryFlagDisplay(code: string): string {
  const c = COUNTRY_CONFIG[code as CountryCode];
  return c ? `${c.flag} ${c.name}` : code;
}

export const COUNTRY_OPTIONS = ALLOWED_COUNTRIES.map((c) => ({
  value: c.code,
  label: c.name,
  icon: `data:image/svg+xml,${encodeURIComponent((flagSvgs as Record<string, string>)[c.code] || "")}`,
}));
