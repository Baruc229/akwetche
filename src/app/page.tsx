"use client";

import { useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWallet, faArrowTrendUp, faBagShopping, faChartBar, faShield, faStar, faArrowRight, faCheck, faCrown, faBars, faXmark } from '@fortawesome/free-solid-svg-icons';

export default function LandingPage() {
 const [menuOpen, setMenuOpen] = useState(false);

 return (
 <div className="min-h-screen bg-sand">
 <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-50">
 <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
  <Link href="/" className="flex items-center gap-2 shrink-0">
  <div className="w-9 h-9 bg-forest rounded-xl flex items-center justify-center shadow-sm">
    <img src="/akwetche-symbole.svg" alt="Akwetche" className="w-5 h-5" />
  </div>
  <span className="text-xl font-bold text-forest">
  Akwetche
  </span>
  </Link>
 <div className="hidden md:flex items-center gap-3">
 <a href="/login" className="btn-secondary text-sm inline-flex items-center justify-center">
 Connexion
 </a>
 <a href="/register" className="btn-primary text-sm inline-flex items-center justify-center">
 S'inscrire
 </a>
 </div>
 <button
 onClick={() => setMenuOpen(!menuOpen)}
 className="md:hidden p-2 text-muted hover:text-ink transition-colors"
 aria-label="Menu"
 >
 {menuOpen ? <FontAwesomeIcon icon={faXmark} className="w-6 h-6" /> : <FontAwesomeIcon icon={faBars} className="w-6 h-6" />}
 </button>
 </div>
 {menuOpen && (
 <div className="md:hidden border-t border-border bg-white px-4 py-4 space-y-3 animate-fade-in">
 <a
 href="/login"
 className="block w-full btn-secondary text-sm text-center py-3"
 onClick={() => setMenuOpen(false)}
 >
 Connexion
 </a>
 <a
 href="/register"
 className="block w-full btn-primary text-sm text-center py-3"
 onClick={() => setMenuOpen(false)}
 >
 S'inscrire
 </a>
 </div>
 )}
 </header>

 <main>
 <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
 <div>
 <span className="inline-flex items-center gap-1 bg-ochre-light text-forest px-4 py-1.5 rounded-full text-sm font-medium mb-6">
 <FontAwesomeIcon icon={faStar} className="w-4 h-4" />
 Votre assistant financier personnel
 </span>
 <h1 className="text-4xl md:text-6xl font-bold text-ink leading-tight mb-6">
 Reprenez le contrôle de{" "}
 <span className="text-transparent bg-clip-text bg-forest">
 vos finances
 </span>
 </h1>
 <p className="text-lg text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
 Suivez vos revenus et dépenses, gérez votre activité commerciale,
 et construisez votre épargne en toute simplicité.
 </p>
 <a
 href="/register"
 className="inline-flex items-center gap-2 bg-forest text-white px-8 py-4 rounded-2xl text-lg font-semibold shadow-lg shadow-lg hover:shadow-xl hover:shadow-lg transition-all hover:-translate-y-0.5"
 >
 Commencer gratuitement
 <FontAwesomeIcon icon={faArrowRight} className="w-5 h-5" />
 </a>
 </div>
 </section>

 <section className="max-w-6xl mx-auto px-4 py-16">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 {[
  { icon: faWallet, label: "Solde actuel", value: "150 000 FCFA", bg: "bg-ochre-light", text: "text-forest" },
  { icon: faArrowTrendUp, label: "Revenus du mois", value: "45 000 FCFA", bg: "bg-ochre-light", text: "text-forest-light" },
  { icon: faBagShopping, label: "Dépenses du mois", value: "20 050 FCFA", bg: "bg-ochre-light", text: "text-ochre" },
  { icon: faChartBar, label: "Épargne du mois", value: "24 950 FCFA", bg: "bg-ochre-light", text: "text-forest" },
 ].map((stat) => (
 <div key={stat.label} className="card p-5">
 <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
  <FontAwesomeIcon icon={stat.icon} className={`w-5 h-5 ${stat.text}`} />
 </div>
 <p className="text-sm text-muted mb-1">{stat.label}</p>
 <p className="text-xl font-bold text-ink">{stat.value}</p>
 </div>
 ))}
 </div>
 </section>

 <section className="max-w-6xl mx-auto px-4 py-20">
 <h2 className="text-3xl font-bold text-center text-ink mb-14">
 Une solution pour chaque besoin
 </h2>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {[
 {
  icon: faWallet,
  title: "Budget personnel",
 desc: "Suivez vos dépenses et revenus en toute simplicité. Catégories personnalisées, historique complet.",
 features: ["Enregistrement rapide", "Catégories personnalisées", "Historique complet"],
 },
 {
  icon: faBagShopping,
  title: "Activité commerciale",
 desc: "Gérez vos produits, stocks et ventes. Calculez vos marges et suivez votre chiffre d'affaires.",
 features: ["Gestion des produits", "Suivi des stocks", "Calcul des marges"],
 },
 {
  icon: faChartBar,
  title: "Bilans automatiques",
 desc: "Des rapports clairs générés automatiquement. Visualisez votre santé financière en un coup d'œil.",
 features: ["Bilan hebdomadaire", "Bilan mensuel", "Bilan annuel"],
 },
 ].map((feat) => (
 <div key={feat.title} className="card p-8">
 <div className="w-14 h-14 bg-ochre-light rounded-2xl flex items-center justify-center mb-5">
  <FontAwesomeIcon icon={feat.icon} className="w-7 h-7 text-forest" />
 </div>
 <h3 className="text-xl font-semibold text-ink mb-3">
 {feat.title}
 </h3>
 <p className="text-muted text-sm leading-relaxed mb-5">
 {feat.desc}
 </p>
 <ul className="space-y-2">
 {feat.features.map((f) => (
 <li key={f} className="flex items-center gap-2 text-sm text-muted">
 <FontAwesomeIcon icon={faCheck} className="w-4 h-4 text-forest flex-shrink-0" />
 {f}
 </li>
 ))}
 </ul>
 </div>
 ))}
 </div>
 </section>

 <section className="max-w-6xl mx-auto px-4 pb-20">
 <h2 className="text-3xl font-bold text-center text-ink mb-4">
 Nos formules
 </h2>
 <p className="text-muted text-center mb-12 max-w-lg mx-auto">
 Commencez gratuitement, passez à Premium quand vous êtes prêt.
 </p>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
 <div className="card p-8 border-2 border-border relative">
 <h3 className="text-lg font-semibold text-ink mb-1">Gratuit</h3>
 <p className="text-sm text-muted mb-4">Pour démander en douceur</p>
 <p className="text-3xl font-bold text-ink mb-6">0 FCFA</p>
 <ul className="space-y-3 mb-8">
 {[
 "5 transactions par type / mois",
 "3 catégories maximum",
 "Budget personnel uniquement",
 "Bilans mensuels",
 ].map((f) => (
 <li key={f} className="flex items-start gap-2 text-sm text-muted">
 <FontAwesomeIcon icon={faCheck} className="w-4 h-4 text-forest shrink-0 mt-0.5" />
 {f}
 </li>
 ))}
 </ul>
 <a href="/register" className="btn-secondary w-full text-center text-sm py-3 block">
 Commencer
 </a>
 </div>

 <div className="card p-8 border-2 border-forest relative shadow-lg shadow-lg">
 <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-forest text-white text-xs font-semibold px-4 py-1 rounded-full">
 POPULAIRE
 </span>
 <div className="flex items-center gap-2 mb-1">
 <FontAwesomeIcon icon={faCrown} className="w-5 h-5 text-ochre" />
 <h3 className="text-lg font-semibold text-ink">Premium</h3>
 </div>
 <p className="text-sm text-muted mb-4">Tout débloquer, sans limite</p>
 <p className="text-3xl font-bold text-ink mb-1">5 000 FCFA</p>
 <p className="text-sm text-muted mb-6">par mois</p>
 <ul className="space-y-3 mb-8">
 {[
 "Transactions et catégories illimitées",
 "Budget personnel + activité commerciale",
 "Gestion des produits, ventes et stocks",
 "Bilans hebdo / mensuel / annuel",
 "Statistiques avancées",
 "Support prioritaire",
 ].map((f) => (
 <li key={f} className="flex items-start gap-2 text-sm text-muted">
 <FontAwesomeIcon icon={faCheck} className="w-4 h-4 text-forest shrink-0 mt-0.5" />
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
 <FontAwesomeIcon icon={faShield} className="w-12 h-12 text-forest mx-auto mb-4" />
 <h2 className="text-2xl font-bold text-ink mb-4">
 Vos données sont en sécurité
 </h2>
 <p className="text-muted max-w-lg mx-auto text-sm">
 Nous prenons la sécurité de vos données financières très au sérieux.
 Toutes vos informations sont chiffrées et protégées.
 </p>
 </div>
 </section>
 </main>

 <footer className="border-t border-border py-8">
 <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted">
 <p>© 2026 Akwetche. Tous droits réservés.</p>
 </div>
 </footer>
 </div>
 );
}
