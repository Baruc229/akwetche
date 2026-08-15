"use client";

import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPeopleGroup, faHandHoldingDollar, faTrash, faSpinner, faCircleCheck, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { useDashboard } from "../../../layout";
import SettingsHeader from "@/components/settings/SettingsHeader";
import CustomSelect from "@/components/ui/CustomSelect";

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-colors shrink-0"
      style={{ background: checked ? "var(--color-brand)" : "var(--color-surface-raised)", border: checked ? "none" : "1.5px solid var(--color-border)" }}
      role="switch"
      aria-checked={checked}
      aria-label={label}
    >
      <span className="absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-transform" style={{ transform: checked ? "translateX(18px)" : "none" }} />
    </button>
  );
}

export default function TontinesSettingsPage() {
  const { user, setUser } = useDashboard();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [commissionCount, setCommissionCount] = useState<number | null>(null);

  useEffect(() => { document.title = "Tontines — Akwetche"; }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/tontines/commissions/retirer");
        const data = await res.json();
        if (res.ok && !cancelled) setCommissionCount(data.count ?? 0);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const tontineAccess = Boolean(user?.tontineAccess);
  const recoitCommissions = user?.recoitCommissions !== false;
  const commissionScope = user?.commissionScopeDefault || "personnel";

  async function saveUser(patch: Record<string, unknown>) {
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser({ ...user!, ...data.user });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(data.error || "Erreur lors de la sauvegarde");
      }
    } catch { setError("Erreur réseau"); }
  }

  async function handleRemoveAll() {
    setRemoving(true);
    setError("");
    try {
      const res = await fetch("/api/tontines/commissions/retirer", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setCommissionCount(0);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(data.error || "Erreur lors du retrait");
      }
    } catch { setError("Erreur réseau"); }
    setRemoving(false);
  }

  return (
    <div className="max-w-2xl mx-auto pb-8">
      <SettingsHeader title="Tontines" subtitle="Gérez votre accès aux tontines et vos commissions" />

      {saved && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4" style={{ background: "var(--color-pos-bg)", color: "var(--color-pos)" }}>
          <FontAwesomeIcon icon={faCircleCheck} className="w-4 h-4" />
          <p className="text-sm font-medium">Enregistré</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4" style={{ background: "var(--color-neg-bg)", color: "var(--color-neg)" }}>
          <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Activation */}
        <div className="card p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--color-teal)12" }}>
                <FontAwesomeIcon icon={faPeopleGroup} className="w-5 h-5" style={{ color: "var(--color-teal)" }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">Tontines</p>
                <p className="text-xs text-muted mt-0.5">Gérez vos groupes d&apos;épargne collective (cotisations, mises, surplus).</p>
              </div>
            </div>
            <Toggle checked={tontineAccess} onChange={(v) => saveUser({ tontineAccess: v })} label="Activer les tontines" />
          </div>
          {!tontineAccess && (
            <p className="text-xs mt-3 pt-3 border-t" style={{ color: "var(--color-muted)", borderColor: "var(--color-border)" }}>
              Vous pouvez activer ou désactiver les tontines à tout moment. Vos données existantes sont conservées.
            </p>
          )}
        </div>

        {/* Commissions */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--color-gold)12" }}>
                <FontAwesomeIcon icon={faHandHoldingDollar} className="w-5 h-5" style={{ color: "var(--color-gold)" }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">Recevoir des commissions</p>
                <p className="text-xs text-muted mt-0.5">Percevez-vous une commission sur chaque cotisation ?</p>
              </div>
            </div>
            <Toggle checked={recoitCommissions} onChange={(v) => saveUser({ recoitCommissions: v })} label="Recevoir des commissions" />
          </div>

          {recoitCommissions && (
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Comptabiliser les commissions par défaut</label>
              <CustomSelect
                options={[
                  { value: "personnel", label: "Dans mon budget personnel" },
                  { value: "activite", label: "Dans mon activité commerciale" },
                ]}
                value={commissionScope}
                onChange={(v) => saveUser({ commissionScopeDefault: v })}
                placeholder="Où comptabiliser vos commissions"
              />
              <p className="text-xs text-muted mt-1">
                Préférence appliquée aux nouvelles tontines. Modifiable par tontine à la création.
              </p>
            </div>
          )}

          <div className="border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-medium text-ink">Commissions déjà enregistrées</p>
                <p className="text-xs text-muted mt-0.5">
                  {commissionCount === null ? "—" : commissionCount === 0 ? "Aucune commission enregistrée comme revenu." : `${commissionCount} commission(s) enregistrée(s) dans vos revenus.`}
                </p>
              </div>
              <button
                onClick={handleRemoveAll}
                disabled={removing || commissionCount === 0}
                className="btn-mono"
                style={{ color: "var(--color-neg)", borderColor: "var(--color-neg)", opacity: commissionCount === 0 ? 0.5 : 1 }}
              >
                <FontAwesomeIcon icon={removing ? faSpinner : faTrash} className={`w-4 h-4 ${removing ? "animate-spin" : ""}`} />
                {removing ? "Retrait..." : "Tout retirer"}
              </button>
            </div>
            <p className="text-xs mt-3" style={{ color: "var(--color-muted)" }}>
              Retirer supprime ces revenus de vos transactions et désactive la comptabilisation automatique pour toutes vos tontines. Vous pourrez la réactiver par tontine.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
