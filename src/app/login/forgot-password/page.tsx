"use client";

import { useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelope, faArrowLeft, faCheck, faCircleExclamation } from '@fortawesome/free-solid-svg-icons';
import AuthFeaturePanel from "@/components/auth/AuthFeaturePanel";

export default function ForgotPasswordPage() {
 const [email, setEmail] = useState("");
 const [sent, setSent] = useState(false);
 const [error, setError] = useState("");
 const [loading, setLoading] = useState(false);

 async function handleSubmit(e: React.FormEvent) {
 e.preventDefault();
 setError("");
 setLoading(true);

 try {
 const res = await fetch("/api/auth/forgot-password", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ email }),
 });

 const data = await res.json();
 if (!res.ok) {
 setError(data.error || "Erreur");
 } else {
 setSent(true);
 }
 } catch {
 setError("Erreur de connexion au serveur");
 } finally {
 setLoading(false);
 }
 }

  return (
  <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
  <div className="flex items-center justify-center px-6 py-12 bg-white">
  <div className="w-full max-w-md animate-scale-in">
  <a
  href="/login"
  className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink mb-8 transition-colors"
  >
  <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
  Retour à la connexion
  </a>

  <div className="card p-8">
  {sent ? (
  <div className="text-center">
  <div className="w-16 h-16 bg-ochre-light rounded-full flex items-center justify-center mx-auto mb-4">
  <FontAwesomeIcon icon={faCheck} className="w-8 h-8 text-forest" />
  </div>
  <h1 className="text-xl font-bold text-ink mb-2">
  Email envoyé
  </h1>
  <p className="text-muted text-sm mb-6">
  Si un compte existe avec cette adresse, vous recevrez un lien de réinitialisation.
  </p>
  <a
  href="/login"
  className="text-forest font-medium hover:text-forest text-sm"
  >
  Retour à la connexion
  </a>
  </div>
  ) : (
  <>
  <div className="text-center mb-8">
  <div className="w-12 h-12 bg-forest rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
  <FontAwesomeIcon icon={faEnvelope} className="w-6 h-6 text-white" />
  </div>
  <h1 className="text-2xl font-bold text-ink">
  Mot de passe oublié
  </h1>
  <p className="text-muted text-sm mt-1">
  Saisissez votre email pour recevoir un lien de réinitialisation
  </p>
  </div>

  <form onSubmit={handleSubmit} className="space-y-4">
  <div>
  <label className="block text-sm font-medium text-ink mb-1.5">
  Email
  </label>
  <div className="relative">
  <FontAwesomeIcon icon={faEnvelope} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
  <input
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  placeholder="exemple@email.com"
  className="input-field pl-10"
  required
  />
  </div>
  </div>

  {error && (
  <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</p>
  )}

  <button
  type="submit"
  disabled={loading}
  className="btn-primary w-full py-3 text-base disabled:opacity-50"
  >
  {loading ? "Envoi..." : "Envoyer le lien"}
  </button>
  </form>
  </>
  )}
  </div>
  </div>
  </div>
  <AuthFeaturePanel />
  </div>
  );
}
