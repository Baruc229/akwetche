"use client";

import { useState, useRef } from "react";
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
  faTag,
  faBox,
  faCartShopping,
  faWarehouse,
  faPeopleGroup,
  faMoneyBillTrendUp,
  faFileInvoice,
  faCrown,
  faDownload,
  faCreditCard,
  faExchangeAlt,
  faCalendarCheck,
  faShieldHalved,
  faStopCircle,
  faSackDollar,
  faCircleDollarToSlot,
  faGlobe,
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
        short: "Tout l'argent que vous avez touché cette période.",
        detail:
          "Inclut les revenus ponctuels (ventes, salaires, cadeaux...) et les revenus récurrents déjà reçus. Les revenus en attente (récurrents pas encore versés) ne sont pas comptés ici.",
      },
      {
        icon: faArrowTrendDown,
        title: "Dépensés (Dépenses)",
        short: "Tout l'argent que vous avez dépensé cette période.",
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
          "Reste estimé = Solde − Dép. récurrentes en attente − (Dép. ponctuelles ÷ jours écoulés × jours restants) + Rev. récurrents en attente",
      },
      {
        icon: faCalendarDay,
        title: "Moyenne journalière de dépenses",
        short: "Combien vous dépensez en moyenne par jour.",
        detail:
          "C'est le total de vos dépenses divisé par le nombre de jours écoulés dans le mois. Cette moyenne sert à calculer la projection de fin de mois.",
        formula: "Moyenne = Dépenses totales ÷ Jours écoulés",
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
  {
    category: "Transactions récurrentes",
    items: [
      {
        icon: faRepeat,
        title: "Dépenses récurrentes",
        short: "Les dépenses qui se répètent chaque mois (loyer, abonnements...).",
        detail:
          "Configurez une template avec le montant, la catégorie et le jour du mois. Chaque mois, la transaction est générée automatiquement. Vous pouvez aussi les générer manuellement depuis la page Récurrentes.",
      },
      {
        icon: faArrowTrendUp,
        title: "Revenus récurrents",
        short: "Les revenus qui arrivent régulièrement (salaire, loyer perçu...).",
        detail:
          "Même principe que les dépenses récurrentes, mais pour les revenus. La transaction est créée automatiquement le jour configuré.",
      },
      {
        icon: faCalendarCheck,
        title: "En attente vs Complété",
        short: "Les récurrents ont deux états.",
        detail:
          "« En attente » = la transaction n'a pas encore été créée ce mois-ci. « Complété » = la transaction a été générée et comptabilisée. Le bouton « Générer » crée toutes les transactions en attente d'un coup.",
      },
    ],
  },
  {
    category: "Catégories",
    items: [
      {
        icon: faTag,
        title: "Catégories de dépenses",
        short: "Classez vos dépenses pour savoir où va votre argent.",
        detail:
          "Chaque dépense est associée à une catégorie (Alimentation, Transport, Santé...). Vous pouvez créer les vôtres ou utiliser les préréglages. Les catégories archivées ne sont plus visibles mais gardent l'historique.",
      },
      {
        icon: faTag,
        title: "Catégories de revenus",
        short: "Classez vos revenus par source.",
        detail:
          "Même principe pour les revenus : Salaire, Ventes, Cadeaux, Investissements... Les catégories ont un type (revenu ou dépense) et une couleur.",
      },
      {
        icon: faSackDollar,
        title: "Limite de catégories",
        short: "Le plan gratuit a une limite, Premium est illimité.",
        detail:
          "En plan gratuit, vous pouvez créer jusqu'à 3 catégories de revenus et 3 catégories de dépenses. Avec Premium, c'est illimité. Les catégories archivées ne comptent pas dans la limite.",
      },
    ],
  },
  {
    category: "Activité commerciale",
    items: [
      {
        icon: faBox,
        title: "Produits",
        short: "Gérez votre catalogue de marchandises.",
        detail:
          "Chaque produit a un prix d'achat, un prix de vente et un stock. La marge est calculée automatiquement : Prix de vente − Prix d'achat. Utile pour savoir combien vous gagnez sur chaque article.",
        formula: "Marge = Prix de vente − Prix d'achat",
      },
      {
        icon: faCartShopping,
        title: "Ventes",
        short: "Enregistrez chaque vente effectuée.",
        detail:
          "Une vente enregistre le produit vendu, la quantité, le prix unitaire et le montant total. Le profit est calculé automatiquement : (Prix de vente − Prix d'achat) × Quantité. Les statistiques de ventes apparaissent dans les Bilans.",
        formula: "Profit = (Prix de vente − Prix d'achat) × Quantité",
      },
      {
        icon: faWarehouse,
        title: "Gestion du stock",
        short: "Suivez vos entrées et sorties de marchandises.",
        detail:
          "Le stock est mis à jour automatiquement lors des ventes (sortie) et des réapprovisionnements (entrée). Vous pouvez aussi faire des ajustements manuels. Un produit à stock 0 est signalé comme « Rupture ».",
      },
      {
        icon: faMoneyBillTrendUp,
        title: "Chiffre d'affaires & Profit",
        short: "Le total de vos ventes et le bénéfice net.",
        detail:
          "Le chiffre d'affaires est la somme de tous les montants de vente. Le profit est la somme de tous les profits (vente − coût d'achat). La marge est le ratio profit ÷ chiffre d'affaires.",
        formula: "Marge = Profit ÷ Chiffre d'affaires × 100",
      },
    ],
  },
  {
    category: "Tontines",
    items: [
      {
        icon: faPeopleGroup,
        title: "Principe de la tontine",
        short: "Un système d'épargne rotative entre membres.",
        detail:
          "Une tontine est un groupe de personnes qui cotisent régulièrement. À chaque tour, un membre reçoit la totalité des cotisations. C'est un système d'épargne collective très répandu en Afrique de l'Ouest.",
      },
      {
        icon: faCircleDollarToSlot,
        title: "Cotisations",
        short: "La somme que chaque membre verse à chaque tour.",
        detail:
          "Le montant de la cotisation est fixé à la création de la tontine. Chaque membre verse cette somme au.organisateur. Le total des cotisations est redistribué à un membre à chaque tour.",
        formula: "Total par tour = Cotisation × Nombre de membres",
      },
      {
        icon: faExchangeAlt,
        title: "Tours & Distributions",
        short: "Chaque tour = une distribution à un membre.",
        detail:
          "La tontine se déroule en tours. À chaque tour, tous les membres cotisent, puis un membre reçoit la somme totale. L'ordre peut être fixe ou aléatoire. Une fois tous les tours effectués, la tontine est terminée.",
      },
    ],
  },
  {
    category: "Budgets",
    items: [
      {
        icon: faSackDollar,
        title: "Budgets par catégorie",
        short: "Fixez une limite de dépenses par catégorie et par mois.",
        detail:
          "Définissez un montant maximum pour chaque catégorie. Suivez votre consommation en temps réel par rapport à votre budget. Fonctionnalité en cours de développement — bientôt disponible.",
      },
    ],
  },
  {
    category: "Bilans & Rapports",
    items: [
      {
        icon: faFileInvoice,
        title: "Périodes de rapport",
        short: "Weekly, mensuel ou annuel.",
        detail:
          "Les bilans sont disponibles pour 3 périodes : cette semaine (lundi → dimanche), ce mois-ci (1er → dernier jour) ou cette année (janvier → décembre). Chaque période compare avec la précédente (semaine dernière, mois dernier, année dernière).",
      },
      {
        icon: faFileInvoice,
        title: "Comparaison de période",
        short: "Voyez votre évolution d'une période à l'autre.",
        detail:
          "Pour chaque indicateur (revenus, dépenses, épargne), le bilan affiche la valeur actuelle et la valeur de la période précédente. Les pourcentages d'évolution indiquent si vous progressez ou non.",
      },
      {
        icon: faFileInvoice,
        title: "Statistiques commerciales",
        short: "Chiffre d'affaires, profit, stock — dans les Bilans.",
        detail:
          "Si vous avez des produits et des ventes, les Bilans affichent aussi : chiffre d'affaires annuel, profit total, valeur du stock, produits les plus rentables et les plus vendus. Les données commerciales sont calculées sur l'année en cours.",
      },
    ],
  },
  {
    category: "Abonnement & Limits",
    items: [
      {
        icon: faCrown,
        title: "Plan Gratuit vs Premium",
        short: "Les différences entre les deux plans.",
        detail:
          "Gratuit : 20 revenus et 20 dépenses par mois, 3 catégories par type, pas de mode commercial. Premium : tout illimité + mode activité commerciale + rapports PDF + tontines.",
      },
      {
        icon: faCreditCard,
        title: "Paiement & Renouvellement",
        short: "Comment fonctionne l'abonnement Premium.",
        detail:
          "Premium coûte 5 000 FCFA / 7,99 EUR par mois. Vous pouvez payer par Stripe (carte bancaire), PayPal ou FedaPay (Mobile Money). L'abonnement est actif 30 jours. Un email de rappel est envoyé avant expiration.",
      },
      {
        icon: faStopCircle,
        title: "Expiration",
        short: "Quand votre abonnement arrive à fin.",
        detail:
          "Quand Premium expire, vous revenez au plan gratuit. Vos données sont intactes mais les catégories au-delà de la limite sont archivées. Vous pouvez réactiver à tout moment.",
      },
    ],
  },
  {
    category: "Devise & Affichage",
    items: [
      {
        icon: faExchangeAlt,
        title: "Double devise EUR / FCFA",
        short: "Basculez l'affichage entre Euro et Franc CFA.",
        detail:
          "Tous les montants sont stockés en FCFA. Le taux de change fixe est 1 EUR = 655,957 FCFA. Vous pouvez basculer l'affichage à tout moment avec le bouton « Voir en EUR / Voir en FCFA » sur le dashboard.",
        formula: "1 EUR = 655,957 FCFA (taux fixe)",
      },
      {
        icon: faGlobe,
        title: "Devise par pays",
        short: "La devise par défaut dépend de votre pays.",
        detail:
          "Bénin, Togo, Burkina Faso, Côte d'Ivoire → FCFA (XOF). France, Belgique → Euro (EUR). Vous pouvez changer la devise d'affichage dans les paramètres.",
      },
    ],
  },
  {
    category: "Sécurité",
    items: [
      {
        icon: faShieldHalved,
        title: "Authentification",
        short: "Comment votre compte est protégé.",
        detail:
          "Votre mot de passe est haché (bcrypt, 12 rounds). La session est un token JWT stocké en cookie httpOnly (30 jours, glissant). Après 5 tentatives échouées, le compte est verrouillé 15 minutes.",
      },
      {
        icon: faShieldHalved,
        title: "Vérification d'email",
        short: "Pourquoi on vous demande de vérifier votre email.",
        detail:
          "Un email de vérification est envoyé à l'inscription. Vous devez cliquer sur le lien pour activer votre compte. Sans vérification, certaines fonctionnalités sont limitées.",
      },
    ],
  },
];

export default function HelpPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  function handleDownloadPDF() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let content = "";
    for (const section of HELP_SECTIONS) {
      content += `<h2 style="color:#0D1B35;font-size:16px;margin:28px 0 12px;padding-bottom:8px;border-bottom:2px solid #C9A84C;font-family:var(--font-display)">${section.category}</h2>`;
      for (const item of section.items) {
        content += `
        <div style="margin-bottom:16px;padding:14px 16px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0">
          <h3 style="color:#0D1B35;font-size:14px;margin:0 0 6px;font-weight:600">${item.title}</h3>
          <p style="color:#64748b;font-size:12px;margin:0 0 8px;font-style:italic">${item.short}</p>
          <p style="color:#1e293b;font-size:13px;line-height:1.6;margin:0">${item.detail}</p>
          ${item.formula ? `<div style="margin-top:10px;padding:8px 12px;background:#e0f2fe;border-radius:6px;font-family:monospace;font-size:12px;color:#0369a1;border:1px solid #bae6fd">${item.formula}</div>` : ""}
        </div>`;
      }
    }

    printWindow.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Guide Akwetche — Comprendre les calculs</title>
  <style>
    @page { margin: 18mm 15mm; size: A4; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; background: #fff; margin: 0; padding: 24px; }
    h1 { color: #0D1B35; font-size: 26px; margin: 0 0 4px; text-align: center; }
    .subtitle { color: #64748b; font-size: 13px; text-align: center; margin-bottom: 24px; }
    .date { color: #94a3b8; font-size: 11px; text-align: center; margin-bottom: 32px; }
    .footer { text-align: center; color: #94a3b8; font-size: 10px; margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <h1>Akwetche</h1>
  <p class="subtitle">Guide complet — Comprendre les calculs et fonctionnalités</p>
  <p class="date">Généré le ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
  ${content}
  <div class="footer">
    <p>Akwetche — Gestion financière personnelle</p>
    <p>${new Date().getFullYear()} Akwetche. Tous droits réservés.</p>
  </div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 400); };</script>
</body>
</html>`);
    printWindow.document.close();
  }

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
              Guide de l&apos;application
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDownloadPDF}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:bg-[var(--color-brand-subtle)]"
              style={{ color: "var(--color-brand)" }}
              title="Télécharger le guide en PDF"
            >
              <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:bg-[var(--color-brand-subtle)]"
              style={{ color: "var(--color-muted)" }}
            >
              <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted)" }}>
            Cliquez sur un élément pour comprendre comment il est calculé. Vous pouvez aussi télécharger ce guide en PDF.
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
              <strong>Astuce :</strong> Cliquez sur{" "}
              <FontAwesomeIcon icon={faDownload} className="w-3 h-3 mx-0.5" /> en haut du panneau pour télécharger ce guide complet en PDF.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
