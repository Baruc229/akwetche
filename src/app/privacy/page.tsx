import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de Confidentialité — Akwetche",
  description: "Politique de confidentialité et protection des données personnelles d'Akwetche.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--color-ink)", fontFamily: "var(--font-heading)" }}>
          Politique de Confidentialité
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--color-muted)" }}>
          Dernière mise à jour : 18 août 2026
        </p>

        <div className="space-y-8" style={{ color: "var(--color-body)", fontFamily: "var(--font-body)" }}>
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>1. Responsable du traitement</h2>
            <p className="text-sm leading-relaxed">
              Le responsable du traitement des données personnelles est Akwetche. Pour toute question relative
              à la protection de vos données, contactez-nous à :{" "}
              <a href="mailto:contact@akwetche.com" className="font-semibold underline" style={{ color: "var(--color-brand)" }}>
                contact@akwetche.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>2. Données collectées</h2>
            <p className="text-sm leading-relaxed">Nous collectons les données suivantes :</p>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1">
              <li><strong>Données d&apos;inscription</strong> : nom, adresse email, mot de passe (haché), pays, numéro de téléphone</li>
              <li><strong>Données financières</strong> : revenus, dépenses, soldes, transactions, catégories, budgets, tontines</li>
              <li><strong>Données de connexion</strong> : adresse IP, navigateur, date de connexion</li>
              <li><strong>Données d&apos;abonnement</strong> : statut de l&apos;abonnement, historique de paiement</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>3. Finalité du traitement</h2>
            <p className="text-sm leading-relaxed">Vos données sont traitées pour :</p>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1">
              <li>Fournir et maintenir le service de gestion financière</li>
              <li>Authentifier votre accès et sécuriser votre compte</li>
              <li>Vous envoyer des emails transactionnels (vérification, réinitialisation de mot de passe)</li>
              <li>Améliorer l&apos;Application et l&apos;expérience utilisateur</li>
              <li>Respecter nos obligations légales</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>4. Base légale</h2>
            <p className="text-sm leading-relaxed">
              Le traitement de vos données repose sur : votre consentement (inscription), l&apos;exécution du
              contrat (fourniture du service), et notre intérêt légitime (sécurité, amélioration du service).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>5. Durée de conservation</h2>
            <p className="text-sm leading-relaxed">
              Vos données financières sont conservées tant que votre compte est actif. Après suppression du compte,
              vos données sont effacées dans un délai maximum de 30 jours, à l&apos;exception des données que nous
              sommes tenus de conserver par obligation légale.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>6. Sécurité des données</h2>
            <p className="text-sm leading-relaxed">
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :
            </p>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1">
              <li>Mots de passe hachés avec bcrypt (coût 12)</li>
              <li>Connexions HTTPS chiffrées</li>
              <li>Tokens d&apos;authentification à durée limitée</li>
              <li>Isolation des données entre utilisateurs</li>
              <li>Surveillance des tentatives d&apos;accès</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>7. Partage des données</h2>
            <p className="text-sm leading-relaxed">
              Vos données ne sont jamais vendues ou partagées avec des tiers à des fins commerciales. Elles peuvent
              être partagées uniquement avec :
            </p>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1">
              <li>Nos prestataires techniques (hébergement, envoi d&apos;emails) dans le strict cadre du service</li>
              <li>Les autorités compétentes en cas d&apos;obligation légale</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>8. Vos droits</h2>
            <p className="text-sm leading-relaxed">
              Conformément à la réglementation applicable, vous disposez des droits suivants :
            </p>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1">
              <li><strong>Droit d&apos;accès</strong> : obtenir une copie de vos données</li>
              <li><strong>Droit de rectification</strong> : corriger vos données inexactes</li>
              <li><strong>Droit à l&apos;effacement</strong> : supprimer votre compte et vos données</li>
              <li><strong>Droit à la portabilité</strong> : exporter vos données au format standard</li>
              <li><strong>Droit d&apos;opposition</strong> : vous opposer au traitement de vos données</li>
            </ul>
            <p className="text-sm leading-relaxed mt-2">
              Pour exercer ces droits, contactez-nous à :{" "}
              <a href="mailto:contact@akwetche.com" className="font-semibold underline" style={{ color: "var(--color-brand)" }}>
                contact@akwetche.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>9. Cookies</h2>
            <p className="text-sm leading-relaxed">
              Akwetche utilise uniquement des cookies strictement nécessaires au fonctionnement du service
              (cookie d&apos;authentification httpOnly). Aucun cookie de tracking ou publicitaire n&apos;est utilisé.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>10. Modification de la politique</h2>
            <p className="text-sm leading-relaxed">
              Cette politique peut être modifiée à tout moment. Les utilisateurs seront notifiés des changements
              significatifs par email ou via l&apos;Application.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
