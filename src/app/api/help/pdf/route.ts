import { NextResponse } from "next/server";
import { generatePdf } from "@/lib/pdf";

const HELP_SECTIONS = [
  {
    category: "Solde & Totaux",
    items: [
      { title: "Argent disponible", short: "C'est tout l'argent que vous avez actuellement.", detail: "C'est la somme de votre solde initial (ce que vous aviez avant de commencer) plus tous vos revenus, moins toutes vos dépenses. Si le mode activité est activé, on additionne aussi le solde personnel et le solde activité.", formula: "Solde = Solde initial + Revenus totaux − Dépenses totales" },
      { title: "Reçus (Revenus)", short: "Tout l'argent que vous avez touché cette période.", detail: "Inclut les revenus ponctuels (ventes, salaires, cadeaux...) et les revenus récurrents déjà reçus. Les revenus en attente (récurrents pas encore versés) ne sont pas comptés ici." },
      { title: "Dépensés (Dépenses)", short: "Tout l'argent que vous avez dépensé cette période.", detail: "Inclut les dépenses ponctuelles (achats, factures...) et les dépenses récurrentes déjà débitées. Les dépenses en attente (récurrents pas encore prélevés) ne sont pas comptés ici." },
    ],
  },
  {
    category: "Épargne",
    items: [
      { title: "Taux d'épargne", short: "Le pourcentage de vos revenus que vous avez mis de côté.", detail: "C'est le ratio entre ce que vous avez épargné et ce que vous avez reçu. Plus c'est élevé, mieux c'est. Un taux négatif signifie que vous avez dépensé plus que vous n'avez gagné.", formula: "Taux = (Revenus − Dépenses) ÷ Revenus × 100" },
      { title: "Épargne (montant)", short: "La différence entre vos revenus et vos dépenses.", detail: "C'est simplement Revenus − Dépenses. Si le résultat est positif, vous avez épargné. Si c'est négatif, vous avez dépensé plus que ce que vous avez reçu.", formula: "Épargne = Revenus − Dépenses" },
    ],
  },
  {
    category: "Projection & Moyennes",
    items: [
      { title: "Projection de fin de mois", short: "Une estimation de ce qu'il vous restera à la fin du mois.", detail: "On prend votre solde actuel, on soustrait les dépenses récurrentes qui arrivent bientôt, puis on estime les dépenses restantes en se basant sur votre rythme actuel. On ajoute aussi les revenus récurrents qui arrivent.", formula: "Reste estimé = Solde − Dép. récurrentes en attente − (Dép. ponctuelles ÷ jours écoulés × jours restants) + Rev. récurrents en attente" },
      { title: "Moyenne journalière de dépenses", short: "Combien vous dépensez en moyenne par jour.", detail: "C'est le total de vos dépenses divisé par le nombre de jours écoulés dans le mois. Cette moyenne sert à calculer la projection de fin de mois.", formula: "Moyenne = Dépenses totales ÷ Jours écoulés" },
    ],
  },
  {
    category: "Tendance",
    items: [
      { title: "Tendance hebdomadaire (%)", short: "Compare votre évolution cette semaine vs la semaine dernière.", detail: "On compare la variation de votre solde sur les 7 derniers jours avec celle des 7 jours précédents. Si le pourcentage est positif, votre situation s'améliore. Si c'est négatif, elle se dégrade.", formula: "Tendance = (Variation semaine actuelle − Variation semaine précédente) ÷ |Variation semaine précédente| × 100" },
    ],
  },
  {
    category: "Périmètre",
    items: [
      { title: "Périmètre Personnel", short: "Vos finances personnelles (hors activité commerciale).", detail: "Toutes les transactions marquées « personnel » : salaires, courses, loisirs, etc. C'est le périmètre par défaut." },
      { title: "Périmètre Activité", short: "Les finances de votre activité commerciale.", detail: "Disponible uniquement en mode commercial (Premium). Inclut les ventes, les achats de marchandises, les frais liés à votre activité. Il est affiché séparément du personnel." },
      { title: "Répartition des dépenses", short: "Les catégories où votre argent est parti cette semaine.", detail: "Affiche les 5 catégories de dépenses les plus importantes de la semaine. En mode commercial, les dépenses personnelles et activité sont séparées." },
    ],
  },
  {
    category: "Transactions récurrentes",
    items: [
      { title: "Dépenses récurrentes", short: "Les dépenses qui se répètent chaque mois (loyer, abonnements...).", detail: "Configurez une template avec le montant, la catégorie et le jour du mois. Chaque mois, la transaction est générée automatiquement. Vous pouvez aussi les générer manuellement depuis la page Récurrentes." },
      { title: "Revenus récurrents", short: "Les revenus qui arrivent régulièrement (salaire, loyer perçu...).", detail: "Même principe que les dépenses récurrentes, mais pour les revenus. La transaction est créée automatiquement le jour configuré." },
      { title: "En attente vs Complété", short: "Les récurrents ont deux états.", detail: "« En attente » = la transaction n'a pas encore été créée ce mois-ci. « Complété » = la transaction a été générée et comptabilisée. Le bouton « Générer » crée toutes les transactions en attente d'un coup." },
    ],
  },
  {
    category: "Catégories",
    items: [
      { title: "Catégories de dépenses", short: "Classez vos dépenses pour savoir où va votre argent.", detail: "Chaque dépense est associée à une catégorie (Alimentation, Transport, Santé...). Vous pouvez créer les vôtres ou utiliser les préréglages. Les catégories archivées ne sont plus visibles mais gardent l'historique." },
      { title: "Catégories de revenus", short: "Classez vos revenus par source.", detail: "Même principe pour les revenus : Salaire, Ventes, Cadeaux, Investissements... Les catégories ont un type (revenu ou dépense) et une couleur." },
      { title: "Limite de catégories", short: "Le plan gratuit a une limite, Premium est illimité.", detail: "En plan gratuit, vous pouvez créer jusqu'à 3 catégories de revenus et 3 catégories de dépenses. Avec Premium, c'est illimité. Les catégories archivées ne comptent pas dans la limite." },
      { title: "Limite de transactions", short: "5 revenus et 5 dépenses par mois en plan gratuit.", detail: "En plan gratuit, vous pouvez créer jusqu'à 5 transactions de revenus et 5 transactions de dépenses par mois. Avec Premium, c'est illimité. La limite se réinitialise chaque mois." },
    ],
  },
  {
    category: "Activité commerciale",
    items: [
      { title: "Produits", short: "Gérez votre catalogue de marchandises.", detail: "Chaque produit a un prix d'achat, un prix de vente et un stock. La marge est calculée automatiquement : Prix de vente − Prix d'achat. Utile pour savoir combien vous gagnez sur chaque article.", formula: "Marge = Prix de vente − Prix d'achat" },
      { title: "Ventes", short: "Enregistrez chaque vente effectuée.", detail: "Une vente enregistre le produit vendu, la quantité, le prix unitaire et le montant total. Le profit est calculé automatiquement : (Prix de vente − Prix d'achat) × Quantité. Les statistiques de ventes apparaissent dans les Bilans.", formula: "Profit = (Prix de vente − Prix d'achat) × Quantité" },
      { title: "Gestion du stock", short: "Suivez vos entrées et sorties de marchandises.", detail: "Le stock est mis à jour automatiquement lors des ventes (sortie) et des réapprovisionnements (entrée). Vous pouvez aussi faire des ajustements manuels. Un produit à stock 0 est signalé comme « Rupture »." },
      { title: "Chiffre d'affaires & Profit", short: "Le total de vos ventes et le bénéfice net.", detail: "Le chiffre d'affaires est la somme de tous les montants de vente. Le profit est la somme de tous les profits (vente − coût d'achat). La marge est le ratio profit ÷ chiffre d'affaires.", formula: "Marge = Profit ÷ Chiffre d'affaires × 100" },
    ],
  },
  {
    category: "Tontines",
    items: [
      { title: "Principe de la tontine", short: "Un système d'épargne rotative entre membres.", detail: "Une tontine est un groupe de personnes qui cotisent régulièrement. À chaque tour, un membre reçoit la totalité des cotisations. C'est un système d'épargne collective très répandu en Afrique de l'Ouest." },
      { title: "Cotisations", short: "La somme que chaque membre verse à chaque tour.", detail: "Le montant de la cotisation est fixé à la création de la tontine. Chaque membre verse cette somme à l'organisateur. Le total des cotisations est redistribué à un membre à chaque tour.", formula: "Total par tour = Cotisation × Nombre de membres" },
      { title: "Tours & Distributions", short: "Chaque tour = une distribution à un membre.", detail: "La tontine se déroule en tours. À chaque tour, tous les membres cotisent, puis un membre reçoit la somme totale. L'ordre peut être fixe ou aléatoire. Une fois tous les tours effectués, la tontine est terminée." },
    ],
  },
  {
    category: "Budgets",
    items: [
      { title: "Budgets par catégorie", short: "Fixez une limite de dépenses par catégorie et par mois.", detail: "Définissez un montant maximum pour chaque catégorie. Suivez votre consommation en temps réel par rapport à votre budget. Fonctionnalité en cours de développement — bientôt disponible." },
    ],
  },
  {
    category: "Bilans & Rapports",
    items: [
      { title: "Périodes de rapport", short: "Weekly, mensuel ou annuel.", detail: "Les bilans sont disponibles pour 3 périodes : cette semaine (lundi → dimanche), ce mois-ci (1er → dernier jour) ou cette année (janvier → décembre). Chaque période compare avec la précédente (semaine dernière, mois dernier, année dernière)." },
      { title: "Comparaison de période", short: "Voyez votre évolution d'une période à l'autre.", detail: "Pour chaque indicateur (revenus, dépenses, épargne), le bilan affiche la valeur actuelle et la valeur de la période précédente. Les pourcentages d'évolution indiquent si vous progressez ou non." },
      { title: "Statistiques commerciales", short: "Chiffre d'affaires, profit, stock — dans les Bilans.", detail: "Si vous avez des produits et des ventes, les Bilans affichent aussi : chiffre d'affaires annuel, profit total, valeur du stock, produits les plus rentables et les plus vendus. Les données commerciales sont calculées sur l'année en cours." },
    ],
  },
  {
    category: "Devise & Affichage",
    items: [
      { title: "Double devise EUR / FCFA", short: "Basculez l'affichage entre Euro et Franc CFA.", detail: "Tous les montants sont stockés en FCFA. Le taux de change fixe est 1 EUR = 655,957 FCFA. Vous pouvez basculer l'affichage à tout moment avec le bouton « Voir en EUR / Voir en FCFA » sur le dashboard.", formula: "1 EUR = 655,957 FCFA (taux fixe)" },
      { title: "Devise par pays", short: "La devise par défaut dépend de votre pays.", detail: "Bénin, Togo, Burkina Faso, Côte d'Ivoire → FCFA (XOF). France, Belgique → Euro (EUR). Vous pouvez changer la devise d'affichage dans les paramètres." },
    ],
  },
];

function buildHelpHTML(): string {
  let content = "";
  for (const section of HELP_SECTIONS) {
    content += `<h2 style="color:#0D1B35;font-size:16px;margin:28px 0 12px;padding-bottom:8px;border-bottom:2px solid #C9A84C;font-weight:700">${section.category}</h2>`;
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

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Guide Akwetche — Comprendre les calculs</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; background: #fff; margin: 0; padding: 0; }
    h1 { color: #0D1B35; font-size: 26px; margin: 0 0 4px; text-align: center; }
    .subtitle { color: #64748b; font-size: 13px; text-align: center; margin-bottom: 24px; }
    .date { color: #94a3b8; font-size: 11px; text-align: center; margin-bottom: 32px; }
    .footer { text-align: center; color: #94a3b8; font-size: 10px; margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div style="padding:24px">
    <h1>Akwetche</h1>
    <p class="subtitle">Guide complet — Comprendre les calculs et fonctionnalités</p>
    <p class="date">Généré le ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
    ${content}
    <div class="footer">
      <p>Akwetche — Gestion financière personnelle</p>
      <p>${new Date().getFullYear()} Akwetche. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>`;
}

export async function GET() {
  try {
    const html = buildHelpHTML();
    const pdfBuffer = await generatePdf(html);

    return new Response(new Uint8Array(pdfBuffer).buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="guide-akwetche.pdf"',
      },
    });
  } catch {
    return NextResponse.json({ error: "Erreur lors de la génération du PDF" }, { status: 500 });
  }
}
