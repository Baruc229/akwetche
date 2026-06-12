export type CurrencyCode = "EUR" | "XOF";
export type CurrencyPref = "auto" | "EUR" | "XOF";

const FCFA_TO_EUR = 655.957;

const FCFA_LOCALES = [
  "fr", "fr-FR", "fr-CM", "fr-CI", "fr-SN", "fr-ML", "fr-BF", "fr-NE",
  "fr-TD", "fr-CF", "fr-GQ", "fr-GA", "fr-CG", "fr-BJ",
  "fr-TG", "fr-GN", "fr-MR", "fr-KM", "fr-SC", "fr-DJ",
  "fr-MG", "fr-BE", "fr-CH",
];

let _activeCurrency: CurrencyCode | null = null;

export function setActiveCurrency(c: CurrencyCode) {
  _activeCurrency = c;
}

export function detectCurrency(): CurrencyCode {
  if (_activeCurrency) return _activeCurrency;
  if (typeof window === "undefined") return "XOF";
  const lang = navigator.language;
  if (FCFA_LOCALES.includes(lang)) return "XOF";
  return "EUR";
}

export function resolveCurrency(pref?: CurrencyPref | string | null): CurrencyCode {
  if (pref === "EUR" || pref === "XOF") return pref;
  return detectCurrency();
}

export function formatEUR(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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
  return Math.round(amountXOF / FCFA_TO_EUR);
}

export function toXOF(amountEUR: number): number {
  return Math.round(amountEUR * FCFA_TO_EUR);
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
