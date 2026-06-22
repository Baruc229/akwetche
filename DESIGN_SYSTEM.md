# Design System — Akwetche

> Palette : `forest` (#1E4D35), `ochre` (#C4862A), `sand` (#FAF7F2), `ink` (#1A1A18)

---

## 1. Classes CSS globales (`globals.css`)

| Classe | Rôle | Style |
|---|---|---|
| `.card` | Conteneur carte générique | `bg-white`, `rounded-2xl` (16px), bordure `#E8E2D9`, hover ombre légère |
| `.btn-primary` | Bouton principal | Fond `forest`, texte blanc, `rounded-xl`, hover translateY(-1px) + ombre |
| `.btn-secondary` | Bouton secondaire | Transparent, bordure `forest`, texte `forest`, `rounded-xl` |
| `.input-field` | Champ de formulaire | `rounded-xl`, bordure, focus ring `forest` |
| `.stat-value` | Valeur statistique | `text-1.5rem`, `font-bold` |
| `.stat-label` | Étiquette statistique | `text-sm`, couleur `muted` (#6B6560) |
| `.animate-fade-in` | Apparition en fondu | `opacity 0 → 1`, `translateY(8px → 0)` sur 0.4s |
| `.animate-slide-in` | Glissement latéral | `translateX(-12px → 0)` sur 0.3s |
| `.animate-scale-in` | Apparition zoom | `scale(0.95 → 1)` sur 0.3s |

---

## 2. Design des cartes (card)

### Structure commune
```html
<div class="card p-5 animate-fade-in">
  <h2 class="text-sm font-semibold text-ink mb-1">Titre</h2>
  <p class="text-xs text-muted mb-4">Sous-titre ou description</p>
  ... contenu spécifique ...
</div>
```

### Types de cartes dans le dashboard

#### a) Carte "Argent disponible" (hero)
- **Emplacement** : dashboard, en haut
- **Fond** : `bg-forest` (vert foncé), texte blanc
- **Contenu** : icône `faWallet`, solde total `text-3xl font-bold`, sous-ligne revenus/dépenses du mois
- **Comportement** : `animate-fade-in`

#### b) Carte "Où est passé mon argent"
- **Contenu** : barres de progression horizontales par catégorie de dépense (cette semaine)
- **Barres** : hauteur 8px, `rounded-full`, couleur depuis `CATEGORY_COLORS`
- **Scope** : en mode commercial, section "Personnel" (label `text-forest`) + "Activité" (label `text-ochre`)
- **État vide** : "Aucune dépense cette semaine"

#### c) Carte "Projection"
- **Contenu** : estimation de fin de mois basée sur la dépense moyenne/jour
- **Zone foncée** : `bg-sand rounded-xl`, montant projeté
- **Couleur** : `text-forest` si positif, `text-red-500` si négatif
- **Alerte** : si `projectedRemaining < 0`, boîte rouge avec `faTriangleExclamation`

#### d) Carte "Ce mois-ci"
- **3 mini-cartes** en grille (reçu / dépensé / reste) : `bg-ochre-light rounded-xl p-4`
- **Mini-cartes infos** : plus grosse dépense + taux d'épargne, `bg-white border`

#### e) Carte "Mon activité aujourd'hui" (commercial)
- **Bordure gauche** : `border-l-4 border-l-ochre`
- **3 mini-cartes** : chiffre d'affaires, bénéfice, marge
- **Visible uniquement** si `commercialMode === true` ET activité > 0

#### f) Carte "Dernières opérations"
- **Lien** "Voir tout" → `/dashboard/transactions`
- **Liste** : ligne par transaction avec icône (up/down), description, catégorie, montant
- **État vide** : icône `faClock` + "Aucune opération pour le moment"
- **Animation** : `animate-slide-in` avec `animationDelay: ${i * 50}ms`

#### g) Carte "Liens rapides"
- **Liens** : historique, produits, ventes (conditionnel)
- **Style ligne** : `flex items-center gap-3 p-3 rounded-xl hover:bg-sand`

#### h) Carte "En résumé" (synthèse)
- **Desktop** : tableau comparatif Perso / Activité / Total
- **Mobile** : fiches séparées (personnel, activité, total) avec `sm:hidden` / `hidden sm:block`
- **Phrase explicative** : texte narratif détaillant revenus, dépenses, épargne, taux
- **Plus grosse dépense** : ligne `bg-sand` en bas

---

## 3. Modales

### a) ConfirmModal
- **Fichier** : `src/components/ConfirmModal.tsx`
- **Props typées** :
  ```ts
  type ConfirmModalProps = {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;      // défaut "Confirmer"
    cancelLabel?: string;       // défaut "Annuler"
    variant?: "danger" | "warning" | "info";
    onConfirm: () => void;
    onCancel: () => void;
  };
  ```
- **Structure** : overlay `bg-black/40` centré + carte blanche `max-w-md`
- **Icône** : `faTriangleExclamation` dans cercle (couleur selon variant)
- **Boutons** : 2 colonnes (annuler + confirmer)
- **Variants** :
  - `danger` : icône rouge, bouton `bg-red-500`
  - `warning` : icône ochre, bouton `bg-ochre`
  - `info` : icône forest, bouton `bg-forest`
- **Animations** : `.animate-fade-in` (overlay) + `.animate-scale-in` (carte)

### b) OnboardingModal
- **Fichier** : `src/components/OnboardingModal.tsx`
- **Props** : `{ onClose, currency?, countryCode? }`
- **Déclenchement** : quand `onboardingCompleted === false` ET `categories.length === 0`
- **Structure** : overlay + carte blanche
- **Contenu** : message bienvenue, indicateur de devise avec `FlagImg`, 2 features (revenus/dépenses)
- **Boutons** : "Plus tard" (appelle `onClose` → `PUT /api/user` onboardingCompleted=true) + "Créer mes catégories" (→ `/dashboard/settings`)

### c) ExpiredModal (abonnement expiré)
- **Fichier** : `src/components/subscription/ExpiredModal.tsx`
- **Props** : aucune (auto-gérée)
- **Déclenchement** : une seule fois via `sessionStorage` ("akwetche_expired_modal_shown")
- **Structure** : overlay + carte blanche
- **Contenu** : icône `faCrown` ochre, titre "Abonnement expiré", bouton "Renouveler maintenant" (→ `/payment`) + "Continuer en gratuit" (ferme)

### d) Modal transaction inline (dans dashboard)
- **Fichier** : `src/app/(dashboard)/dashboard/page.tsx` (lignes 885-1039)
- **Structure** : overlay `bg-black/40` + carte `max-w-md`, `max-h-[90vh] overflow-y-auto`
- **Contenu** : formulaire avec toggle scope (Perso/Activité), toggle type (Dépense/Revenu), montant, description, `CustomSelect` catégorie, jauge limites gratuites
- **Bouton validation** : `btn-primary` désactivé si limite atteinte
- **FAB mobile** : bouton rond `bg-forest` fixe en bas à droite (`bottom-24 right-5`)

---

## 4. Composants réutilisables

### a) CustomSelect
- **Fichier** : `src/components/ui/CustomSelect.tsx`
- **Props** :
  ```ts
  type Option = { value: string; label: string; icon?: string; disabled?: boolean; disabledReason?: string; separator?: boolean; };
  type CustomSelectProps = { options: Option[]; value: string; onChange: (value: string) => void; placeholder?: string; disabled?: boolean; className?: string; };
  ```
- **Comportement** :
  - Desktop : dropdown positionné (auto up/down selon espace), max-height 256px, scroll custom
  - Mobile (< 375px) : plein écran en drawer bas (`animate-slide-up`), `max-h-[70vh]`
  - Navigation clavier : `ArrowDown`, `ArrowUp`, `Enter`, `Escape`
  - Options disabled : affiche cadenas + "Premium requis"
  - Séparateurs : ligne avec label

### b) NotificationBell
- **Fichier** : `src/components/NotificationBell.tsx`
- **Comportement** :
  - Badge rouge avec nombre de notifications non lues
  - Dropdown positionné dynamiquement (`320px` de large), portal via `createPortal`
  - Rafraîchissement automatique toutes les 30s
  - Marquer comme lu au clic, "Tout marquer lu", suppression avec `ConfirmModal`
  - Icône par type : `subscription` → `faCrown`, `product` → `faBox`, `sale` → `faCartShopping`, etc.

### c) ExpirationBanner
- **Fichier** : `src/components/subscription/ExpirationBanner.tsx`
- **Props** : `{ daysRemaining, status, label, variant }`
- **Variants** :
  - `warning` : fond `bg-ochre-light/70`, icône `faBell`, bouton fermer
  - `critical` : fond `bg-ochre/10`, icône `faTriangleExclamation`, bouton "Renouveler maintenant"
  - `expired` : fond `bg-red-50`, repliable (chevron up/down), bouton "Renouveler" rouge
- **Comportement** : dismissible (sauf expired), collapsible (expired)

### d) PremiumLock
- **Fichier** : `src/components/subscription/PremiumLock.tsx`
- **Usage** : page entière pour fonctionnalités bloquées
- **Structure** : centré vertical, icône `faCrown` rouge, message, 2 infos (cadenas + historique), 2 boutons

### e) AuthFeaturePanel
- **Fichier** : `src/components/auth/AuthFeaturePanel.tsx`
- **Usage** : panneau gauche des pages login/register (desktop only, `hidden lg:flex`)
- **Fond** : `bg-[#1E4D35]` avec décorations circulaires
- **Contenu** : 5 features avec icônes, titres, descriptions, points

### f) FlagImg
- **Fichier** : `src/components/ui/FlagImg.tsx`
- **Props** : `{ code, className? }`
- **Rendu** : drapeau pays via `country-flag-icons`

---

## 5. États et comportements

### Loading (dashboard)
- Skeleton animé (`animate-pulse`) reproduisant la structure des cartes
- Blocs gris (`bg-stone/30`, `bg-stone/20`) avec formes approximatives
- Spinner centré dans le layout (`border-2 border-forest border-t-transparent rounded-full animate-spin`)

### Erreur (dashboard)
- Bannière rouge `bg-red-50` avec `faTriangleExclamation` + message + bouton fermer
- `loadError` state affiché en haut du dashboard

### États vides
- **Catégories absentes** : bannière `bg-ochre-light` invitant à configurer
- **Transactions absentes** : `faClock` + "Aucune opération"
- **Dépenses absentes** : "Aucune dépense cette semaine"
- **Notifications absentes** : "Aucune notification"
- **Options absentes (CustomSelect)** : "Aucune option"

### Limites plan gratuit
- Jauge à barres (Revenus / Dépenses) avec couleurs : vert (< max-1), ochre (max-1), rouge (max)
- Alerte rouge quand limite atteinte
- Blocage du bouton "Ajouter" dans le modal transaction

### Animations
- Cartes : `animate-fade-in` (apparition séquentielle)
- Lignes de transactions : `animate-slide-in` avec délai progressif
- Modales (overlay) : `animate-fade-in`
- Modales (contenu) : `animate-scale-in`
- CustomSelect mobile : `animate-slide-up`
- Transitions hover : `transition-all duration-200`

---

## 6. Palette de couleurs

| Token | Hex | Usage |
|---|---|---|
| `forest` | `#1E4D35` | Primaire, boutons, titres |
| `forest-light` | `#2A6347` | Hover, revenus |
| `ochre` | `#C4862A` | Accent, activité, dépenses |
| `ochre-light` | `#F5E6CC` | Fond carte statistiques |
| `sand` | `#FAF7F2` | Fond page, fond alternatif |
| `ink` | `#1A1A18` | Texte principal |
| `muted` | `#6B6560` | Texte secondaire |
| `border` | `#E8E2D9` | Bordures |
| `surface` | `#FFFFFF` | Fond cartes |

---

## 7. Navigation

### Sidebar (desktop, `lg:`)
- Largeur 256px (`w-64`), `bg-white`, bordure droite
- Logo + nom, utilisateur connecté, `NotificationBell`
- Nav items : Accueil, Historique, Bilans
- Section "Activité" (conditionnelle) : Produits, Ventes, Stock
- Administration (si rôle admin), Paramètres
- Checkbox "Activité commerciale" (Premium only)
- Bouton déconnexion en bas

### Bottom nav (mobile, `< lg:`)
- `fixed bottom-0`, `bg-white`, `border-t`, 5 items
- Items locked (free users) : affiche cadenas, redirige vers `/payment`
- Header sticky : hamburger + logo + `NotificationBell`

### Overlay mobile
- `fixed inset-0 bg-black/20 z-30` quand sidebar ouverte
- Clic ferme la sidebar

---

## 8. Pages et leurs cartes

| Page | Cartes / Composants |
|---|---|
| `/dashboard` | Argent disponible, Où est passé mon argent, Projection, Ce mois-ci, Mon activité, Dernières opérations, Liens rapides, En résumé, OnboardingModal, Modal transaction, FAB |
| `/dashboard/transactions` | Cartes stat résumé, liste transactions, modal transaction (mobile/desktop) |
| `/dashboard/settings` | ConfirmModal, CustomSelect, FlagImg, formulaires |
| `/dashboard/reports` | Stats block, évolution badges |
| `/dashboard/sales` | Cartes stats, formulaires vente |
| `/dashboard/stock` | Cartes stats, statut badges, modal réapprovisionnement |
| `/dashboard/products` | ConfirmModal, formulaires produits |
| `/dashboard/history` | (logs) |
| `/admin` | ConfirmModal, CustomSelect, FlagImg, modale détail utilisateur, badges |
| `/payment` | StripeCardForm, PayPalForm, MobileMoneyForm, PaymentStatusBanner |
