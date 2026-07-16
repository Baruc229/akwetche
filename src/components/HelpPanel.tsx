"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faXmark,
  faCircleQuestion,
  faPiggyBank,
  faArrowTrendUp,
  faArrowTrendDown,
  faChartLine,
  faWallet,
  faCalendarDay,
  faRepeat,
  faLayerGroup,
  faBullseye,
  faBriefcase,
  faUser,
  faCoins,
} from "@fortawesome/free-solid-svg-icons";

type HelpItem = {
  icon: IconDefinition;
  title: string;
  short: string;
  detail: string;
  formula?: string;
};

const HELP_SECTIONS: { category: string; items: HelpItem[] }[] = [
  {
    category: "Solde & Totaux",
    items: [
      {
        icon: faWallet,
        title: "Argent disponible",
        short: "C'est tout l'argent que vous avez actuellement.",
        detail:
          "C'est la somme de votre solde initial (ce que vous aviez avant de commencer) plus tous vos revenus, moins toutes vos dépenses. Si le mode activité est activé, on additionne aussi le solde personnel et le solde activité.",
        formula: "Solde = Solde initial + Revenus totaux − Dépenses totales",
      },
      {
        icon: faArrowTrendUp,
        title: "Reçus (Revenus)",
        short: "Tout l'argent que vous avez touché ce mois-ci.",
        detail:
          "Inclut les revenus ponctuels (ventes, salaires, cadeaux...) et les revenus récurrents déjà reçus. Les revenus en attente (récurrents pas encore versés) ne sont pas comptés ici.",
      },
      {
        icon: faArrowTrendDown,
        title: "Dépensés (Dépenses)",
        short: "Tout l'argent que vous avez dépensé ce mois-ci.",
        detail:
          "Inclut les dépenses ponctuelles (achats, factures...) et les dépenses récurrentes déjà débitées. Les dépenses en attente (récurrents pas encore prélevés) ne sont pas comptés ici.",
      },
    ],
  },
  {
    category: "Épargne",
    items: [
      {
        icon: faPiggyBank,
        title: "Taux d'épargne",
        short: "Le pourcentage de vos revenus que vous avez mis de côté.",
        detail:
          "C'est le ratio entre ce que vous avez épargné et ce que vous avez reçu. Plus c'est élevé, mieux c'est. Un taux négatif signifie que vous avez dépensé plus que vous n'avez gagné.",
        formula: "Taux = (Revenus − Dépenses) ÷ Revenus × 100",
      },
      {
        icon: faCoins,
        title: "Épargne (montant)",
        short: "La différence entre vos revenus et vos dépenses.",
        detail:
          "C'est simplement Revenus − Dépenses. Si le résultat est positif, vous avez épargné. Si c'est négatif, vous avez dépensé plus que ce que vous avez reçu.",
        formula: "Épargne = Revenus − Dépenses",
      },
    ],
  },
  {
    category: "Projection & Moyennes",
    items: [
      {
        icon: faChartLine,
        title: "Projection de fin de mois",
        short: "Une estimation de ce qu'il vous restera à la fin du mois.",
        detail:
          "On prend votre solde actuel, on soustrait les dépenses récurrentes qui arrivent bientôt, puis on estime les dépenses restantes en se basant sur votre rythme actuel. On ajoute aussi les revenus récurrents qui arrivent.",
        formula:
          "Reste estimé = Solde − Dépenses récurrentes en attente − (Dépenses ponctuelles ÷ jours écoulés × jours restants) + Revenus récurrents en attente",
      },
      {
        icon: faCalendarDay,
        title: "Moyenne journalière de dépenses",
        short: "Combien vous dépensez en moyenne par jour.",
        detail:
          "C'est le total de vos dépenses divisé par le nombre de jours écoulés dans le mois. Cette moyenne sert à calculer la projection de fin de mois.",
        formula: "Moyenne = Dépenses totales ÷ Jours écoulés",
      },
      {
        icon: faRepeat,
        title: "Dépenses récurrentes",
        short: "Les dépenses qui se répètent chaque mois (loyer, abonnements...).",
        detail:
          "Ce sont les dépenses automatiques que vous avez configurées. Elles sont séparées des dépenses ponctuelles pour une meilleure visibilité. Celles « en attente » ne sont pas encore débitées.",
      },
    ],
  },
  {
    category: "Tendance",
    items: [
      {
        icon: faBullseye,
        title: "Tendance hebdomadaire (%)",
        short: "Compare votre évolution cette semaine vs la semaine dernière.",
        detail:
          "On compare la variation de votre solde sur les 7 derniers jours avec celle des 7 jours précédents. Si le pourcentage est positif, votre situation s'améliore. Si c'est négatif, elle se dégrade.",
        formula:
          "Tendance = (Variation semaine actuelle − Variation semaine précédente) ÷ |Variation semaine précédente| × 100",
      },
    ],
  },
  {
    category: "Périmètre",
    items: [
      {
        icon: faUser,
        title: "Périmètre Personnel",
        short: "Vos finances personnelles (hors activité commerciale).",
        detail:
          "Toutes les transactions marquées « personnel » : salaires, courses, loisirs, etc. C'est le périmètre par défaut.",
      },
      {
        icon: faBriefcase,
        title: "Périmètre Activité",
        short: "Les finances de votre activité commerciale.",
        detail:
          "Disponible uniquement en mode commercial (Premium). Inclut les ventes, les achats de marchandises, les frais liés à votre activité. Il est affiché séparément du personnel.",
      },
      {
        icon: faLayerGroup,
        title: "Répartition des dépenses",
        short: "Les catégories où votre argent est parti cette semaine.",
        detail:
          "Affiche les 5 catégories de dépenses les plus importantes de la semaine. En mode commercial, les dépenses personnelles et activité sont séparées.",
      },
    ],
  },
];

export default function HelpPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-[60] transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full w-full sm:w-[420px] z-[61] flex flex-col animate-drawer-right"
        style={{
          background: "var(--color-surface)",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 h-[56px] shrink-0"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--color-brand-subtle)", color: "var(--color-brand)" }}
            >
              <FontAwesomeIcon icon={faCircleQuestion} className="w-4 h-4" />
            </div>
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}
            >
              Comprendre les calculs
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:bg-[var(--color-brand-subtle)]"
            style={{ color: "var(--color-muted)" }}
          >
            <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted)" }}>
            Cliquez sur un élément pour comprendre comment il est calculé.
          </p>

          {HELP_SECTIONS.map((section) => (
            <div key={section.category}>
              <h3
                className="text-[11px] font-bold uppercase tracking-wider mb-2"
                style={{ color: "var(--color-muted)" }}
              >
                {section.category}
              </h3>
              <div className="space-y-1.5">
                {section.items.map((item) => {
                  const isOpen = expanded === item.title;
                  return (
                    <button
                      key={item.title}
                      onClick={() => setExpanded(isOpen ? null : item.title)}
                      className="w-full text-left rounded-xl transition-all"
                      style={{
                        background: isOpen ? "var(--color-brand-subtle)" : "var(--color-surface-raised)",
                        border: `1px solid ${isOpen ? "var(--color-brand)" : "var(--color-border)"}`,
                      }}
                    >
                      <div className="flex items-center gap-3 px-3.5 py-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            background: isOpen ? "var(--color-brand)" : "var(--color-surface)",
                            color: isOpen ? "white" : "var(--color-brand)",
                          }}
                        >
                          <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm font-semibold"
                            style={{ color: "var(--color-ink)" }}
                          >
                            {item.title}
                          </p>
                          <p
                            className="text-xs mt-0.5 leading-relaxed"
                            style={{ color: "var(--color-muted)" }}
                          >
                            {item.short}
                          </p>
                        </div>
                        <span
                          className="text-xs font-bold transition-transform shrink-0"
                          style={{
                            color: "var(--color-muted)",
                            transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                          }}
                        >
                          +
                        </span>
                      </div>

                      {isOpen && (
                        <div
                          className="px-3.5 pb-3.5 pt-0"
                          style={{ borderTop: "1px solid var(--color-border)" }}
                        >
                          <p
                            className="text-xs leading-relaxed mt-3"
                            style={{ color: "var(--color-ink)" }}
                          >
                            {item.detail}
                          </p>
                          {item.formula && (
                            <div
                              className="mt-2.5 px-3 py-2 rounded-lg text-xs font-mono"
                              style={{
                                background: "var(--color-surface)",
                                border: "1px solid var(--color-border)",
                                color: "var(--color-brand)",
                              }}
                            >
                              {item.formula}
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div
            className="rounded-xl px-4 py-3 mt-4"
            style={{
              background: "var(--color-brand-subtle)",
              border: "1px solid var(--color-brand)",
            }}
          >
            <p className="text-xs leading-relaxed" style={{ color: "var(--color-brand)" }}>
              <strong>Astuce :</strong> Utilisez le bouton{" "}
              <span className="font-mono">Voir en EUR / Voir en FCFA</span> sur la carte
              principale pour basculer l&apos;affichage entre les deux devises.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
