"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail,AlertCircle, ArrowLeft } from "lucide-react";

export default function VerifyEmailPendingPage() {
  const router = useRouter();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState("");

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

  async function handleResend() {
    setResending(true);
    setError("");
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
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center animate-scale-in">
        <a
          href="/"
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l'accueil
        </a>

        <div className="card p-8">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 mb-2">
            Vérification requise
          </h1>
          <p className="text-stone-500 text-sm mb-6">
            Vous devez vérifier votre adresse email avant d'accéder à votre tableau de bord.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-6 text-left">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>Un email de confirmation vous a été envoyé. Cliquez sur le lien qu'il contient pour activer votre compte.</p>
            </div>
          </div>

          {!resent ? (
            <button
              onClick={handleResend}
              disabled={resending}
              className="btn-primary w-full py-3 text-sm disabled:opacity-50"
            >
              {resending ? "Envoi en cours..." : "Renvoyer l'email de vérification"}
            </button>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
              Email renvoyé ! Vérifiez votre boîte de réception.
            </div>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}

          <p className="text-center text-sm text-stone-500 mt-6">
            <button
              onClick={() => router.push("/login")}
              className="text-emerald-600 font-medium hover:text-emerald-700"
            >
              Se connecter avec un autre compte
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
