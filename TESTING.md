# Documentation des Tests — Akwetche

## 1. C'est quoi ?

On a 79 tests unitaires + 8 tests E2E. Ils verifient que les fonctions critiques de l'application marchent bien.


## 2. Les outils

**Vitest** — Pour tester des fonctions toutes seules, sans serveur. C'est tres rapide (quelques secondes).

**Playwright** — Pour simuler un vrai utilisateur dans un navigateur. Plus lent mais teste le comportement reel.


## 3. Comment lancer

**Tests unitaires :**
- `npm test` — Lance tous les tests une fois
- `npm run test:watch` — Relance automatiquement quand tu sauvegardes un fichier
- `npm run test:coverage` — Genere un rapport de couverture

**Tests E2E :**
- `npm run test:e2e` — Lance les tests dans le navigateur
- `npm run test:e2e:ui` — Ouvre l'interface graphique

**Automatique :**
- Quand tu fais `git commit`, les tests se lancent tout seul. Si un test echoue, le commit est bloque.
- Tu peux lancer `npm run test:watch` en arriere-plan pendant que tu codes.


## 4. Tests unitaires — Ce qu'on teste

### currency.test.ts (34 tests) — Le coeur financier

C'est le fichier le plus important. Une erreur de conversion = des montants faux a l'ecran.

Ce qu'on teste :
- Le taux EUR_TO_FCFA est bien 655.957
- Convertir 100 EUR en FCFA donne 65 596
- Convertir 655 957 FCFA en EUR donne 1 000
- formatEUR(1234.5) affiche bien avec le symbole euro
- formatXOF(5000) affiche bien "FCFA"
- formatCurrency s'adapte selon la devise choisie
- formatDualCurrency affiche les deux devises
- Les arrondis sont corrects (entier pour FCFA, 2 decimales pour EUR)
- La validation telephone fonctionne par pays (Benoin, Togo, Burkina, Cote d'Ivoire, France, Belgique)
- La validation de nom rejette les noms trop courts ou avec des chiffres
- Chaque pays a bien la bonne devise

### auth.test.ts (10 tests) — La securite

Un bug ici = faille de securite.

Ce qu'on teste :
- hashPassword genere un hash different du mot de passe clair
- comparePassword retourne vrai avec le bon mot de passe, faux sinon
- Deux hashes du meme mot de passe sont differents (grace au salt)
- generateToken genere un token valide
- verifyToken decode correctement le userId depuis le token
- verifyToken retourne null pour un token invalide
- verifyToken retourne null pour un token expire
- generateEmailToken genere 64 caracteres hexadecimaux
- Deux email tokens sont toujours differents

### utils.test.ts (12 tests) — Les dates

Les calculs de periode alimentent les graphiques et rapports.

Ce qu'on teste :
- formatDate affiche "15 mars 2026" en francais
- formatDateShort affiche "15 mars"
- getWeekId retourne le bon numero de semaine
- getMonthId retourne "2026-03"
- getStartOfWeek retourne toujours un lundi
- getEndOfWeek retourne toujours un dimanche
- getStartOfMonth retourne le 1er a minuit
- getEndOfMonth retourne le dernier jour a 23h59
- Fevrier est bien gere (28 jours)
- getStartOfYear = 1er janvier
- getEndOfYear = 31 decembre

### subscription.test.ts (7 tests) — Les abonnements

Le statut d'abonnement determine l'acces aux fonctionnalites Premium.

Ce qu'on teste :
- daysUntil retourne un nombre positif pour une date future
- daysSince retourne un nombre positif pour une date passee
- Si plus de 7 jours → statut "Actif"
- Si 4-7 jours → statut "Warning"
- Si 1-3 jours → statut "Critical"
- Si date passee → statut "Expire"
- Meme avec une date future, un abonnement "expired" reste expire

Les fonctions activatePremium et expireSubscription dependent de la base de donnees, donc elles sont testees dans les tests E2E.

### api.test.ts (4 tests) — Les reponses HTTP

Ce sont des petits helpers utilises dans toutes les API routes.

Ce qu'on teste :
- unauthorized retourne bien un 401
- badRequest retourne un 400 avec le message d'erreur
- ok retourne un 200 avec les donnees
- created retourne un 201 avec les donnees


## 5. Tests E2E — Ce qu'on teste

### public-pages.spec.ts — Les pages publiques

Ce qu'on teste :
- La page d'accueil affiche "Akwetche"
- Le lien "Se connecter" mene bien a /login
- Le lien "S'inscrire" mene bien a /register
- Sur /login, on voit bien les champs email et mot de passe
- Sur /login, le bouton "Se connecter" est visible
- Sur /login, le lien "Mot de passe oublie" est present
- Sur /register, le formulaire d'inscription est affiche
- Sur /forgot-password, le champ email est visible

### auth-flow.spec.ts — Le flux d'authentification

Ce qu'on teste :
- Si on va sur /dashboard sans etre connecte, on est redirige vers /login
- Si on se connecte avec admin@akwetche.app, on arrive sur /dashboard
- Si on va sur /dashboard/transactions sans session, on est redirige
- Si on va sur /dashboard/settings sans session, on est redirige


## 6. Ou sont les fichiers

Les tests unitaires sont dans `src/__tests__/` :
- `setup.ts` — Configuration globale
- `currency.test.ts` — Tests du systeme de devise
- `auth.test.ts` — Tests d'authentification
- `utils.test.ts` — Tests des utilitaires de date
- `subscription.test.ts` — Tests d'abonnement
- `api.test.ts` — Tests des helpers HTTP

Les tests E2E sont dans `e2e/` :
- `public-pages.spec.ts` — Tests des pages publiques
- `auth-flow.spec.ts` — Tests du flux d'authentification

Les configs sont a la racine :
- `vitest.config.ts` — Configuration Vitest
- `playwright.config.ts` — Configuration Playwright


## 7. Ajouter un nouveau test

**Pour un test unitaire :**

1. Cree un fichier `src/__tests__/ton-fichier.test.ts`
2. Importe les fonctions depuis `@/lib/ton-module`
3. Ecris les tests comme ca :

```typescript
import { describe, it, expect } from "vitest";
import { maFonction } from "@/lib/mon-module";

describe("mon-module — maFonction", () => {
  it("fait quelque chose de precis", () => {
    const resultat = maFonction(entree);
    expect(resultat).toBe(sortieAttendue);
  });
});
```

4. Lance `npm test` pour verifier

**Pour un test E2E :**

1. Cree un fichier `e2e/ton-test.spec.ts`
2. Ecris les tests comme ca :

```typescript
import { test, expect } from "@playwright/test";

test("description du test", async ({ page }) => {
  await page.goto("/ma-page");
  await expect(page.locator("h1")).toContainText("Titre");
});
```

3. Lance `npm run test:e2e` (le serveur doit tourner)

**Les regles :**
- Un test = une verification simple
- Les noms de tests sont en francais
- describe() regroupe par module
- it() decrit ce qu'on attend
