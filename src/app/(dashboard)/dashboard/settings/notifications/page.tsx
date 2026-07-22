"use client";

import { useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFloppyDisk } from "@fortawesome/free-solid-svg-icons";

export default function NotificationsPage() {
  useEffect(() => { document.title = "Notifications — Akwetche"; }, []);

  return (
    <>
      <p className="text-label mb-3">Notifications</p>
      <div className="card space-y-4">
        <p className="text-sm text-muted">Choisissez les notifications que vous souhaitez recevoir.</p>
        {[
          { key: "transaction", label: "Transactions", desc: "Quand une transaction est créée ou modifiée" },
          { key: "tontine", label: "Tontines", desc: "Rappels de cotisation et mises à jour" },
          { key: "sale", label: "Ventes", desc: "Nouvelles ventes et changements de statut" },
          { key: "stock", label: "Stock", desc: "Alertes de stock bas" },
          { key: "subscription", label: "Abonnement", desc: "Renouvellements et changements de plan" },
          { key: "system", label: "Système", desc: "Mises à jour et maintenance" },
        ].map(item => (
          <div key={item.key} className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-ink">{item.label}</p>
              <p className="text-xs text-muted mt-0.5">{item.desc}</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-muted">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-border text-brand accent-[var(--color-brand)]" />
                Email
              </label>
              <label className="flex items-center gap-1.5 text-xs text-muted">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-border text-brand accent-[var(--color-brand)]" />
                In-app
              </label>
            </div>
          </div>
        ))}
        <button className="btn-primary w-full justify-center flex items-center gap-2 text-sm">
          <FontAwesomeIcon icon={faFloppyDisk} className="w-4 h-4" />
          Enregistrer les préférences
        </button>
      </div>
    </>
  );
}
