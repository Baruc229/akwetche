"use client";

import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFloppyDisk, faEye, faEyeSlash, faDesktop, faLaptop, faMobileScreen, faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { useDashboard } from "../../layout";

export default function SecuritePage() {
  const { user } = useDashboard();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sessions, setSessions] = useState<{ id: number; ipAddress: string; userAgent: string; lastActive: string; createdAt: string; isCurrent: boolean }[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [disconnectAllLoading, setDisconnectAllLoading] = useState(false);

  useEffect(() => { document.title = "Sécurité — Akwetche"; loadSessions(); }, []);

  async function loadSessions() {
    setSessionsLoading(true);
    try {
      const res = await fetch("/api/user/sessions");
      if (res.ok) { const data = await res.json(); setSessions(data.sessions || []); }
    } catch {} finally { setSessionsLoading(false); }
  }

  async function handleDisconnectSession(id: number) {
    try {
      await fetch(`/api/user/sessions/${id}`, { method: "DELETE" });
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch {}
  }

  async function handleDisconnectAll() {
    setDisconnectAllLoading(true);
    try {
      await fetch("/api/user/sessions", { method: "DELETE" });
      setSessions(prev => prev.filter(s => s.isCurrent));
    } catch {} finally { setDisconnectAllLoading(false); }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSaved(false);
    if (newPassword !== confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas");
      return;
    }
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setPasswordError(data.error || "Erreur"); return; }
      setPasswordSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch { setPasswordError("Erreur réseau"); }
  }

  return (
    <>
      {/* Mot de passe */}
      <p className="text-label mb-3">Mot de passe</p>
      <div className="card">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="field-label">Mot de passe actuel</label>
            <div style={{ position: "relative" }}>
              <input type={showCurrent ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input-field pr-10" placeholder="Mot de passe actuel" required />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-body" tabIndex={-1}>
                <FontAwesomeIcon icon={showCurrent ? faEyeSlash : faEye} />
              </button>
            </div>
          </div>
          <div>
            <label className="field-label">Nouveau mot de passe</label>
            <div style={{ position: "relative" }}>
              <input type={showNew ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field pr-10" placeholder="Nouveau mot de passe" minLength={8} required />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-body" tabIndex={-1}>
                <FontAwesomeIcon icon={showNew ? faEyeSlash : faEye} />
              </button>
            </div>
            <p className="text-xs text-muted mt-1">Minimum 8 caractères.</p>
          </div>
          <div>
            <label className="field-label">Confirmer le nouveau mot de passe</label>
            <div style={{ position: "relative" }}>
              <input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-field pr-10" placeholder="Confirmer le mot de passe" minLength={8} required />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-body" tabIndex={-1}>
                <FontAwesomeIcon icon={showConfirm ? faEyeSlash : faEye} />
              </button>
            </div>
          </div>
          {passwordError && <p className="text-sm text-neg">{passwordError}</p>}
          <button type="submit" className="btn-primary flex items-center gap-2 text-sm">
            <FontAwesomeIcon icon={faFloppyDisk} className="w-4 h-4" />
            {passwordSaved ? "Mis à jour ✓" : "Modifier le mot de passe"}
          </button>
        </form>
      </div>

      {/* Sessions actives */}
      <p className="text-label mb-3 mt-6">Sessions actives</p>
      <div className="card">
        <p className="text-sm text-muted mb-4">Appareils connectés à votre compte. Déconnectez les sessions que vous ne reconnaissez pas.</p>
        {sessionsLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="skeleton h-16 w-full rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(s => {
              const ua = s.userAgent || "";
              const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
              const isTablet = /iPad|Tablet/i.test(ua);
              const deviceIcon = isMobile ? faMobileScreen : isTablet ? faLaptop : faDesktop;
              const browserMatch = ua.match(/(Chrome|Firefox|Safari|Edge|Opera|OPR)\/[\d.]+/);
              const browser = browserMatch ? browserMatch[0].split("/")[0] : "Navigateur inconnu";
              const osMatch = ua.match(/(Windows NT 10|Mac OS X|Linux|Android|iOS|iPhone OS)[\s;)]*/i);
              const os = osMatch ? osMatch[1].replace("NT 10", "Windows 10").replace("Mac OS X", "macOS") : "Système inconnu";
              const ago = (() => {
                const diff = Math.floor((Date.now() - new Date(s.lastActive).getTime()) / 1000);
                if (diff < 60) return "À l'instant";
                if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
                if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
                return `Il y a ${Math.floor(diff / 86400)} j`;
              })();
              return (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)]" style={{ background: s.isCurrent ? "var(--color-brand-subtle)" : "var(--color-surface-raised)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.isCurrent ? "var(--color-brand)" : "var(--color-border)", color: s.isCurrent ? "white" : "var(--color-muted)" }}>
                    <FontAwesomeIcon icon={deviceIcon} className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-ink truncate">{browser} · {os}</p>
                      {s.isCurrent && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-brand)] text-white shrink-0">Cet appareil</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted">{s.ipAddress || "IP inconnue"}</span>
                      <span className="text-muted/40 text-xs">·</span>
                      <span className="text-xs text-muted">{ago}</span>
                    </div>
                  </div>
                  {!s.isCurrent && (
                    <button onClick={() => handleDisconnectSession(s.id)} className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-[var(--color-neg-bg)]" style={{ color: "var(--color-neg)" }}>
                      <FontAwesomeIcon icon={faRightFromBracket} className="w-3 h-3 mr-1" />
                      Déconnecter
                    </button>
                  )}
                </div>
              );
            })}
            {sessions.length === 0 && (
              <p className="text-sm text-muted text-center py-4">Aucune session active.</p>
            )}
          </div>
        )}
        {sessions.filter(s => !s.isCurrent).length > 0 && (
          <button onClick={handleDisconnectAll} disabled={disconnectAllLoading} className="mt-4 w-full py-2.5 rounded-xl text-sm font-medium border border-[var(--color-neg)] transition-all hover:bg-[var(--color-neg-bg)]" style={{ color: "var(--color-neg)" }}>
            {disconnectAllLoading ? "Déconnexion..." : "Déconnecter tous les autres appareils"}
          </button>
        )}
      </div>
    </>
  );
}
