"use client";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faArrowRight, faStar, faArrowTrendUp, faArrowTrendDown, faTags } from '@fortawesome/free-solid-svg-icons';
import { useRouter } from "next/navigation";

export default function OnboardingModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl animate-scale-in overflow-hidden">
        <div className="bg-gradient-to-br from-forest to-teal p-6 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FontAwesomeIcon icon={faStar} className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Bienvenue sur Akwetche</h2>
          <p className="text-emerald-100 text-sm mt-1">Votre assistant financier personnel</p>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-ink leading-relaxed">
            Suivez vos revenus et dépenses en toute simplicité. Créez vos premières catégories
            pour commencer à organiser vos finances.
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-ochre-light rounded-xl">
              <div className="w-9 h-9 rounded-xl bg-forest/10 flex items-center justify-center shrink-0">
                <FontAwesomeIcon icon={faArrowTrendUp} className="w-4 h-4 text-forest" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">Catégories de revenus</p>
                <p className="text-xs text-muted">Salaire, Freelance, Ventes...</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-ochre-light rounded-xl">
              <div className="w-9 h-9 rounded-xl bg-ochre/10 flex items-center justify-center shrink-0">
                <FontAwesomeIcon icon={faArrowTrendDown} className="w-4 h-4 text-ochre" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">Catégories de dépenses</p>
                <p className="text-xs text-muted">Alimentation, Logement, Transport...</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => router.push("/dashboard/settings")}
              className="btn-primary flex items-center justify-center gap-2 py-2.5 text-sm"
            >
              <FontAwesomeIcon icon={faTags} className="w-4 h-4" />
              Créer mes catégories
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center gap-2 py-2.5 text-sm text-muted hover:text-ink font-medium rounded-xl hover:bg-sand transition-colors"
            >
              Commencer plus tard
              <FontAwesomeIcon icon={faArrowRight} className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/10 text-white hover:bg-black/20 flex items-center justify-center transition-colors"
        >
          <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
