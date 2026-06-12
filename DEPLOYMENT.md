# Plan de déploiement — Financier

## Architecture

```
financier.com ────► Landing page (vitrine)
app.financier.com ──► Application (dashboard, login, register, admin)
```

Un seul projet Next.js déployé sur Vercel, avec deux domaines. Un middleware détecte le sous-domaine et sert le contenu approprié.

---

## Étapes

### 1. Acheter le domaine
- Acheter `financier.com` chez un registrar (Namecheap, GoDaddy, OVH, etc.)

### 2. Changer la base de données
Remplacer SQLite par une base hébergée :

| Solution | Type | Gratuit ? |
|----------|------|-----------|
| **Turso** | SQLite cloud | Jusqu'à 500 Mo gratuits |
| **Supabase** | PostgreSQL | Jusqu'à 500 Mo gratuits |
| **Neon** | PostgreSQL serverless | Jusqu'à 500 Mo gratuits |

Changement nécessaire dans `prisma/schema.prisma` (changer le provider) + adapter les requêtes si migration vers PostgreSQL.

### 3. Configurer les variables d'environnement
Dans le dashboard Vercel, ajouter :

```
JWT_SECRET=<une_chaine_aleatoire_securisee>
DATABASE_URL=<url_de_la_base>
```

### 4. Déployer sur Vercel
- Installer Vercel CLI ou connecter le repo GitHub
- Ajouter les deux domaines dans le projet Vercel :
  - `financier.com` (domaine principal)
  - `app.financier.com` (sous-domaine)
- Configurer les DNS chez le registrar avec les enregistrements fournis par Vercel

### 5. Middleware
Un fichier `src/middleware.ts` lira le hostname pour orienter le trafic :
- `financier.com` → landing page (`/`)
- `app.financier.com` → app (`/dashboard`, `/login`, etc.)

### 6. Paiement (Stripe)
- Créer un compte Stripe
- Ajouter les webhooks Stripe pour gérer les abonnements
- Remplacer le bloc "Abonnement" statique des paramètres par un vrai paywall
- Vérifier le statut de l'abonnement avant chaque accès à l'application

### 7. Finaliser
- Rate limiting sur les API
- Logs des erreurs
- HTTPS automatique (géré par Vercel)

---

## URLs finales

| Page | URL |
|------|-----|
| Landing page | `https://financier.com` |
| Connexion | `https://app.financier.com/login` |
| Inscription | `https://app.financier.com/register` |
| Dashboard | `https://app.financier.com/dashboard` |
| Historique | `https://app.financier.com/dashboard/transactions` |
| Bilans | `https://app.financier.com/dashboard/reports` |
| Produits | `https://app.financier.com/dashboard/products` |
| Ventes | `https://app.financier.com/dashboard/sales` |
| Stock | `https://app.financier.com/dashboard/stock` |
| Paramètres | `https://app.financier.com/dashboard/settings` |
| Administration | `https://app.financier.com/admin` |

---

## Prérequis techniques avant mise en ligne

- [ ] Base de données hébergée (Turso / Supabase)
- [ ] Variables d'environnement configurées
- [ ] Middleware de routage par domaine
- [ ] Compte Stripe + webhooks
- [ ] Paywall actif vérifié à chaque connexion
- [ ] Domaine acheté + DNS configurés
- [ ] Projet déployé sur Vercel
- [ ] Rate limiting sur les routes API
- [ ] Logs et monitoring
