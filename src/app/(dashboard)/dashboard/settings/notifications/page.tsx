"use client";

import { useState, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFloppyDisk, faSpinner, faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { useDashboard } from "../../../layout";
import SettingsHeader from "@/components/settings/SettingsHeader";

const PREF_ITEMS = [
  { key: "transaction", label: "Transactions", desc: "Création, modification et suppression de transactions" },
  { key: "tontine", label: "Tontines", desc: "Rappels de cotisation et mises à jour de tontines" },
  { key: "sale", label: "Ventes", desc: "Nouvelles ventes et changements de statut" },
  { key: "stock", label: "Stock", desc: "Alertes de stock bas et mouvements" },
  { key: "subscription", label: "Abonnement", desc: "Renouvellements, expirations et changements de plan" },
  { key: "system", label: "Système", desc: "Mises à jour de l'application et maintenance" },
] as const;

type PrefValue = { email?: boolean; inApp?: boolean };
type PrefsMap = Record<string, PrefValue>;

const DEFAULT_PREFS: PrefsMap = Object.fromEntries(
  PREF_ITEMS.map((item) => [item.key, { email: true, inApp: true }])
);

function mergePrefs(defaults: PrefsMap, saved: unknown): PrefsMap {
  if (!saved || typeof saved !== "object" || Object.keys(saved).length === 0) return defaults;
  const merged = { ...defaults };
  for (const key of PREF_ITEMS.map((i) => i.key)) {
    const val = (saved as PrefsMap)[key];
    if (val) merged[key] = { email: val.email ?? true, inApp: val.inApp ?? true };
  }
  return merged;
}

export default function NotificationsPage() {
  const { user, setUser } = useDashboard();
  const [prefs, setPrefs] = useState<PrefsMap>(() => mergePrefs(DEFAULT_PREFS, user?.notificationPrefs));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { document.title = "Notifications — Akwetche"; }, []);

  // Sync prefs when user.notificationPrefs changes externally
  const savedPrefsKey = JSON.stringify(user?.notificationPrefs);
  const [syncKey, setSyncKey] = useState(savedPrefsKey);
  if (savedPrefsKey !== syncKey) { setSyncKey(savedPrefsKey); setPrefs(mergePrefs(DEFAULT_PREFS, user?.notificationPrefs)); }

  const togglePref = useCallback((key: string, channel: "email" | "inApp") => {
    setPrefs((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [channel]: !(prev[key]?.[channel] ?? true),
      },
    }));
    setSaved(false);
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationPrefs: prefs }),
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
    setSaving(false);
  }

  return (
    <div className="max-w-lg mx-auto pb-8">
      <SettingsHeader title="Notifications" subtitle="Choisissez comment être informé" />

      <div className="space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">Catégorie</span>
          <div className="flex items-center gap-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Email</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">In-app</span>
          </div>
        </div>

        {/* Preference rows */}
        <div className="card divide-y" style={{ borderColor: "var(--color-border)" }}>
          {PREF_ITEMS.map((item) => (
            <div key={item.key} className="flex items-center justify-between py-3.5 px-1">
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-sm font-medium text-ink">{item.label}</p>
                <p className="text-xs text-muted mt-0.5 truncate">{item.desc}</p>
              </div>
              <div className="flex items-center gap-6 shrink-0">
                <button
                  onClick={() => togglePref(item.key, "email")}
                  className="w-10 h-5.5 rounded-full transition-all duration-200 relative"
                  style={{
                    width: "40px",
                    height: "22px",
                    background: prefs[item.key]?.email ? "var(--color-brand)" : "var(--color-surface-raised)",
                    border: prefs[item.key]?.email ? "none" : "1.5px solid var(--color-border)",
                  }}
                  aria-label={`Email ${item.label}`}
                >
                  <span
                    className="absolute top-0.5 rounded-full bg-white transition-all duration-200"
                    style={{
                      width: "18px",
                      height: "18px",
                      left: prefs[item.key]?.email ? "20px" : "1px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                    }}
                  />
                </button>
                <button
                  onClick={() => togglePref(item.key, "inApp")}
                  className="rounded-full transition-all duration-200 relative"
                  style={{
                    width: "40px",
                    height: "22px",
                    background: prefs[item.key]?.inApp ? "var(--color-brand)" : "var(--color-surface-raised)",
                    border: prefs[item.key]?.inApp ? "none" : "1.5px solid var(--color-border)",
                  }}
                  aria-label={`In-app ${item.label}`}
                >
                  <span
                    className="absolute top-0.5 rounded-full bg-white transition-all duration-200"
                    style={{
                      width: "18px",
                      height: "18px",
                      left: prefs[item.key]?.inApp ? "20px" : "1px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                    }}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Save button */}
        {error && <p className="text-sm text-neg text-center">{error}</p>}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full justify-center flex items-center gap-2 text-sm"
        >
          {saving ? (
            <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <FontAwesomeIcon icon={faCircleCheck} className="w-4 h-4" />
          ) : (
            <FontAwesomeIcon icon={faFloppyDisk} className="w-4 h-4" />
          )}
          {saving ? "Enregistrement..." : saved ? "Enregistré !" : "Enregistrer les préférences"}
        </button>
      </div>
    </div>
  );
}
