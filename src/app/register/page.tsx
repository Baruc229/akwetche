"use client";

import { useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWallet, faEnvelope, faLock, faUser, faEye, faEyeSlash, faArrowLeft, faCheck, faCrown, faStar, faBagShopping, faChartBar, faGlobe, faPhone } from '@fortawesome/free-solid-svg-icons';
import CustomSelect from "@/components/ui/CustomSelect";
import AuthFeaturePanel from "@/components/auth/AuthFeaturePanel";
import { COUNTRY_OPTIONS, getCurrencyForCountry, getPhonePrefix } from "@/lib/currency";

const PLANS = [
 {
 id: "free",
 name: "Gratuit",
 price: "0 FCFA",
 period: "",
  icon: faStar,
 features: [
 "5 revenus et 5 dépenses par mois",
 "3 catégories par type (6 max)",
 "Mode personnel uniquement",
 ],
 },
 {
 id: "premium",
 name: "Premium",
 price: "5 000 FCFA",
 period: "/mois",
  icon: faCrown,
 popular: true,
 features: [
 "Transactions illimitées",
 "Catégories illimitées",
 "Statistiques avancées",
 "Mode activité commerciale inclus",
 "Gestion des produits, ventes et stocks",
 "Bilans hebdo / mensuel / annuel",
 ],
 },
];

export default function RegisterPage() {
 const [step, setStep] = useState<"plan" | "form" | "done">("plan");
 const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [initialBalance, setInitialBalance] = useState("");
  const [countryCode, setCountryCode] = useState("BJ");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const detectedCurrency = getCurrencyForCountry(countryCode);
  const phonePrefix = getPhonePrefix(countryCode);

 async function handleSubmit(e: React.FormEvent) {
 e.preventDefault();
 setError("");
 setLoading(true);

 try {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      email,
      password,
      plan: selectedPlan,
      initialBalance: initialBalance ? parseFloat(initialBalance) : 0,
      countryCode,
      phone: phone || undefined,
    }),
  });

 const data = await res.json();
 if (!res.ok) {
 setError(data.error || "Erreur d'inscription");
 } else {
 window.location.href = "/verify-email-pending";
 }
 } catch {
 setError("Erreur de connexion au serveur");
 } finally {
 setLoading(false);
 }
 }

  if (step === "done") {
  return (
  <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
  <div className="flex items-center justify-center px-6 py-12 bg-white">
  <div className="w-full max-w-md text-center animate-scale-in">
  <div className="card p-8">
  <div className="w-16 h-16 bg-ochre-light rounded-full flex items-center justify-center mx-auto mb-4">
  <FontAwesomeIcon icon={faEnvelope} className="w-8 h-8 text-forest" />
  </div>
  <h1 className="text-2xl font-bold text-ink mb-2">
  Vérifiez votre email
  </h1>
  <p className="text-muted text-sm mb-6">
  Un email de confirmation a été envoyé à <strong>{email}</strong>.
  Cliquez sur le lien pour activer votre compte.
  </p>
  <div className="bg-ochre-light border border-border rounded-xl p-4 text-sm text-ochre">
  <p className="font-medium mb-1">Vous ne trouvez pas l'email ?</p>
  <p>Vérifiez vos spams ou réessayez dans quelques minutes.</p>
  </div>
  <a
  href="/login"
  className="inline-block mt-6 text-sm text-forest hover:text-forest font-medium"
  >
  Aller à la connexion
  </a>
  </div>
  </div>
  </div>
  <AuthFeaturePanel />
  </div>
  );
  }

  return (
  <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
  <div className="flex items-center justify-center px-6 py-12 bg-white">
  <div className="w-full max-w-lg animate-scale-in">
  <a
  href="/"
  className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink mb-8 transition-colors"
  >
  <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
  Retour
  </a>

  {step === "plan" && (
  <div className="card p-8">
  <div className="text-center mb-8">
  <div className="w-12 h-12 bg-forest rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
  <FontAwesomeIcon icon={faWallet} className="w-6 h-6 text-white" />
  </div>
  <h1 className="text-2xl font-bold text-ink">
  Choisissez votre plan
  </h1>
  <p className="text-muted text-sm mt-1">
  Sélectionnez l'offre qui correspond à vos besoins
  </p>
  </div>

  <div className="space-y-3 mb-8">
  {PLANS.map((plan) => {
  const selected = selectedPlan === plan.id;
  return (
  <button
  key={plan.id}
  onClick={() => setSelectedPlan(plan.id)}
  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
  selected
  ? "border-forest bg-ochre-light shadow-sm"
  : "border-border bg-white hover:border-border"
  }`}
  >
  <div className="flex items-start justify-between">
  <div className="flex items-center gap-3">
  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
  plan.id === "free" ? "bg-ochre-light" : "bg-ochre-light"
  }`}>
   <FontAwesomeIcon icon={plan.icon} className={`w-5 h-5 ${
   plan.id === "free" ? "text-forest" : "text-ochre"
   }`} />
  </div>
  <div>
  <p className="font-semibold text-ink">{plan.name}</p>
  <p className="text-sm text-muted">
  <span className="font-medium text-ink">{plan.price}</span>{plan.period}
  </p>
  </div>
  </div>
  {selected && (
  <div className="w-6 h-6 bg-forest rounded-full flex items-center justify-center">
  <FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5 text-white" />
  </div>
  )}
  </div>
  <div className="mt-3 space-y-1">
  {plan.features.map((f) => (
  <p key={f} className="text-xs text-muted flex items-center gap-1.5">
  <FontAwesomeIcon icon={faCheck} className="w-3 h-3 text-forest shrink-0" />
  {f}
  </p>
  ))}
  </div>
  </button>
  );
  })}
  </div>

  <button
  onClick={() => setStep("form")}
  disabled={!selectedPlan}
  className="btn-primary w-full py-3 text-base disabled:opacity-50"
  >
  Continuer
  </button>

  <p className="text-center text-sm text-muted mt-4">
  Déjà un compte ?{" "}
  <a href="/login" className="text-forest font-medium hover:text-forest">
  Se connecter
  </a>
  </p>
  </div>
  )}

  {step === "form" && (
  <div className="card p-8">
  <div className="text-center mb-8">
  <div className="w-12 h-12 bg-forest rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
  <FontAwesomeIcon icon={faWallet} className="w-6 h-6 text-white" />
  </div>
  <h1 className="text-2xl font-bold text-ink">
  Créer votre compte
  </h1>
  <p className="text-muted text-sm mt-1">
  Plan {PLANS.find(p => p.id === selectedPlan)?.name}
  </p>
  <button
  onClick={() => setStep("plan")}
  className="mt-2 text-xs text-muted hover:text-muted underline"
  >
  Changer de plan
  </button>
  </div>

  <form onSubmit={handleSubmit} className="space-y-4">
  <div>
  <label className="block text-sm font-medium text-ink mb-1.5">
  Nom complet
  </label>
  <div className="relative">
  <FontAwesomeIcon icon={faUser} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
  <input
  type="text"
  value={name}
  onChange={(e) => setName(e.target.value)}
  placeholder="Votre nom"
  className="input-field pl-10"
  required
  />
  </div>
  </div>

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
  {showPassword ? (
  <FontAwesomeIcon icon={faEyeSlash} className="w-4 h-4" />
  ) : (
  <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
  )}
  </button>
  </div>
  </div>

  <div>
  <label className="block text-sm font-medium text-ink mb-1.5">
  Solde initial (optionnel)
  </label>
  <input
  type="number"
  value={initialBalance}
  onChange={(e) => setInitialBalance(e.target.value)}
  placeholder="Ex: 150000"
  className="input-field"
  min="0"
  />
  <p className="text-xs text-muted mt-1">
  Montant en {detectedCurrency === "XOF" ? "FCFA" : "EUR"} (ex: 150000)
  </p>
  </div>

  <div>
  <label className="block text-sm font-medium text-ink mb-1.5">
  Pays de résidence
  </label>
  <CustomSelect
    options={COUNTRY_OPTIONS}
    value={countryCode}
    onChange={(v) => setCountryCode(v)}
    placeholder="Sélectionnez votre pays"
  />
  <p className="text-xs text-muted mt-1">
  Devise : <strong>{detectedCurrency === "XOF" ? "FCFA (Franc CFA)" : "EUR (Euro)"}</strong>
  </p>
  </div>

  <div>
  <label className="block text-sm font-medium text-ink mb-1.5">
  Téléphone (optionnel)
  </label>
  <div className="relative">
  <FontAwesomeIcon icon={faPhone} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
  <input
    type="tel"
    value={phone}
    onChange={(e) => {
      const val = e.target.value;
      if (val === "" || val.startsWith("+")) setPhone(val);
    }}
    placeholder={`${phonePrefix}XXXXXXXX`}
    className="input-field pl-10"
  />
  </div>
  <p className="text-xs text-muted mt-1">
  Indicatif : {phonePrefix} — Saisissez le numéro avec l&apos;indicatif
  </p>
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
  {loading ? "Création..." : "Créer mon compte"}
  </button>

  <p className="text-center text-sm text-muted mt-4">
  Déjà un compte ?{" "}
  <a href="/login" className="text-forest font-medium hover:text-forest">
  Se connecter
  </a>
  </p>
  </form>
  </div>
  )}
  </div>
  </div>
  <AuthFeaturePanel />
  </div>
  );
}
