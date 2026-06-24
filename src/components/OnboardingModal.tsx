"use client";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faArrowTrendUp, faArrowTrendDown } from '@fortawesome/free-solid-svg-icons';
import { useRouter } from "next/navigation";
import FlagImg from "@/components/ui/FlagImg";

export default function OnboardingModal({ onClose, currency, countryCode }: { onClose: () => void; currency?: string; countryCode?: string | null }) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">
      <div className="bg-[#F2EDE4] rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-16 h-16 rounded-[16px] flex items-center justify-center mb-4" style={{ backgroundColor: "rgba(28,58,47,0.08)" }}>
            <FontAwesomeIcon icon={faSun} className="w-7 h-7 text-[#1C3A2F]" style={{ strokeWidth: 1.8 }} />
          </div>
          <h3 className="text-[20px] font-[family-name:var(--font-dm-sans)] font-bold text-[#1A1A1A]">
            Bienvenue sur Akwetche
          </h3>
          <p className="text-[14px] text-[#9BA89D] mt-2 leading-relaxed font-[family-name:var(--font-inter)]">
            Suivez vos revenus et dépenses en toute simplicité. Créez vos premières catégories
            pour commencer à organiser vos finances.
          </p>
          {currency && (
            <p className="text-xs text-[#9BA89D] mt-3 bg-white rounded-xl px-3 py-2 font-[family-name:var(--font-inter)]">
              {countryCode && <FlagImg code={countryCode} className="w-4 h-4 rounded-sm inline-block align-middle mr-1" />}
              Compte en <strong className="text-[#1A1A1A]">{currency === "XOF" ? "FCFA (Franc CFA)" : "EUR (Euro)"}</strong>
            </p>
          )}
        </div>

        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-3 p-3 bg-white rounded-xl">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(28,58,47,0.08)" }}>
              <FontAwesomeIcon icon={faArrowTrendUp} className="w-4 h-4 text-[#1C3A2F]" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-[#1A1A1A] font-[family-name:var(--font-inter)]">Revenus</p>
              <p className="text-xs text-[#9BA89D] font-[family-name:var(--font-inter)]">Salaire, Freelance, Ventes...</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white rounded-xl">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(28,58,47,0.08)" }}>
              <FontAwesomeIcon icon={faArrowTrendDown} className="w-4 h-4 text-[#1C3A2F]" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-[#1A1A1A] font-[family-name:var(--font-inter)]">Dépenses</p>
              <p className="text-xs text-[#9BA89D] font-[family-name:var(--font-inter)]">Alimentation, Logement, Transport...</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => router.push("/dashboard/settings")}
            className="w-full h-12 bg-[#1C3A2F] text-white rounded-xl font-[family-name:var(--font-inter)] font-semibold text-[15px] hover:bg-[#1C3A2F]/90 transition-colors cursor-pointer"
          >
            Ajouter des catégories
          </button>
          <button
            onClick={onClose}
            className="w-full text-center text-[14px] font-[family-name:var(--font-inter)] font-medium text-[#9BA89D] hover:text-[#1A1A1A] transition-colors cursor-pointer bg-transparent border-none py-2"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
