"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelope, faCircleExclamation, faArrowLeft, faRotate } from '@fortawesome/free-solid-svg-icons';
import AuthFeaturePanel from "@/components/auth/AuthFeaturePanel";

export default function VerifyEmailPendingPage() {
 const router = useRouter();
 const [resending, setResending] = useState(false);
 const [resent, setResent] = useState(false);
 const [error, setError] = useState("");
 const [checking, setChecking] = useState(false);
 const [checkMessage, setCheckMessage] = useState("");

 useEffect(() => {
 fetch("/api/auth/me")
 .then((res) => res.json())
 .then((data) => {
 if (data.user?.emailVerified) {
 router.push("/dashboard");
 }
 })
 .catch(() => {});
 }, [router]);

 async function handleCheckVerification() {
 setChecking(true);
 setCheckMessage("");
 try {
 const res = await fetch("/api/auth/me");
 const data = await res.json();
 if (data.user?.emailVerified) {
 router.push("/dashboard");
 } else {
 setCheckMessage("Votre email n'est pas encore vérifié. Vérifiez votre boîte de réception (y compris les spams) ou renvoyez l'email.");
 }
 } catch {
 setCheckMessage("Erreur de connexion. Réessayez.");
 } finally {
 setChecking(false);
 }
 }

 async function handleResend() {
 setResending(true);
 setError("");
 setCheckMessage("");
 try {
 const res = await fetch("/api/auth/resend-verification", { method: "POST" });
 const data = await res.json();
 if (!res.ok) {
 setError(data.error || "Erreur");
 return;
 }
 setResent(true);
 } catch {
 setError("Erreur de connexion");
 } finally {
 setResending(false);
 }
 }

  return (
  <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
  <div className="flex items-center justify-center px-6 py-12 bg-white">
  <div className="w-full max-w-md text-center animate-scale-in">
  <a
  href="/"
  className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink mb-8 transition-colors"
  >
  <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
  Retour à l'accueil
  </a>

  <div className="card p-8">
  <div className="w-16 h-16 bg-ochre-light rounded-full flex items-center justify-center mx-auto mb-4">
  <FontAwesomeIcon icon={faEnvelope} className="w-8 h-8 text-ochre" />
  </div>
  <h1 className="text-2xl font-bold text-ink mb-2">
  Vérification requise
  </h1>
  <p className="text-muted text-sm mb-6">
  Vous devez vérifier votre adresse email avant d'accéder à votre tableau de bord.
  </p>

  <div className="bg-ochre-light border border-border rounded-xl p-4 text-sm text-ochre mb-6 text-left">
  <div className="flex items-start gap-2">
  <FontAwesomeIcon icon={faCircleExclamation} className="w-4 h-4 text-ochre shrink-0 mt-0.5" />
  <p>Un email de confirmation vous a été envoyé. Cliquez sur le lien qu'il contient pour activer votre compte.</p>
  </div>
  </div>

  <button
  onClick={handleCheckVerification}
  disabled={checking}
  className="btn-primary w-full py-3 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
  >
  <FontAwesomeIcon icon={faRotate} className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
  {checking ? "Vérification..." : "Actualiser"}
  </button>

  {checkMessage && (
  <div className="bg-ochre-light border border-border rounded-xl p-4 text-sm text-ochre mt-3">
  {checkMessage}
  </div>
  )}

  {!resent ? (
  <button
  onClick={handleResend}
  disabled={resending}
  className="w-full py-3 text-sm font-medium text-forest hover:text-forest transition-colors mt-4"
  >
  {resending ? "Envoi en cours..." : "Renvoyer l'email de vérification"}
  </button>
  ) : (
  <div className="bg-ochre-light border border-border rounded-xl p-4 text-sm text-forest mt-4">
  Email renvoyé ! Vérifiez votre boîte de réception.
  </div>
  )}

  {error && (
  <p className="mt-3 text-sm text-red-600">{error}</p>
  )}

  <p className="text-center text-sm text-muted mt-6">
  <button
  onClick={() => router.push("/login")}
  className="text-forest font-medium hover:text-forest"
  >
  Se connecter avec un autre compte
  </button>
  </p>
  </div>
  </div>
  </div>
  <AuthFeaturePanel />
  </div>
  );
}
