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

export function toEUR(amountXOF: number): number {
  return amountXOF / 655.957;
}

export function toXOF(amountEUR: number): number {
  return Math.round(amountEUR * 655.957);
}

let _activeCurrency: CurrencyCode | null = null;
let _activeBaseCurrency: CurrencyCode | null = null;

export function setActiveCurrency(c: CurrencyCode) {
  _activeCurrency = c;
}

export function detectCurrency(): CurrencyCode {
  if (_activeCurrency) return _activeCurrency;
  return "XOF";
}

export function setActiveBaseCurrency(c: CurrencyCode) {
  _activeBaseCurrency = c;
}

export function detectBaseCurrency(): CurrencyCode | null {
  return _activeBaseCurrency;
}

export function resolveCurrency(pref?: string | null): CurrencyCode {
  if (pref === "EUR" || pref === "XOF") return pref;
  return detectCurrency();
}

export function formatCurrency(amount: number, currency?: CurrencyCode, baseCurrency?: CurrencyCode): string {
  if (!currency) currency = detectCurrency();
  if (baseCurrency === undefined) baseCurrency = detectBaseCurrency() ?? undefined;
  let displayAmount = amount;
  if (baseCurrency && baseCurrency !== currency) {
    displayAmount = convertAmount(amount, baseCurrency, currency);
  }
  return currency === "EUR" ? formatEUR(displayAmount) : formatXOF(displayAmount);
}

/**
 * Convertir un montant de la devise de stockage (baseCurrency) vers la devise d'affichage.
 * À utiliser pour pré-remplir les champs de formulaire à partir des valeurs DB.
 */
export function convertForDisplay(
  amount: number,
  baseCurrency: CurrencyCode,
  displayCurrency: CurrencyCode,
): number {
  if (baseCurrency === displayCurrency) return amount;
  return convertAmount(amount, baseCurrency, displayCurrency);
}

/**
 * Convertir un montant de la devise d'affichage vers la devise de stockage (baseCurrency).
 * À utiliser pour sauvegarder les saisies utilisateur en base.
 */
export function convertForStorage(
  amount: number,
  displayCurrency: CurrencyCode,
  baseCurrency: CurrencyCode,
): number {
  if (baseCurrency === displayCurrency) return amount;
  return convertAmount(amount, displayCurrency, baseCurrency);
}

export function formatDualCurrency(amount: number, currency?: CurrencyCode): { primary: string; secondary: string } {
  if (!currency) currency = detectCurrency();
  if (currency === "EUR") {
    return {
      primary: formatEUR(amount),
      secondary: formatXOF(toXOF(amount)),
    };
  }
  return {
    primary: formatXOF(amount),
    secondary: formatEUR(toEUR(amount)),
  };
}

// Server-side only: exchange rate cache
const FCFA_TO_EUR = 655.957;

interface RateCache {
  rate: number;
  expiry: number;
}

let rateCache: RateCache | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000;

export function roundByCurrency(amount: number, currency: CurrencyCode): number {
  if (currency === "XOF") return Math.round(amount);
  return Math.round(amount * 100) / 100;
}

export async function getExchangeRate(): Promise<number> {
  if (rateCache && Date.now() < rateCache.expiry) {
    return rateCache.rate;
  }

  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  if (!apiKey) {
    rateCache = { rate: FCFA_TO_EUR, expiry: Date.now() + CACHE_TTL_MS };
    return FCFA_TO_EUR;
  }

  try {
    const res = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/pair/EUR/XOF`);
    const data = await res.json();
    if (data.result === "success" && data.conversion_rate) {
      rateCache = { rate: data.conversion_rate, expiry: Date.now() + CACHE_TTL_MS };
      return data.conversion_rate;
    }
  } catch {
    rateCache = { rate: FCFA_TO_EUR, expiry: Date.now() + CACHE_TTL_MS };
  }

  return FCFA_TO_EUR;
}

export function convertAmount(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rate?: number,
): number {
  if (from === to) return amount;
  if (rate) {
    return from === "EUR" ? roundByCurrency(amount * rate, to) : roundByCurrency(amount / rate, to);
  }
  if (from === "EUR") return toXOF(amount);
  return toEUR(amount);
}

export async function convertAmountAsync(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
): Promise<number> {
  if (from === to) return amount;
  const rate = await getExchangeRate();
  return convertAmount(amount, from, to, rate);
}

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
