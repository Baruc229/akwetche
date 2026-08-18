import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions Légales — Akwetche",
  description: "Mentions légales de l'application Akwetche.",
};

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--color-ink)", fontFamily: "var(--font-heading)" }}>
          Mentions Légales
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--color-muted)" }}>
          Dernière mise à jour : 18 août 2026
        </p>

        <div className="space-y-8" style={{ color: "var(--color-body)", fontFamily: "var(--font-body)" }}>
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>1. Éditeur du site</h2>
            <p className="text-sm leading-relaxed">
              L&apos;application Akwetche est éditée par :<br />
              <strong>Akwetche</strong><br />
              Email :{" "}
              <a href="mailto:contact@akwetche.com" className="font-semibold underline" style={{ color: "var(--color-brand)" }}>
                contact@akwetche.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>2. Hébergeur</h2>
            <p className="text-sm leading-relaxed">
              L&apos;application est hébergée par :<br />
              <strong>Vercel Inc.</strong><br />
              340 S Lemon Ave #4133<br />
              Walnut, CA 91789<br />
              États-Unis
            </p>
            <p className="text-sm leading-relaxed mt-2">
              La base de données est hébergée par :<br />
              <strong>Neon Inc.</strong><br />
              (Vercel Postgres / Neon)
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>3. Propriété intellectuelle</h2>
            <p className="text-sm leading-relaxed">
              L&apos;ensemble du contenu de l&apos;application (code, design,文本es, images, logos) est la propriété
              exclusive d&apos;Akwetche ou de ses concédants de licence. Toute reproduction, représentation,
              modification ou adaptation, totale ou partielle, est interdite sans autorisation préalable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>4. Données personnelles</h2>
            <p className="text-sm leading-relaxed">
              Le traitement des données personnelles est décrit dans notre{" "}
              <a href="/privacy" className="font-semibold underline" style={{ color: "var(--color-brand)" }}>
                Politique de Confidentialité
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>5. Cookies</h2>
            <p className="text-sm leading-relaxed">
              L&apos;application utilise uniquement des cookies techniques nécessaires à son fonctionnement
              (authentification). Consultez notre Politique de Confidentialité pour plus de détails.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>6. Limitation de responsabilité</h2>
            <p className="text-sm leading-relaxed">
              Les informations fournies par Akwetche le sont à titre indicatif. Akwetche ne garantit pas
              l&apos;exactitude, la complétude ou l&apos;actualité des informations diffusées. Akwetche ne saurait
              être tenu responsable de tout dommage résultant de l&apos;utilisation de l&apos;application.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>7. Contact</h2>
            <p className="text-sm leading-relaxed">
              Pour toute question légale, contactez-nous à :{" "}
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
