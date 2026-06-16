"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCrown, faXmark, faArrowRight } from '@fortawesome/free-solid-svg-icons';

export default function ExpiredModal() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const shown = sessionStorage.getItem("akwetche_expired_modal_shown");
    if (!shown) {
      setOpen(true);
      sessionStorage.setItem("akwetche_expired_modal_shown", "true");
    }
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl animate-scale-in p-6 text-center">
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 text-muted hover:text-muted"
        >
          <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 bg-ochre-light rounded-full flex items-center justify-center mx-auto mb-5">
          <FontAwesomeIcon icon={faCrown} className="w-8 h-8 text-ochre" />
        </div>

        <h2 className="text-xl font-bold text-ink mb-2">
          Abonnement expiré
        </h2>
        <p className="text-muted text-sm mb-6 leading-relaxed">
          Votre abonnement Premium est arrivé à expiration. Votre historique est intact et sécurisé.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => router.push("/payment")}
            className="btn-primary w-full py-3 text-sm inline-flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={faCrown} className="w-4 h-4" />
            Renouveler maintenant
          </button>
          <button
            onClick={() => setOpen(false)}
            className="w-full py-3 text-sm text-muted hover:text-ink transition-colors"
          >
            Continuer en gratuit
          </button>
        </div>
      </div>
    </div>
  );
}
