"use client";

import { useState } from "react";
import { useScrollLock } from "@/hooks/useScrollLock";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faArrowTrendUp, faArrowTrendDown, faWallet } from '@fortawesome/free-solid-svg-icons';
import { useRouter } from "next/navigation";
import FlagImg from "@/components/ui/FlagImg";
import { toStorageCurrency } from "@/lib/utils";

export default function OnboardingModal({ onClose, currency, countryCode }: { onClose: () => void; currency?: string; countryCode?: string | null }) {
  const router = useRouter();
  useScrollLock(true);
  const [step, setStep] = useState<"balance" | "welcome">("balance");
  const [balanceInput, setBalanceInput] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleContinue() {
    setSaving(true);
    const val = parseFloat(balanceInput) || 0;
    const dc = currency === "XOF" ? "XOF" : "EUR";
    if (val > 0) {
      await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initialBalance: toStorageCurrency(val, dc) }),
      });
    }
    setStep("welcome");
    setSaving(false);
  }

  function handleSkip() {
    setStep("welcome");
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">
      {step === "balance" ? (
        <div className="bg-[var(--color-surface-raised)] rounded-2xl p-6 w-full max-w-md shadow-xl">
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-16 h-16 rounded-[16px] flex items-center justify-center mb-4" style={{ backgroundColor: "var(--color-brand-subtle)" }}>
              <FontAwesomeIcon icon={faWallet} className="w-7 h-7 text-[var(--color-ink)]" />
            </div>
            <h3 className="text-[20px] font-[family-name:var(--font-body)] font-bold text-[var(--color-ink)]">
              Votre solde de départ
            </h3>
            <p className="text-[14px] text-[var(--color-placeholder)] mt-2 leading-relaxed font-[family-name:var(--font-body)]">
              Indiquez l&apos;argent que vous aviez <strong>avant</strong> de commencer à utiliser Akwetche.
              Cela nous permet de calculer vos soldes réels.
            </p>
            {currency && (
              <p className="text-xs text-[var(--color-placeholder)] mt-3 bg-[var(--color-surface)] rounded-xl px-3 py-2 font-[family-name:var(--font-body)]">
                {countryCode && <FlagImg code={countryCode} className="w-4 h-4 rounded-sm inline-block align-middle mr-1" />}
                Compte en <strong className="text-[var(--color-ink)]">{currency === "XOF" ? "FCFA (Franc CFA)" : "EUR (Euro)"}</strong>
              </p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-ink mb-2 font-[family-name:var(--font-body)]">
              Solde de départ personnel
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm font-semibold pointer-events-none">
                {currency === "XOF" ? "FCFA" : "EUR"}
              </span>
              <input
                type="number"
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                placeholder="ex: 150000"
                className="w-full h-12 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] px-4 pl-16 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand)] transition-colors"
                min="0"
              />
            </div>
            <p className="text-xs text-[var(--color-placeholder)] mt-2 font-[family-name:var(--font-body)]">
              Vous pourrez modifier ce montant plus tard dans les paramètres.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleContinue}
              disabled={saving}
              className="w-full h-12 bg-[var(--color-brand)] text-white rounded-xl font-[family-name:var(--font-body)] font-semibold text-[15px] hover:bg-[var(--color-brand-hover)] transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? "..." : "Continuer"}
            </button>
            <button
              onClick={handleSkip}
              className="w-full text-center text-[14px] font-[family-name:var(--font-body)] font-medium text-[var(--color-placeholder)] hover:text-[var(--color-ink)] transition-colors cursor-pointer bg-transparent border-none py-2"
            >
              Passer cette étape
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[var(--color-surface-raised)] rounded-2xl p-6 w-full max-w-md shadow-xl">
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-16 h-16 rounded-[16px] flex items-center justify-center mb-4" style={{ backgroundColor: "var(--color-brand-subtle)" }}>
              <FontAwesomeIcon icon={faSun} className="w-7 h-7 text-[var(--color-ink)]" style={{ strokeWidth: 1.8 }} />
            </div>
            <h3 className="text-[20px] font-[family-name:var(--font-body)] font-bold text-[var(--color-ink)]">
              Bienvenue sur Akwetche
            </h3>
            <p className="text-[14px] text-[var(--color-placeholder)] mt-2 leading-relaxed font-[family-name:var(--font-body)]">
              Suivez vos revenus et dépenses en toute simplicité. Créez vos premières catégories
              pour commencer à organiser vos finances.
            </p>
            {currency && (
              <p className="text-xs text-[var(--color-placeholder)] mt-3 bg-[var(--color-surface)] rounded-xl px-3 py-2 font-[family-name:var(--font-body)]">
                {countryCode && <FlagImg code={countryCode} className="w-4 h-4 rounded-sm inline-block align-middle mr-1" />}
                Compte en <strong className="text-[var(--color-ink)]">{currency === "XOF" ? "FCFA (Franc CFA)" : "EUR (Euro)"}</strong>
              </p>
            )}
          </div>

          <div className="space-y-2 mb-6">
            <div className="flex items-center gap-3 p-3 bg-[var(--color-surface)] rounded-xl">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--color-brand-subtle)" }}>
                <FontAwesomeIcon icon={faArrowTrendUp} className="w-4 h-4 text-[var(--color-ink)]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-[var(--color-ink)] font-[family-name:var(--font-body)]">Revenus</p>
                <p className="text-xs text-[var(--color-placeholder)] font-[family-name:var(--font-body)]">Salaire, Freelance, Ventes...</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[var(--color-surface)] rounded-xl">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--color-brand-subtle)" }}>
                <FontAwesomeIcon icon={faArrowTrendDown} className="w-4 h-4 text-[var(--color-ink)]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-[var(--color-ink)] font-[family-name:var(--font-body)]">Dépenses</p>
                <p className="text-xs text-[var(--color-placeholder)] font-[family-name:var(--font-body)]">Alimentation, Logement, Transport...</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push("/dashboard/categories")}
              className="w-full h-12 bg-[var(--color-brand)] text-white rounded-xl font-[family-name:var(--font-body)] font-semibold text-[15px] hover:bg-[var(--color-brand-hover)] transition-colors cursor-pointer"
            >
              Ajouter des catégories
            </button>
            <button
              onClick={onClose}
              className="w-full text-center text-[14px] font-[family-name:var(--font-body)] font-medium text-[var(--color-placeholder)] hover:text-[var(--color-ink)] transition-colors cursor-pointer bg-transparent border-none py-2"
            >
              Plus tard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
