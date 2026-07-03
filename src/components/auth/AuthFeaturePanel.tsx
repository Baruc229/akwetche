"use client";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faWallet, faChartBar, faBagShopping, faShield, faBolt,
  faCheck
} from '@fortawesome/free-solid-svg-icons';

const features = [
  {
    icon: faWallet,
    title: "Budget personnel",
    desc: "Suivez chaque franc, dépense par dépense.",
    points: ["Catégories personnalisables", "Alertes de dépassement", "Historique complet"],
  },
  {
    icon: faChartBar,
    title: "Bilans automatiques",
    desc: "Rapports générés sans effort.",
    points: ["Hebdomadaires, mensuels, annuels", "Graphiques interactifs", "Export PDF"],
  },
  {
    icon: faBagShopping,
    title: "Activité commerciale",
    desc: "Gérez votre entreprise en un clin d'œil.",
    points: ["Produits & stocks", "Transactions commerciales", "Tableau de bord dédié"],
  },
  {
    icon: faShield,
    title: "Données sécurisées",
    desc: "Vos informations sont protégées.",
    points: ["Chiffrement de bout en bout", "Sauvegarde automatique", "Conforme RGPD"],
  },
  {
    icon: faBolt,
    title: "Activation instantanée",
    desc: "Passez au Premium et débloquez tout.",
    points: ["Transactions illimitées", "Statistiques avancées", "Mode activité inclus"],
  },
];

export default function AuthFeaturePanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between px-12 py-12 bg-[#1E4D35] relative overflow-hidden">
      {/* Décorations de fond */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute top-20 -right-20 w-80 h-80 rounded-full bg-white" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-white" />
        <div className="absolute top-1/2 left-1/3 w-40 h-40 rounded-full bg-white" />
      </div>

      {/* Contenu */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Logo + marque */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center shadow-sm">
              <img src="/akwetche-symbole.png" alt="Akwetche" className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-white font-display">Akwetche</span>
          </div>
          <h2 className="text-3xl font-bold text-white leading-tight mb-3">
            Votre argent,<br />simplifié.
          </h2>
          <p className="text-white/60 text-sm leading-relaxed">
            Une solution complète pour gérer vos finances personnelles et votre activité commerciale en toute sérénité.
          </p>
        </div>

        {/* Liste des fonctionnalités */}
        <div className="space-y-6 flex-1">
          {features.map((f, i) => (
            <div key={i} className="group">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-colors">
                  <FontAwesomeIcon icon={f.icon} className="w-5 h-5 text-[#C4862A]" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{f.title}</p>
                  <p className="text-white/60 text-xs mt-0.5">{f.desc}</p>
                  <div className="mt-2 space-y-1">
                    {f.points.map((pt) => (
                      <div key={pt} className="flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faCheck} className="w-2.5 h-2.5 text-[#C4862A]" />
                        <span className="text-white/50 text-[11px]">{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
