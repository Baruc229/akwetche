"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWallet, faLock, faEye, faEyeSlash, faCheck, faArrowLeft, faCircleExclamation } from '@fortawesome/free-solid-svg-icons';

export default function ResetPasswordPage() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const token = searchParams.get("token");

 const [password, setPassword] = useState("");
 const [confirmPassword, setConfirmPassword] = useState("");
 const [showPassword, setShowPassword] = useState(false);
 const [error, setError] = useState("");
 const [success, setSuccess] = useState(false);
 const [loading, setLoading] = useState(false);

 useEffect(() => {
 if (!token) {
 setError("Lien de réinitialisation invalide ou manquant.");
 }
 }, [token]);

 async function handleSubmit(e: React.FormEvent) {
 e.preventDefault();
 setError("");

 if (password !== confirmPassword) {
 setError("Les mots de passe ne correspondent pas.");
 return;
 }
 if (password.length < 6) {
 setError("Le mot de passe doit contenir au moins 6 caractères.");
 return;
 }

 setLoading(true);

 try {
 const res = await fetch("/api/auth/reset-password", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ token, password }),
 });

 const data = await res.json();
 if (!res.ok) {
 setError(data.error || "Erreur");
 } else {
 setSuccess(true);
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
 href="/login"
 className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink mb-8 transition-colors"
 >
 <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
 Retour à la connexion
 </a>

 <div className="card p-8">
 {!token ? (
 <div className="text-center">
 <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
 <FontAwesomeIcon icon={faCircleExclamation} className="w-8 h-8 text-red-600" />
 </div>
 <h1 className="text-xl font-bold text-ink mb-2">
 Lien invalide
 </h1>
 <p className="text-muted text-sm mb-4">
 Ce lien de réinitialisation est invalide ou a expiré.
 </p>
 <a
 href="/login"
 className="text-forest font-medium hover:text-forest text-sm"
 >
 Retour à la connexion
 </a>
 </div>
 ) : success ? (
 <div className="text-center">
 <div className="w-16 h-16 bg-ochre-light rounded-full flex items-center justify-center mx-auto mb-4">
 <FontAwesomeIcon icon={faCheck} className="w-8 h-8 text-forest" />
 </div>
 <h1 className="text-xl font-bold text-ink mb-2">
 Mot de passe modifié
 </h1>
 <p className="text-muted text-sm mb-6">
 Votre mot de passe a été réinitialisé avec succès.
 </p>
 <a
 href="/login"
 className="btn-primary inline-flex items-center justify-center px-6 py-3 text-sm"
 >
 Se connecter
 </a>
 </div>
 ) : (
 <>
 <div className="text-center mb-8">
 <div className="w-12 h-12 bg-forest rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
 <FontAwesomeIcon icon={faWallet} className="w-6 h-6 text-white" />
 </div>
 <h1 className="text-2xl font-bold text-ink">
 Nouveau mot de passe
 </h1>
 <p className="text-muted text-sm mt-1">
 Choisissez un nouveau mot de passe
 </p>
 </div>

 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-ink mb-1.5">
 Nouveau mot de passe
 </label>
 <div className="relative">
 <FontAwesomeIcon icon={faLock} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
 <input
 type={showPassword ? "text" : "password"}
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 placeholder="Minimum 6 caractères"
 className="input-field pl-10 pr-10"
 required
 minLength={6}
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-muted"
 >
 {showPassword ? <FontAwesomeIcon icon={faEyeSlash} className="w-4 h-4" /> : <FontAwesomeIcon icon={faEye} className="w-4 h-4" />}
 </button>
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-ink mb-1.5">
 Confirmer le mot de passe
 </label>
 <div className="relative">
 <FontAwesomeIcon icon={faLock} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
 <input
 type={showPassword ? "text" : "password"}
 value={confirmPassword}
 onChange={(e) => setConfirmPassword(e.target.value)}
 placeholder="Retaper le mot de passe"
 className="input-field pl-10"
 required
 minLength={6}
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
 {loading ? "Modification..." : "Réinitialiser"}
 </button>
 </form>
 </>
 )}
 </div>
 </div>
 </div>
 );
}
