import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  ShoppingBag,
  BarChart3,
  Shield,
  Sparkles,
  ArrowRight,
  Check,
  Crown,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-amber-50">
      <header className="border-b border-emerald-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-sm">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-emerald-800">
              Akwetche
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <a href="/login" className="btn-secondary text-sm inline-flex items-center justify-center">
              Connexion
            </a>
            <a href="/register" className="btn-primary text-sm inline-flex items-center justify-center">
              S'inscrire
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
          <div>
            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Votre assistant financier personnel
            </span>
            <h1 className="text-4xl md:text-6xl font-bold text-stone-900 leading-tight mb-6">
              Reprenez le contrôle de{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                vos finances
              </span>
            </h1>
            <p className="text-lg text-stone-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              Suivez vos revenus et dépenses, gérez votre activité commerciale,
              et construisez votre épargne en toute simplicité.
            </p>
            <a
              href="/register"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-2xl text-lg font-semibold shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300 transition-all hover:-translate-y-0.5"
            >
              Commencer gratuitement
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Wallet, label: "Solde actuel", value: "150 000 FCFA", bg: "bg-emerald-100", text: "text-emerald-600" },
              { icon: TrendingUp, label: "Revenus du mois", value: "45 000 FCFA", bg: "bg-teal-100", text: "text-teal-600" },
              { icon: ShoppingBag, label: "Dépenses du mois", value: "20 050 FCFA", bg: "bg-amber-100", text: "text-amber-600" },
              { icon: BarChart3, label: "Épargne du mois", value: "24 950 FCFA", bg: "bg-emerald-100", text: "text-emerald-600" },
            ].map((stat) => (
              <div key={stat.label} className="card p-5">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                  <stat.icon className={`w-5 h-5 ${stat.text}`} />
                </div>
                <p className="text-sm text-stone-500 mb-1">{stat.label}</p>
                <p className="text-xl font-bold text-stone-900">{stat.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 py-20">
          <h2 className="text-3xl font-bold text-center text-stone-900 mb-14">
            Une solution pour chaque besoin
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Wallet,
                title: "Budget personnel",
                desc: "Suivez vos dépenses et revenus en toute simplicité. Catégories personnalisées, historique complet.",
                features: ["Enregistrement rapide", "Catégories personnalisées", "Historique complet"],
              },
              {
                icon: ShoppingBag,
                title: "Activité commerciale",
                desc: "Gérez vos produits, stocks et ventes. Calculez vos marges et suivez votre chiffre d'affaires.",
                features: ["Gestion des produits", "Suivi des stocks", "Calcul des marges"],
              },
              {
                icon: BarChart3,
                title: "Bilans automatiques",
                desc: "Des rapports clairs générés automatiquement. Visualisez votre santé financière en un coup d'œil.",
                features: ["Bilan hebdomadaire", "Bilan mensuel", "Bilan annuel"],
              },
            ].map((feat) => (
              <div key={feat.title} className="card p-8">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center mb-5">
                  <feat.icon className="w-7 h-7 text-emerald-600" />
                </div>
                <h3 className="text-xl font-semibold text-stone-900 mb-3">
                  {feat.title}
                </h3>
                <p className="text-stone-600 text-sm leading-relaxed mb-5">
                  {feat.desc}
                </p>
                <ul className="space-y-2">
                  {feat.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-stone-600">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-20">
          <h2 className="text-3xl font-bold text-center text-stone-900 mb-4">
            Nos formules
          </h2>
          <p className="text-stone-500 text-center mb-12 max-w-lg mx-auto">
            Commencez gratuitement, passez à Premium quand vous êtes prêt.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="card p-8 border-2 border-stone-200 relative">
              <h3 className="text-lg font-semibold text-stone-900 mb-1">Gratuit</h3>
              <p className="text-sm text-stone-500 mb-4">Pour démander en douceur</p>
              <p className="text-3xl font-bold text-stone-900 mb-6">0 FCFA</p>
              <ul className="space-y-3 mb-8">
                {[
                  "5 transactions par type / mois",
                  "3 catégories maximum",
                  "Budget personnel uniquement",
                  "Bilans mensuels",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-stone-600">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <a href="/register" className="btn-secondary w-full text-center text-sm py-3 block">
                Commencer
              </a>
            </div>

            <div className="card p-8 border-2 border-emerald-400 relative shadow-lg shadow-emerald-100">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold px-4 py-1 rounded-full">
                POPULAIRE
              </span>
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-stone-900">Premium</h3>
              </div>
              <p className="text-sm text-stone-500 mb-4">Tout débloquer, sans limite</p>
              <p className="text-3xl font-bold text-stone-900 mb-1">5 000 FCFA</p>
              <p className="text-sm text-stone-500 mb-6">par mois</p>
              <ul className="space-y-3 mb-8">
                {[
                  "Transactions et catégories illimitées",
                  "Budget personnel + activité commerciale",
                  "Gestion des produits, ventes et stocks",
                  "Bilans hebdo / mensuel / annuel",
                  "Statistiques avancées",
                  "Support prioritaire",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-stone-600">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <a href="/register?plan=premium" className="btn-primary w-full text-center text-sm py-3 block">
                Choisir Premium
              </a>
            </div>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-4 pb-20 text-center">
          <div className="card p-10">
            <Shield className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-stone-900 mb-4">
              Vos données sont en sécurité
            </h2>
            <p className="text-stone-600 max-w-lg mx-auto text-sm">
              Nous prenons la sécurité de vos données financières très au sérieux.
              Toutes vos informations sont chiffrées et protégées.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-stone-500">
          <p>© 2026 Akwetche. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
