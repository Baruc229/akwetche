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

export function getCurrencyForCountry(countryCode: string): CurrencyCode {
  return COUNTRY_CONFIG[countryCode as CountryCode]?.currency ?? "XOF";
}

export function formatEUR(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
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
  return Math.round(amountXOF / 655.957 * 100) / 100;
}

export function toXOF(amountEUR: number): number {
  return Math.round(amountEUR * 655.957);
}

let _activeCurrency: CurrencyCode | null = null;

export function setActiveCurrency(c: CurrencyCode) {
  _activeCurrency = c;
}

export function detectCurrency(): CurrencyCode {
  if (_activeCurrency) return _activeCurrency;
  return "XOF";
}

export function resolveCurrency(pref?: string | null): CurrencyCode {
  if (pref === "EUR" || pref === "XOF") return pref;
  return detectCurrency();
}

export function formatCurrency(amount: number, currency?: CurrencyCode): string {
  if (!currency) currency = detectCurrency();
  return currency === "EUR" ? formatEUR(amount) : formatXOF(amount);
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

export function getFlagUrl(code: string, size: number = 24): string {
  return `https://flagcdn.com/w${size}/${code.toLowerCase()}.png`;
}

export const COUNTRY_OPTIONS = ALLOWED_COUNTRIES.map((c) => ({
  value: c.code,
  label: `${c.flag} ${c.name} (${c.phonePrefix})`,
  icon: getFlagUrl(c.code, 24),
}));
