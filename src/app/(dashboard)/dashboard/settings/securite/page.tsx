"use client";

import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFloppyDisk, faEye, faEyeSlash, faDesktop, faLaptop,
  faMobileScreen, faRightFromBracket, faEnvelope,
  faPaperPlane, faCheck, faXmark, faKey, faLock
} from "@fortawesome/free-solid-svg-icons";
import { useDashboard } from "../../../layout";
import SettingsHeader from "@/components/settings/SettingsHeader";

export default function SecuritePage() {
  const { user } = useDashboard();

  // Email
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState("");
  const [showEmailPassword, setShowEmailPassword] = useState(false);

  // Password
  const [editingPassword, setEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Reset password
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // Sessions
  const [sessions, setSessions] = useState<{ id: number; ipAddress: string; userAgent: string; lastActive: string; createdAt: string; isCurrent: boolean }[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [disconnectAllLoading, setDisconnectAllLoading] = useState(false);

  useEffect(() => { document.title = "Sécurité — Akwetche"; }, []);

  useEffect(() => {
    fetch("/api/user/sessions")
      .then(r => r.ok ? r.json() : { sessions: [] })
      .then(data => setSessions(data.sessions || []))
      .catch(() => {})
      .finally(() => setSessionsLoading(false));
  }, []);

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");
    setEmailMessage(null);
    if (!newEmail || !emailPassword) { setEmailError("Tous les champs sont requis"); return; }
    setEmailLoading(true);
    try {
      const res = await fetch("/api/auth/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: emailPassword, newEmail }),
      });
      const data = await res.json();
      if (!res.ok) { setEmailError(data.error || "Erreur"); return; }
      setEmailMessage(data.message);
      setNewEmail("");
      setEmailPassword("");
      setTimeout(() => { setEditingEmail(false); setEmailMessage(null); }, 3000);
    } catch { setEmailError("Erreur réseau"); }
    finally { setEmailLoading(false); }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSaved(false);
    if (newPassword !== confirmPassword) { setPasswordError("Les mots de passe ne correspondent pas"); return; }
    setPasswordLoading(true);
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
      setTimeout(() => { setPasswordSaved(false); setEditingPassword(false); }, 2500);
    } catch { setPasswordError("Erreur réseau"); }
    finally { setPasswordLoading(false); }
  }

  async function handleResetPassword() {
    setResetLoading(true);
    setResetMessage(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user?.email }),
      });
      const data = await res.json();
      setResetMessage(data.message || "Un email de réinitialisation a été envoyé.");
    } catch { setResetMessage("Erreur réseau. Réessayez."); }
    finally { setResetLoading(false); }
  }

  async function handleDisconnectSession(id: number) {
    try {
      const res = await fetch(`/api/user/sessions/${id}`, { method: "DELETE" });
      if (res.ok) setSessions(prev => prev.filter(s => s.id !== id));
    } catch { /* silent - UI stays unchanged */ }
  }

  async function handleDisconnectAll() {
    setDisconnectAllLoading(true);
    try {
      const res = await fetch("/api/user/sessions", { method: "DELETE" });
      if (res.ok) setSessions(prev => prev.filter(s => s.isCurrent));
    } catch { /* silent */ }
    finally { setDisconnectAllLoading(false); }
  }

  return (
    <div className="max-w-lg mx-auto pb-8">
      <SettingsHeader title="Connexion et sécurité" subtitle="Email, mot de passe et sessions" />

      <div className="space-y-8">
        {/* ─── EMAIL ─── */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider mb-4 px-1" style={{ color: "#94A3B8" }}>Email</p>
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            {!editingEmail ? (
              <div className="flex items-center gap-5 px-5 sm:px-6 py-5">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#EBF0F7" }}>
                  <FontAwesomeIcon icon={faEnvelope} className="w-5 h-5" style={{ color: "#1B3A6B" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted mb-1">Adresse email</p>
                  <p className="text-sm font-medium text-ink truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => { setEditingEmail(true); setEmailError(""); setEmailMessage(null); }}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: "var(--color-brand-subtle)", color: "var(--color-brand)" }}
                >
                  Modifier
                </button>
              </div>
            ) : (
              <form onSubmit={handleChangeEmail} className="p-5 space-y-4">
                <div>
                  <label className="field-label">Nouvelle adresse email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => { setNewEmail(e.target.value); setEmailError(""); }}
                    className="input-field"
                    placeholder="nouveau@email.com"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="field-label">Mot de passe actuel (pour confirmer)</label>
                  <div className="relative">
                    <input
                      type={showEmailPassword ? "text" : "password"}
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      className="input-field pr-10"
                      placeholder="Votre mot de passe actuel"
                      required
                    />
                    <button type="button" onClick={() => setShowEmailPassword(!showEmailPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink" tabIndex={-1}>
                      <FontAwesomeIcon icon={showEmailPassword ? faEyeSlash : faEye} className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {emailError && <p className="text-sm text-neg flex items-center gap-1.5"><FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />{emailError}</p>}
                {emailMessage && <p className="text-sm text-pos flex items-center gap-1.5"><FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5" />{emailMessage}</p>}
                <div className="flex items-center gap-2">
                  <button type="submit" disabled={emailLoading} className="btn-primary flex items-center gap-2 text-sm">
                    <FontAwesomeIcon icon={emailLoading ? faFloppyDisk : faPaperPlane} className="w-4 h-4" />
                    {emailLoading ? "Envoi..." : "Confirmer"}
                  </button>
                  <button type="button" onClick={() => setEditingEmail(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-ink transition-colors">
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>

        {/* ─── MOT DE PASSE ─── */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider mb-4 px-1" style={{ color: "#94A3B8" }}>Mot de passe</p>
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            {!editingPassword ? (
              <div className="flex items-center gap-5 px-5 sm:px-6 py-5">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#EBF0F7" }}>
                  <FontAwesomeIcon icon={faKey} className="w-5 h-5" style={{ color: "#1B3A6B" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted mb-1">Mot de passe</p>
                  <p className="text-sm font-medium text-ink">••••••••••</p>
                </div>
                <button
                  onClick={() => { setEditingPassword(true); setPasswordError(""); setPasswordSaved(false); }}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: "var(--color-brand-subtle)", color: "var(--color-brand)" }}
                >
                  Modifier
                </button>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="p-5 space-y-4">
                <div>
                  <label className="field-label">Mot de passe actuel</label>
                  <div className="relative">
                    <input type={showCurrent ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input-field pr-10" placeholder="Mot de passe actuel" required autoFocus />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink" tabIndex={-1}>
                      <FontAwesomeIcon icon={showCurrent ? faEyeSlash : faEye} className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="field-label">Nouveau mot de passe</label>
                  <div className="relative">
                    <input type={showNew ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field pr-10" placeholder="Nouveau mot de passe" minLength={8} required />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink" tabIndex={-1}>
                      <FontAwesomeIcon icon={showNew ? faEyeSlash : faEye} className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted mt-1">Minimum 8 caractères.</p>
                </div>
                <div>
                  <label className="field-label">Confirmer le nouveau mot de passe</label>
                  <div className="relative">
                    <input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-field pr-10" placeholder="Confirmer le mot de passe" minLength={8} required />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink" tabIndex={-1}>
                      <FontAwesomeIcon icon={showConfirm ? faEyeSlash : faEye} className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {passwordError && <p className="text-sm text-neg flex items-center gap-1.5"><FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />{passwordError}</p>}
                {passwordSaved && <p className="text-sm text-pos flex items-center gap-1.5"><FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5" />Mot de passe mis à jour !</p>}
                <div className="flex items-center gap-2">
                  <button type="submit" disabled={passwordLoading} className="btn-primary flex items-center gap-2 text-sm">
                    <FontAwesomeIcon icon={faFloppyDisk} className="w-4 h-4" />
                    {passwordLoading ? "Enregistrement..." : "Enregistrer"}
                  </button>
                  <button type="button" onClick={() => setEditingPassword(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-ink transition-colors">
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>

        {/* ─── RÉINITIALISATION ─── */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider mb-4 px-1" style={{ color: "#94A3B8" }}>Réinitialisation</p>
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <div className="flex items-center gap-5 px-5 sm:px-6 py-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--color-gold-light, #FEF3C7)" }}>
                <FontAwesomeIcon icon={faLock} className="w-5 h-5" style={{ color: "#B8860B" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink">Mot de passe oublié ?</p>
                <p className="text-xs text-muted mt-0.5">Recevez un lien de réinitialisation par email.</p>
              </div>
              <button
                onClick={handleResetPassword}
                disabled={resetLoading}
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{ background: "var(--color-brand-subtle)", color: "var(--color-brand)" }}
              >
                {resetLoading ? "..." : "Envoyer"}
              </button>
            </div>
            {resetMessage && (
              <div className="px-5 sm:px-6 pb-5">
                <p className="text-sm text-pos flex items-center gap-1.5"><FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5" />{resetMessage}</p>
              </div>
            )}
          </div>
        </section>

        {/* ─── SESSIONS ─── */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider mb-4 px-1" style={{ color: "#94A3B8" }}>Sessions actives</p>
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <div className="px-5 sm:px-6 pt-5 pb-2">
              <p className="text-xs text-muted">Appareils connectés à votre compte.</p>
            </div>
            <div className="px-4 sm:px-5 pb-5 space-y-3">
              {sessionsLoading ? (
                <>
                  <div className="skeleton h-16 w-full rounded-xl" />
                  <div className="skeleton h-16 w-full rounded-xl" />
                </>
              ) : (
                sessions.map(s => {
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
                    <div key={s.id} className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: s.isCurrent ? "var(--color-brand-subtle)" : "var(--color-surface-raised)" }}>
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
                })
              )}
              {sessions.length === 0 && !sessionsLoading && (
                <p className="text-sm text-muted text-center py-4">Aucune session active.</p>
              )}
            </div>
            {sessions.filter(s => !s.isCurrent).length > 0 && (
              <div className="px-5 sm:px-6 pb-5">
                <button onClick={handleDisconnectAll} disabled={disconnectAllLoading} className="w-full py-2.5 rounded-xl text-sm font-medium border border-[var(--color-neg)] transition-all hover:bg-[var(--color-neg-bg)]" style={{ color: "var(--color-neg)" }}>
                  {disconnectAllLoading ? "Déconnexion..." : "Déconnecter tous les autres appareils"}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
