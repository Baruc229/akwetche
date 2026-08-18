import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation — Akwetche",
  description: "Conditions générales d'utilisation de l'application Akwetche.",
};

export default function CGUPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--color-ink)", fontFamily: "var(--font-heading)" }}>
          Conditions Générales d&apos;Utilisation
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--color-muted)" }}>
          Dernière mise à jour : 18 août 2026
        </p>

        <div className="space-y-8" style={{ color: "var(--color-body)", fontFamily: "var(--font-body)" }}>
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>1. Objet</h2>
            <p className="text-sm leading-relaxed">
              Les présentes Conditions Générales d&apos;Utilisation (ci-après « CGU ») régissent l&apos;utilisation de l&apos;application
              Akwetche (ci-après « l&apos;Application »), un service de gestion de finances personnelles accessible via le site
              akwetche.com et l&apos;application web app.akwetche.app.
            </p>
            <p className="text-sm leading-relaxed mt-2">
              En utilisant Akwetche, vous acceptez sans réserve les présentes CGU. Si vous n&apos;acceptez pas ces conditions,
              veuillez ne pas utiliser l&apos;Application.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>2. Description du service</h2>
            <p className="text-sm leading-relaxed">
              Akwetche est un outil de gestion de finances personnelles qui permet aux utilisateurs de :
            </p>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1">
              <li>Enregistrer et suivre leurs revenus et dépenses</li>
              <li>Gérer des tontines (cotisations collectives)</li>
              <li>Suivre leurs soldes et projections financières</li>
              <li>Gérer un portefeuille de produits et stocks (mode activité)</li>
              <li>Recevoir des rapports et résumés financiers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>3. Inscription et compte</h2>
            <p className="text-sm leading-relaxed">
              L&apos;utilisation d&apos;Akwetche nécessite la création d&apos;un compte. Vous vous engagez à fournir des informations
              exactes et à maintenir la confidentialité de vos identifiants. Vous êtes responsable de toutes les activités
              effectuées depuis votre compte.
            </p>
            <p className="text-sm leading-relaxed mt-2">
              Vous pouvez supprimer votre compte à tout moment depuis les paramètres. La suppression entraîne l&apos;effacement
              définitif de vos données dans un délai maximum de 30 jours.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>4. Offres et paiements</h2>
            <p className="text-sm leading-relaxed">
              Akwetche propose une offre gratuite et une offre Premium (abonnement payant). Les tarifs sont indiqués
              sur la page d&apos;abonnement et peuvent être modifiés. Le paiement est sécurisé via nos partenaires de
              paiement (Stripe, PayPal, FedaPay).
            </p>
            <p className="text-sm leading-relaxed mt-2">
              L&apos;abonnement Premium est reconduit automatiquement. Vous pouvez annuler à tout moment depuis vos
              paramètres. L&apos;annulation prend effet à la fin de la période en cours.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>5. Utilisation acceptable</h2>
            <p className="text-sm leading-relaxed">Vous vous engagez à ne pas :</p>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1">
              <li>Utiliser l&apos;Application à des fins illégales ou frauduleuses</li>
              <li>Tenter d&apos;accéder aux comptes d&apos;autres utilisateurs</li>
              <li>Interrompre ou surcharger l&apos;infrastructure de l&apos;Application</li>
              <li>Reproduire, distribuer ou exploiter le code source de l&apos;Application</li>
              <li>Utiliser des moyens automatisés (bots, scripts) pour accéder au service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>6. Propriété intellectuelle</h2>
            <p className="text-sm leading-relaxed">
              L&apos;Application et son contenu (code, design,文本es, logos) sont la propriété exclusive d&apos;Akwetche.
              Toute reproduction non autorisée est interdite.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>7. Limitation de responsabilité</h2>
            <p className="text-sm leading-relaxed">
              Akwetche est un outil d&apos;aide à la gestion financière. Les données enregistrées ne constituent pas un
              conseil financier. Akwetche ne peut être tenu responsable des décisions financières prises sur la base
              des informations affichées par l&apos;Application.
            </p>
            <p className="text-sm leading-relaxed mt-2">
              Nous nous efforçons d&apos;assurer la disponibilité continue du service, sans garantie aucune. Akwetche
              ne saurait être tenu responsable des interruptions de service, pertes de données ou dommages indirects.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>8. Modification des CGU</h2>
            <p className="text-sm leading-relaxed">
              Akwetche se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront
              notifiés des changements significatifs. La poursuite de l&apos;utilisation après modification vaut
              acceptation des nouvelles conditions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>9. Droit applicable</h2>
            <p className="text-sm leading-relaxed">
              Les présentes CGU sont régies par le droit de la Communauté Économique des États de l&apos;Afrique de
              l&apos;Ouest (CEDEAO). Tout litige relatif à l&apos;interprétation ou l&apos;exécution des présentes sera
              soumis aux tribunaux compétents.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>10. Contact</h2>
            <p className="text-sm leading-relaxed">
              Pour toute question relative aux présentes CGU, contactez-nous à :{" "}
              <a href="mailto:contact@akwetche.com" className="font-semibold underline" style={{ color: "var(--color-brand)" }}>
                contact@akwetche.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
