"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faRotateLeft, faLock, faCheck, faXmark } from "@fortawesome/free-solid-svg-icons";
import ConfirmModal from "@/components/ConfirmModal";

export default function DangerPage() {
  const router = useRouter();
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => { document.title = "Danger — Akwetche"; }, []);

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    try {
      await fetch("/api/auth/delete-account", { method: "POST" });
      router.push("/");
    } catch { setDeleteLoading(false); setShowDeleteAccountModal(false); }
  }

  async function handleDeactivateAccount() {
    setDeactivateLoading(true);
    try {
      await fetch("/api/auth/deactivate-account", { method: "POST" });
      router.push("/");
    } catch { setDeactivateLoading(false); setShowDeactivateModal(false); }
  }

  async function handleResetAll() {
    setResetLoading(true);
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResetDone(true);
      setTimeout(() => setResetDone(false), 3000);
      setShowResetModal(false);
    } catch (e) { setLoadError("Erreur lors de la réinitialisation."); console.error(e); }
    finally { setResetLoading(false); }
  }

  return (
    <div className="max-w-lg mx-auto pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Danger</h1>
        <p className="text-muted text-sm mt-0.5">Actions sensibles sur votre compte</p>
      </div>

      {loadError && (
        <div className="alert-inline neg mb-4">
          <FontAwesomeIcon icon={faXmark} className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm flex-1">{loadError}</p>
          <button onClick={() => setLoadError(null)} className="shrink-0 hover:opacity-70"><FontAwesomeIcon icon={faXmark} className="w-4 h-4" /></button>
        </div>
      )}

      {/* Désactivation — réversible */}
      <div className="card mb-4" style={{ borderColor: "var(--color-warn-border, #E5E7EB)", background: "var(--color-warn-bg, #FFFBEB)" }}>
        <div className="flex items-center gap-3 mb-3">
          <FontAwesomeIcon icon={faLock} className="w-5 h-5" style={{ color: "var(--color-warn, #D97706)" }} />
          <h2 className="text-base font-semibold" style={{ color: "var(--color-warn, #D97706)" }}>Désactiver mon compte</h2>
        </div>
        <p className="text-sm mb-1" style={{ color: "var(--color-body)" }}>Votre compte sera masqué et vous serez déconnecté. Vous pouvez le réactiver à tout moment en vous reconnectant avec votre email et mot de passe.</p>
        <p className="text-xs mb-3" style={{ color: "var(--color-muted)" }}>Aucune donnée ne sera supprimée.</p>
        <button onClick={() => setShowDeactivateModal(true)} className="flex items-center gap-2 mt-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all hover:bg-amber-50" style={{ borderColor: "var(--color-warn, #D97706)", color: "var(--color-warn, #D97706)" }}>
          <FontAwesomeIcon icon={faLock} className="w-4 h-4" />
          Désactiver mon compte
        </button>
      </div>

      {/* Réinitialisation */}
      <div className="card mb-4" style={{ borderColor: "var(--color-neg-border)", background: "var(--color-neg-bg)" }}>
        <div className="flex items-center gap-3 mb-3">
          <FontAwesomeIcon icon={faRotateLeft} className="w-5 h-5" style={{ color: "var(--color-neg)" }} />
          <h2 className="text-base font-semibold" style={{ color: "var(--color-neg)" }}>Réinitialisation</h2>
        </div>
        <p className="text-sm" style={{ color: "var(--color-body)" }}>Supprime toutes vos données (transactions, ventes, produits, catégories). Votre compte reste actif.</p>
        <button onClick={() => setShowResetModal(true)} className="btn-danger flex items-center gap-2 mt-4">
          <FontAwesomeIcon icon={faRotateLeft} className="w-4 h-4" />
          Réinitialiser toutes les données
        </button>
        {resetDone && <p className="mt-3 text-sm px-3 py-2 rounded-xl text-pos bg-pos-bg"><FontAwesomeIcon icon={faCheck} className="w-4 h-4 mr-1" /> Données réinitialisées.</p>}
      </div>

      {/* Suppression — définitive */}
      <div className="card" style={{ borderColor: "var(--color-neg-border)", background: "var(--color-neg-bg)" }}>
        <div className="flex items-center gap-3 mb-3">
          <FontAwesomeIcon icon={faTrash} className="w-5 h-5" style={{ color: "var(--color-neg)" }} />
          <h2 className="text-base font-semibold" style={{ color: "var(--color-neg)" }}>Supprimer mon compte</h2>
        </div>
        <p className="text-sm mb-1" style={{ color: "var(--color-body)" }}>Supprime définitivement votre compte et toutes vos données. Cette action est irréversible.</p>
        <p className="text-xs mb-3 font-medium" style={{ color: "var(--color-neg)" }}>Vous ne pourrez pas récupérer votre compte.</p>
        <button onClick={() => setShowDeleteAccountModal(true)} className="btn-danger flex items-center gap-2 mt-4">
          <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
          Supprimer définitivement
        </button>
      </div>

      <ConfirmModal open={showDeleteAccountModal} title="Supprimer votre compte ?" message="Cette action est irréversible. Toutes vos données seront définitivement supprimées." confirmLabel={deleteLoading ? "Suppression..." : "Oui, supprimer"} cancelLabel="Annuler" variant="danger" onConfirm={handleDeleteAccount} onCancel={() => setShowDeleteAccountModal(false)} />
      <ConfirmModal open={showDeactivateModal} title="Désactiver votre compte ?" message="Vous serez déconnecté. Vous pourrez réactiver votre compte en vous reconnectant." confirmLabel={deactivateLoading ? "Désactivation..." : "Oui, désactiver"} cancelLabel="Annuler" variant="warning" onConfirm={handleDeactivateAccount} onCancel={() => setShowDeactivateModal(false)} />
      <ConfirmModal open={showResetModal} title="Réinitialiser toutes les données ?" message="Toutes vos transactions, ventes, produits et catégories seront supprimés." confirmLabel={resetLoading ? "Réinitialisation..." : "Oui, tout supprimer"} cancelLabel="Annuler" variant="danger" onConfirm={handleResetAll} onCancel={() => setShowResetModal(false)} />
    </div>
  );
}
