"use client";

import { useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWallet, faEnvelope, faLock, faEye, faEyeSlash, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

export default function LoginPage() {
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [showPassword, setShowPassword] = useState(false);
 const [error, setError] = useState("");
 const [loading, setLoading] = useState(false);

 async function handleSubmit(e: React.FormEvent) {
 e.preventDefault();
 setError("");
 setLoading(true);

 try {
 const res = await fetch("/api/auth/login", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ email, password }),
 });

 const data = await res.json();
 if (!res.ok) {
 setError(data.error || "Erreur de connexion");
 } else {
 window.location.href = "/dashboard";
 }
 } catch {
 setError("Erreur de connexion au serveur");
 } finally {
 setLoading(false);
 }
 }

 return (
 <div className="min-h-screen bg-sand flex items-center justify-center p-4">
 <div className="w-full max-w-md animate-scale-in">
 <a
 href="/"
 className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink mb-8 transition-colors"
 >
 <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
 Retour
 </a>

 <div className="card p-8">
 <div className="text-center mb-8">
 <div className="w-12 h-12 bg-forest rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
 <FontAwesomeIcon icon={faWallet} className="w-6 h-6 text-white" />
 </div>
 <h1 className="text-2xl font-bold text-ink">
 Content de vous revoir
 </h1>
 <p className="text-muted text-sm mt-1">
 Connectez-vous à votre compte
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

 <div>
 <label className="block text-sm font-medium text-ink mb-1.5">
 Mot de passe
 </label>
 <div className="relative">
 <FontAwesomeIcon icon={faLock} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
 <input
 type={showPassword ? "text" : "password"}
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 placeholder="Votre mot de passe"
 className="input-field pl-10 pr-10"
 required
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-muted"
 >
 {showPassword ? (
 <FontAwesomeIcon icon={faEyeSlash} className="w-4 h-4" />
 ) : (
 <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
 )}
 </button>
 </div>
 <div className="flex justify-end mt-1">
 <a
 href="/login/forgot-password"
 className="text-xs text-muted hover:text-forest transition-colors"
 >
 Mot de passe oublié ?
 </a>
 </div>
 </div>

 {error && (
 <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">
 {error}
 </p>
 )}

 <button
 type="submit"
 disabled={loading}
 className="btn-primary w-full py-3 text-base disabled:opacity-50"
 >
 {loading ? "Connexion..." : "Se connecter"}
 </button>
 </form>

 <p className="text-center text-sm text-muted mt-6">
 Pas encore de compte ?{" "}
 <a
 href="/register"
 className="text-forest font-medium hover:text-forest"
 >
 Créer un compte
 </a>
 </p>
 </div>
 </div>
 </div>
 );
}
