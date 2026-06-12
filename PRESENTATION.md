# Financier — Présentation

## Le problème

Beaucoup de gens — commerçants, indépendants, particuliers — ne savent pas précisément où va leur argent à la fin du mois. Ils utilisent :

- **Le carnet** : perdu, illisible, pas de synthèse
- **Excel** : compliqué, pas adapté au mobile
- **Des applis bancaires** : limitées aux comptes bancaires, pas d'argent liquide ni Mobile Money

Résultat : impossible de savoir combien on a réellement, combien rapporte une activité, ou où réduire les dépenses.

## La solution

**Financier** est un assistant financier qui répond à trois questions simples :

1. **Combien j'ai aujourd'hui ?** — Vue claire de tout mon argent (espèces, Mobile Money, banque)
2. **Où va mon argent ?** — Répartition par catégorie, projection de fin de mois
3. **Mon activité est-elle rentable ?** — Produits, ventes, stock, bénéfices

---

## Fonctionnalités

### Pour tout le monde

| Fonction | Utilité |
|----------|---------|
| **Accueil** | Voir son argent disponible, où il est réparti, et une projection de fin de mois |
| **Transaction** | Enregistrer un revenu ou une dépense en 30 secondes |
| **Historique** | Retrouver toutes ses opérations, filtrer par type |
| **Bilans** | Comprendre ses finances en langage clair : "Vous avez reçu X, dépensé Y, il vous reste Z" |
| **Catégories** | Organiser ses dépenses (alimentation, transport, loyer…) |
| **Comptes** | Gérer plusieurs caisses : espèces, Mobile Money, compte bancaire |

### Pour les commerçants

| Fonction | Utilité |
|----------|---------|
| **Produits** | Ajouter des articles avec prix d'achat et de vente (marge calculée automatiquement) |
| **Ventes** | Enregistrer les ventes, le stock diminue tout seul |
| **Stock** | Voir le stock restant, les produits en rupture |
| **Bilans activité** | Chiffre d'affaires, bénéfices, produits les plus vendus |

### Pour le propriétaire

| Fonction | Utilité |
|----------|---------|
| **Administration** | Voir la liste des utilisateurs, les statistiques de la plateforme |
| **Abonnement** | Les utilisateurs paient 5 000 FCFA/mois pour le mode commercial |

---

## Comment ça marche (pour qui n'y connaît rien)

**Côté utilisateur :**

1. Il crée un compte avec son nom et son email
2. Il ajoute son argent de départ (ce qu'il a dans sa poche, son compte, son Mobile Money)
3. Chaque jour, il enregistre ce qu'il gagne et ce qu'il dépense
4. L'application calcule tout toute seule et lui montre des résumés clairs

**Exemple concret :**

Mamoune vend des habits. Chaque matin elle note :
- "Acheté 50 000 F de marchandise" → dépense
- "Vendu une robe 15 000 F" → revenu

Financier lui dit à la fin du mois :
> "Vous avez reçu 250 000 F, dépensé 180 000 F. Il vous reste 70 000 F. Votre plus grosse dépense : achat de stock (50 000 F). Vous avez économisé 28% de plus que le mois dernier."

Elle peut aussi suivre ses produits, son stock, et ses ventes en un clic.

---

## Les outils utilisés

| Outil | Rôle | Pourquoi lui |
|-------|------|-------------|
| **Next.js** | Framework web | Universel (site + app), rapide, moderne |
| **TypeScript** | Langage | Évite les bugs, code plus clair |
| **Prisma** | Base de données | Parler à la base sans écrire de SQL |
| **SQLite** | Base (local) | Zéro configuration, fonctionne partout |
| **Tailwind CSS** | Design | Pas besoin d'écrire de CSS, tout en classes |
| **JWT** | Authentification | Connexion sécurisée sans base externe |
| **bcrypt** | Mots de passe | Protège les mots de passe (chiffrement) |

### Ce que chaque outil a permis concrètement

**Next.js** → Un seul langage (TypeScript) pour tout faire : le site vitrine, l'application, et les API. Pas besoin de séparer frontend et backend.

**TypeScript** → Les erreurs sont détectées avant même d'exécuter le code. Exemple : si on utilise une fonction avec le mauvais type de donnée, le code ne compile pas. Résultat : quasi zéro bug en production.

**Prisma + SQLite** → La base de données se crée toute seule avec une seule commande. Pas besoin d'installer MySQL ou PostgreSQL. Les modifications de structure (ajouter une colonne, une table) se font par migration automatique.

**Tailwind CSS** → Le design est constant partout : mêmes couleurs, mêmes espacements, mêmes boutons. Les changements de palette (passer du vert au bleu) se font en modifiant un seul fichier.

**JWT (JSON Web Token)** → L'utilisateur se connecte une fois, reçoit un "pass" valable 7 jours, et peut naviguer sans se reconnecter. Sécurisé par cookie httpOnly (inaccessible au navigateur).

**bcrypt** → Les mots de passe ne sont jamais stockés en clair. Même si la base de données fuit, les mots de passe sont illisibles.

---

## Chiffres clés

- **Un utilisateur s'inscrit en 30 secondes**
- **Une transaction s'ajoute en 10 secondes**
- **Le tableau de bord se charge en moins d'une seconde**
- **Les données sont recalculeés en temps réel à chaque opération**
- **L'application fonctionne sans Internet une fois chargée** (les données persistent en session)

---

## Prochaines étapes

1. Mise en ligne sur Vercel avec domaine personnalisé
2. Paiement Stripe pour les abonnements
3. Application mobile (React Native ou PWA)
4. Notifications et alertes (dépense excessive, stock faible)
5. Mode hors-ligne complet
