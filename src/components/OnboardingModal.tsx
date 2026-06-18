"use client";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faArrowTrendUp, faArrowTrendDown } from '@fortawesome/free-solid-svg-icons';
import { useRouter } from "next/navigation";
import { getFlagUrl } from "@/lib/currency";

export default function OnboardingModal({ onClose, currency, countryCode }: { onClose: () => void; currency?: string; countryCode?: string | null }) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 animate-fade-in">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-scale-in">
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-14 h-14 rounded-full bg-ochre-light flex items-center justify-center mb-4">
            <FontAwesomeIcon icon={faSun} className="w-7 h-7 text-forest" />
          </div>
          <h3 className="text-lg font-semibold text-ink">Bienvenue sur Akwetche</h3>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            Suivez vos revenus et dépenses en toute simplicité. Créez vos premières catégories
            pour commencer à organiser vos finances.
          </p>
          {currency && (
            <p className="text-xs text-muted mt-3 bg-sand rounded-xl px-3 py-2">
              {countryCode && <img src={getFlagUrl(countryCode)} alt="" className="w-5 h-5 rounded-sm inline-block align-middle mr-1" />}
              Compte en <strong>{currency === "XOF" ? "FCFA (Franc CFA)" : "EUR (Euro)"}</strong>
            </p>
          )}
        </div>

        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-3 p-3 bg-sand rounded-xl">
            <div className="w-9 h-9 rounded-xl bg-forest/10 flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={faArrowTrendUp} className="w-4 h-4 text-forest" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-ink">Revenus</p>
              <p className="text-xs text-muted">Salaire, Freelance, Ventes...</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-sand rounded-xl">
            <div className="w-9 h-9 rounded-xl bg-ochre/10 flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={faArrowTrendDown} className="w-4 h-4 text-ochre" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-ink">Dépenses</p>
              <p className="text-xs text-muted">Alimentation, Logement, Transport...</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-border text-muted hover:bg-sand transition-all cursor-pointer"
          >
            Plus tard
          </button>
          <button
            onClick={() => router.push("/dashboard/settings")}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-forest hover:bg-forest shadow-sm transition-all cursor-pointer"
          >
            Créer mes catégories
          </button>
        </div>
      </div>
    </div>
  );
}
