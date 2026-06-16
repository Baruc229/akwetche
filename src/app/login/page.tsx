"use client";

import { useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWallet, faEnvelope, faLock, faEye, faEyeSlash, faArrowLeft, faChartBar, faBagShopping, faShield, faBolt } from '@fortawesome/free-solid-svg-icons';

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

  const features = [
    { icon: faWallet, title: "Budget personnel", desc: "Suivez chaque franc, dépense par dépense." },
    { icon: faChartBar, title: "Bilans automatiques", desc: "Rapports hebdo, mensuels et annuels générés sans effort." },
    { icon: faBagShopping, title: "Activité commerciale", desc: "Produits, stocks et ventes centralisés." },
    { icon: faShield, title: "Données sécurisées", desc: "Vos informations chiffrées et protégées." },
    { icon: faBolt, title: "Activation instantanée", desc: "Passez au Premium et débloquez tout immédiatement." },
  ];

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Colonne formulaire */}
      <div className="flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">
          <a
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink mb-6 transition-colors"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
            Retour
          </a>

          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-forest rounded-xl flex items-center justify-center shadow-sm">
              <img src="/akwetche-symbole.png" alt="Akwetche" className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold text-forest">Akwetche</span>
          </div>

          <h1 className="text-2xl font-bold text-ink mb-1">
            Content de vous revoir
          </h1>
          <p className="text-muted text-sm mb-8">
            Connectez-vous à votre compte
          </p>

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

      {/* Colonne présentation */}
      <div className="hidden lg:flex flex-col justify-center px-12 py-12 bg-[#1E4D35]">
        <h2 className="text-2xl font-bold text-white mb-2">
          Votre assistant financier
        </h2>
        <p className="text-white/70 text-sm mb-10">
          Tout ce dont vous avez besoin pour gérer vos finances au quotidien.
        </p>
        <div className="space-y-8">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <FontAwesomeIcon icon={f.icon} className="w-5 h-5 text-[#C4862A]" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{f.title}</p>
                <p className="text-white/60 text-xs mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
