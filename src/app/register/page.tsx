"use client";

import { useState } from "react";
import { Wallet, Mail, Lock, User, Eye, EyeOff, ArrowLeft, Check, Crown, Sparkles, ShoppingBag, BarChart3 } from "lucide-react";

const PLANS = [
  {
    id: "free",
    name: "Gratuit",
    price: "0 FCFA",
    period: "",
    icon: Sparkles,
    features: [
      "5 revenus et 5 dépenses par mois",
      "3 catégories maximum",
      "Mode personnel uniquement",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "5 000 FCFA",
    period: "/mois",
    icon: Crown,
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
  const [currency, setCurrency] = useState("XOF");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
          currency,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur d'inscription");
      } else {
        setStep("done");
      }
    } catch {
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  }

  if (step === "done") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-amber-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center animate-scale-in">
          <div className="card p-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-stone-900 mb-2">
              Vérifiez votre email
            </h1>
            <p className="text-stone-500 text-sm mb-6">
              Un email de confirmation a été envoyé à <strong>{email}</strong>.
              Cliquez sur le lien pour activer votre compte.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <p className="font-medium mb-1">Vous ne trouvez pas l'email ?</p>
              <p>Vérifiez vos spams ou réessayez dans quelques minutes.</p>
            </div>
            <a
              href="/login"
              className="inline-block mt-6 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Aller à la connexion
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-scale-in">
        <a
          href="/"
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </a>

        {step === "plan" && (
          <div className="card p-8">
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-stone-900">
                Choisissez votre plan
              </h1>
              <p className="text-stone-500 text-sm mt-1">
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
                        ? "border-emerald-500 bg-emerald-50 shadow-sm"
                        : "border-stone-200 bg-white hover:border-stone-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          plan.id === "free" ? "bg-emerald-100" : "bg-amber-100"
                        }`}>
                          <plan.icon className={`w-5 h-5 ${
                            plan.id === "free" ? "text-emerald-600" : "text-amber-600"
                          }`} />
                        </div>
                        <div>
                          <p className="font-semibold text-stone-800">{plan.name}</p>
                          <p className="text-sm text-stone-500">
                            <span className="font-medium text-stone-700">{plan.price}</span>{plan.period}
                          </p>
                        </div>
                      </div>
                      {selected && (
                        <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="mt-3 space-y-1">
                      {plan.features.map((f) => (
                        <p key={f} className="text-xs text-stone-500 flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-emerald-500 shrink-0" />
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

            <p className="text-center text-sm text-stone-500 mt-4">
              Déjà un compte ?{" "}
              <a href="/login" className="text-emerald-600 font-medium hover:text-emerald-700">
                Se connecter
              </a>
            </p>
          </div>
        )}

        {step === "form" && (
          <div className="card p-8">
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-stone-900">
                Créer votre compte
              </h1>
              <p className="text-stone-500 text-sm mt-1">
                Plan {PLANS.find(p => p.id === selectedPlan)?.name}
              </p>
              <button
                onClick={() => setStep("plan")}
                className="mt-2 text-xs text-stone-400 hover:text-stone-600 underline"
              >
                Changer de plan
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Nom complet
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
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
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
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
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
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
                <p className="text-xs text-stone-400 mt-1">
                  Combien possédez-vous actuellement ?
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Devise
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="" disabled>Choisissez votre devise</option>
                  <option value="XOF">FCFA (Franc CFA)</option>
                  <option value="EUR">EUR (Euro)</option>
                </select>
                <p className="text-xs text-stone-400 mt-1">
                  Tous les montants seront affichés dans cette devise
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

              <p className="text-center text-sm text-stone-500 mt-4">
                Déjà un compte ?{" "}
                <a href="/login" className="text-emerald-600 font-medium hover:text-emerald-700">
                  Se connecter
                </a>
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
