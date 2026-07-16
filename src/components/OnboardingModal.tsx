"use client";

import { useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faArrowTrendUp, faArrowTrendDown, faWallet } from '@fortawesome/free-solid-svg-icons';
import { useRouter } from "next/navigation";
import FlagImg from "@/components/ui/FlagImg";
import { toStorageCurrency } from "@/lib/utils";

export default function OnboardingModal({ onClose, currency, countryCode }: { onClose: () => void; currency?: string; countryCode?: string | null }) {
  const router = useRouter();
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
        body: JSON.stringify({ initialBalance: toStorageCurrency(val, dc as any) }),
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
        <div className="bg-[#F1F5F9] rounded-2xl p-6 w-full max-w-md shadow-xl">
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-16 h-16 rounded-[16px] flex items-center justify-center mb-4" style={{ backgroundColor: "rgba(27,58,107,0.08)" }}>
              <FontAwesomeIcon icon={faWallet} className="w-7 h-7 text-[#1A2744]" />
            </div>
            <h3 className="text-[20px] font-[family-name:var(--font-dm-sans)] font-bold text-[#1A2744]">
              Votre solde de départ
            </h3>
            <p className="text-[14px] text-[#94A3B8] mt-2 leading-relaxed font-[family-name:var(--font-inter)]">
              Indiquez l&apos;argent que vous aviez <strong>avant</strong> de commencer à utiliser Akwetche.
              Cela nous permet de calculer vos soldes réels.
            </p>
            {currency && (
              <p className="text-xs text-[#94A3B8] mt-3 bg-white rounded-xl px-3 py-2 font-[family-name:var(--font-inter)]">
                {countryCode && <FlagImg code={countryCode} className="w-4 h-4 rounded-sm inline-block align-middle mr-1" />}
                Compte en <strong className="text-[#1A2744]">{currency === "XOF" ? "FCFA (Franc CFA)" : "EUR (Euro)"}</strong>
              </p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-ink mb-2 font-[family-name:var(--font-inter)]">
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
                className="w-full h-12 bg-white rounded-xl border border-[#E2E8F0] px-4 pl-16 text-sm text-[#1A2744] outline-none focus:border-[#1B3A6B] transition-colors"
                min="0"
              />
            </div>
            <p className="text-xs text-[#94A3B8] mt-2 font-[family-name:var(--font-inter)]">
              Vous pourrez modifier ce montant plus tard dans les paramètres.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleContinue}
              disabled={saving}
              className="w-full h-12 bg-[#1B3A6B] text-white rounded-xl font-[family-name:var(--font-inter)] font-semibold text-[15px] hover:bg-[#1B3A6B]/90 transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? "..." : "Continuer"}
            </button>
            <button
              onClick={handleSkip}
              className="w-full text-center text-[14px] font-[family-name:var(--font-inter)] font-medium text-[#94A3B8] hover:text-[#1A2744] transition-colors cursor-pointer bg-transparent border-none py-2"
            >
              Passer cette étape
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#F1F5F9] rounded-2xl p-6 w-full max-w-md shadow-xl">
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-16 h-16 rounded-[16px] flex items-center justify-center mb-4" style={{ backgroundColor: "rgba(27,58,107,0.08)" }}>
              <FontAwesomeIcon icon={faSun} className="w-7 h-7 text-[#1A2744]" style={{ strokeWidth: 1.8 }} />
            </div>
            <h3 className="text-[20px] font-[family-name:var(--font-dm-sans)] font-bold text-[#1A2744]">
              Bienvenue sur Akwetche
            </h3>
            <p className="text-[14px] text-[#94A3B8] mt-2 leading-relaxed font-[family-name:var(--font-inter)]">
              Suivez vos revenus et dépenses en toute simplicité. Créez vos premières catégories
              pour commencer à organiser vos finances.
            </p>
            {currency && (
              <p className="text-xs text-[#94A3B8] mt-3 bg-white rounded-xl px-3 py-2 font-[family-name:var(--font-inter)]">
                {countryCode && <FlagImg code={countryCode} className="w-4 h-4 rounded-sm inline-block align-middle mr-1" />}
                Compte en <strong className="text-[#1A2744]">{currency === "XOF" ? "FCFA (Franc CFA)" : "EUR (Euro)"}</strong>
              </p>
            )}
          </div>

          <div className="space-y-2 mb-6">
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(27,58,107,0.08)" }}>
                <FontAwesomeIcon icon={faArrowTrendUp} className="w-4 h-4 text-[#1A2744]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-[#1A2744] font-[family-name:var(--font-inter)]">Revenus</p>
                <p className="text-xs text-[#94A3B8] font-[family-name:var(--font-inter)]">Salaire, Freelance, Ventes...</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(27,58,107,0.08)" }}>
                <FontAwesomeIcon icon={faArrowTrendDown} className="w-4 h-4 text-[#1A2744]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-[#1A2744] font-[family-name:var(--font-inter)]">Dépenses</p>
                <p className="text-xs text-[#94A3B8] font-[family-name:var(--font-inter)]">Alimentation, Logement, Transport...</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push("/dashboard/settings")}
              className="w-full h-12 bg-[#1B3A6B] text-white rounded-xl font-[family-name:var(--font-inter)] font-semibold text-[15px] hover:bg-[#1B3A6B]/90 transition-colors cursor-pointer"
            >
              Ajouter des catégories
            </button>
            <button
              onClick={onClose}
              className="w-full text-center text-[14px] font-[family-name:var(--font-inter)] font-medium text-[#94A3B8] hover:text-[#1A2744] transition-colors cursor-pointer bg-transparent border-none py-2"
            >
              Plus tard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
