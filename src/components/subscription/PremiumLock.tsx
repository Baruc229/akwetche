"use client";

import Link from "next/link";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCrown, faLock, faClockRotateLeft } from '@fortawesome/free-solid-svg-icons';

export default function PremiumLock() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <FontAwesomeIcon icon={faCrown} className="w-8 h-8 text-red-400" />
        </div>

        <h2 className="text-xl font-bold text-ink mb-3">
          Votre abonnement Premium a expiré.
        </h2>

        <p className="text-muted text-sm mb-8 leading-relaxed">
          Vos données sont en sécurité et seront disponibles dès que vous renouvelez votre abonnement.
        </p>

        <div className="bg-sand rounded-xl p-4 mb-8 text-left text-sm text-muted space-y-2">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faLock} className="w-4 h-4 text-red-400" />
            <span>Cette fonctionnalité est réservée aux abonnés Premium</span>
          </div>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faClockRotateLeft} className="w-4 h-4 text-forest" />
            <span>Votre historique de données reste consultable</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/payment"
            className="btn-primary px-6 py-3 text-sm inline-flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={faCrown} className="w-4 h-4" />
            Renouveler maintenant
          </Link>
          <Link
            href="/dashboard"
            className="btn-secondary px-6 py-3 text-sm inline-flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={faClockRotateLeft} className="w-4 h-4" />
            Voir mon historique
          </Link>
        </div>
      </div>
    </div>
  );
}
