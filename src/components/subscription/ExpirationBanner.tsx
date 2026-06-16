"use client";

import { useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCrown, faBell, faTriangleExclamation, faXmark, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';

type Props = {
  daysRemaining: number;
  status: string;
  label: string;
  variant: "active" | "warning" | "critical" | "expired";
};

export default function ExpirationBanner({ daysRemaining, status, label, variant }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  if (status === "active" && variant === "active") return null;
  if (dismissed && variant !== "expired") return null;
  if (status !== "active" && status !== "expired") return null;

  if (variant === "warning") {
    return (
      <div className="bg-ochre-light/70 border-b border-ochre/20 px-4 py-2.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-ochre">
            <FontAwesomeIcon icon={faBell} className="w-4 h-4 shrink-0" />
            <span>
              Votre abonnement Premium expire dans <strong>{daysRemaining} jours</strong>.
            </span>
            <Link href="/payment" className="font-semibold underline ml-1 hover:no-underline">
              Renouveler
            </Link>
          </div>
          <button onClick={() => setDismissed(true)} className="text-ochre/50 hover:text-ochre shrink-0">
            <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (variant === "critical") {
    return (
      <div className="bg-ochre/10 border-b border-ochre/30 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-ochre font-medium">
            <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 shrink-0" />
            <span>
              Plus que <strong>{daysRemaining} jour{daysRemaining > 1 ? "s" : ""}</strong> avant l'expiration de votre abonnement Premium.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/payment"
              className="bg-ochre text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-ochre/90 transition-colors"
            >
              Renouveler maintenant
            </Link>
            <button onClick={() => setDismissed(true)} className="text-ochre/50 hover:text-ochre">
              <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "expired") {
    return (
      <div className="bg-red-50 border-b border-red-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {collapsed ? (
            <button onClick={() => setCollapsed(false)} className="flex items-center gap-2 text-sm text-red-700">
              <FontAwesomeIcon icon={faCrown} className="w-4 h-4" />
              <span>Votre abonnement Premium a expiré.</span>
              <FontAwesomeIcon icon={faChevronDown} className="w-3 h-3" />
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm text-red-700">
                <FontAwesomeIcon icon={faCrown} className="w-4 h-4 shrink-0" />
                <span>
                  Votre abonnement Premium a expiré. Vos données sont intactes et sécurisées.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/payment"
                  className="bg-red-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Renouveler
                </Link>
                <button onClick={() => setCollapsed(true)} className="text-red-400 hover:text-red-600">
                  <FontAwesomeIcon icon={faChevronUp} className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}
