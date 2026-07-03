# L'extase

Plateforme d'abonnement à la OnlyFans : comptes, rôles (Utilisateur /
Créateur / Admin / Fondateur), photo de profil et bannière, publications
photo/vidéo avec contenu réservé aux abonné·e·s, messagerie entre
client·e·s et créateurs/créatrices, et abonnements payants *à un créateur*
dont **c'est lui/elle qui fixe le prix** (Stripe — carte, Apple Pay,
PayPal) — exactement comme sur OnlyFans, pas d'abonnement "VIP" au site.

## Stack

- **Next.js 16** (App Router, Server Actions, TypeScript, Tailwind v4)
- **Prisma 7** + SQLite en local (une seule ligne à changer pour passer sur
  PostgreSQL en production — voir `prisma/schema.prisma` et `prisma.config.ts`)
- Authentification maison : sessions en base (cookies `httpOnly`), pas de
  dépendance externe type NextAuth

## Démarrer en local

```bash
npm install
npm run db:migrate   # crée la base SQLite et les tables
npm run db:seed      # crée le compte FONDATEUR à partir de .env
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

Avant de lancer le seed, copie `.env.example` en `.env` et personnalise au
minimum `SESSION_SECRET` (`openssl rand -hex 32`) et les identifiants
`FOUNDER_*`.

## Sécurité mise en place

- Mots de passe hachés avec bcrypt (coût 12), jamais stockés en clair
- Politique de mot de passe forte (10+ caractères, majuscule/minuscule/chiffre/spécial)
- Verrouillage de compte après 5 échecs de connexion (15 min) + limitation par IP
- Sessions opaques stockées en base (le cookie ne contient qu'un jeton aléatoire haché)
- Double authentification (TOTP) avec codes de récupération à usage unique,
  protection anti-rejeu du code TOTP
- Comparaison à temps constant lors de la connexion pour ne pas révéler si un
  e-mail existe (timing attack)
- En-têtes de sécurité + CSP avec nonce (via `src/proxy.ts`, l'ancien
  `middleware.ts`), HSTS, `X-Content-Type-Options`, `Referrer-Policy`
- Journal d'audit (`AuditLog`) sur toutes les actions sensibles : connexion,
  changement de rôle, bannissement, activation/désactivation 2FA…
- RBAC appliqué côté serveur sur **chaque** page et action (le middleware ne
  sert qu'à la redirection UX, jamais de contrôle d'accès réel — voir le
  commentaire dans `src/proxy.ts` et `src/lib/auth.ts`)
- Uploads (avatar, bannière, photo/vidéo de publication) validés par
  signature binaire réelle (magic bytes), pas par l'extension ou le
  Content-Type envoyé par le navigateur — voir `src/lib/upload.ts`. SVG
  volontairement exclu (risque de script embarqué)
- Accès admin **sans lien visible** dans l'interface : 5 clics rapides sur
  le logo (comptes `ADMIN`/`FOUNDER` uniquement) — voir `SecretAdminLogo.tsx`.
  Ceci reste une commodité UX, pas une protection : l'accès réel est vérifié
  côté serveur sur chaque page `/admin/*`

## Rôles

- `USER` → membre standard, peut s'abonner et écrire aux créateurs suivis
- `CREATOR` → peut publier (photo/vidéo, avec option "réservé aux abonné·e·s")
- `ADMIN` → peut gérer les comptes `USER`/`CREATOR` (rôle, bannissement),
  ne peut pas toucher aux comptes `ADMIN`/`FOUNDER`
- `FOUNDER` → accès complet, seul rôle pouvant attribuer/retirer `ADMIN`

Les règles précises sont dans `src/app/actions/admin-actions.ts`
(`canChangeRole`, `canModerate`). Le passage d'un compte en `CREATOR` se fait
depuis `/admin/users`.

## Fonctionnalités

- **Profil** : photo de profil + bannière (upload local), bio
- **Publications** : les créateurs postent photo/vidéo avec légende, option
  "réservé aux abonné·e·s" (contenu flouté/verrouillé pour les non-abonnés,
  toujours visible par l'auteur·rice et le staff)
- **Abonnements** : chaque créateur·rice fixe son propre prix mensuel depuis
  ses paramètres (0 = gratuit). Prix > 0 → paiement Stripe Checkout ; prix
  gratuit → abonnement instantané en un clic. Se désabonner d'un abonnement
  payant ouvre le *Billing Portal* Stripe (Stripe continuerait sinon de
  prélever tant que l'abonnement n'est pas annulé côté Stripe)
- **Messagerie** : une conversation ne peut démarrer qu'entre un·e abonné·e
  et son créateur/sa créatrice (dans un sens ou l'autre) ; une fois démarrée
  elle reste ouverte même si l'abonnement est résilié — voir `src/lib/messaging.ts`

## Paiement (Stripe)

Les abonnements payants à un créateur utilisent **Stripe Checkout** (page
de paiement hébergée par Stripe) : carte, Apple Pay et PayPal fonctionnent
avec la même intégration, sans qu'aucune donnée bancaire ne transite par
notre serveur. Stripe enregistre la carte côté client pour les
renouvellements automatiques ; l'espace "Gérer mes abonnements / ma carte"
(dans les paramètres ou sur la page du/de la créateur·rice) ouvre le
*Billing Portal* Stripe, qui permet de changer de carte ou d'annuler sans
rien retaper.

**⚠️ L'argent des abonnements créateur arrive aujourd'hui sur le compte
Stripe du site, pas sur celui du/de la créateur·rice.** Pour reverser
automatiquement leur part, il faut mettre en place **Stripe Connect**
(onboarding + vérification d'identité de chaque créateur·rice) — non fait,
voir "À faire ensuite".

**Tant que `STRIPE_SECRET_KEY` n'est pas renseigné dans `.env`, le reste du
site fonctionne normalement** — les boutons de paiement affichent
simplement un message "paiement non configuré" au lieu de planter.

Pour activer les paiements réels :

1. Crée un compte sur [stripe.com](https://stripe.com) et récupère ta clé
   secrète de test (`sk_test_...`) dans le Dashboard → Developers → API keys
2. Dans le Dashboard → Settings → Payment methods, active **PayPal**
   (désactivé par défaut sur un nouveau compte) — Apple Pay n'a besoin
   d'aucune configuration supplémentaire avec Stripe Checkout
3. Renseigne `STRIPE_SECRET_KEY` dans `.env`
4. Crée un endpoint de webhook (Dashboard → Developers → Webhooks) pointant
   vers `https://ton-domaine/api/stripe/webhook`, écoutant les événements
   `customer.subscription.created`, `customer.subscription.updated` et
   `customer.subscription.deleted` ; colle le secret de signature généré
   dans `STRIPE_WEBHOOK_SECRET`. En local, utilise le [Stripe CLI](https://docs.stripe.com/stripe-cli)
   (`stripe listen --forward-to localhost:3000/api/stripe/webhook`)
5. `STRIPE_CURRENCY` fixe la devise utilisée pour les prix — pas besoin de
   créer de Produit dans le Dashboard, le prix (fixé par chaque
   créateur·rice) est généré à la volée à chaque paiement

Le statut d'un abonnement créateur (`Subscription.status`) n'est **jamais**
activé directement au retour du paiement — uniquement via le webhook, qui
fait foi, pour ne jamais faire confiance à une simple redirection côté
client.

## Structure

```
prisma/schema.prisma       modèles (User, Session, Post, Media, Subscription, Message, AuditLog, …)
src/lib/                   auth, sessions, mots de passe, 2FA, rate limiting, audit, upload, messaging, stripe
src/app/actions/           Server Actions (auth, sécurité, profil, admin, posts, abonnements, messages)
src/app/                   landing, login, register, verify-2fa, feed, settings, creator/[username], messages, admin
src/app/api/stripe/webhook Route Handler recevant les événements Stripe (seule source de vérité pour un abonnement)
src/proxy.ts               proxy (ex-middleware) : redirection UX + en-têtes CSP
public/uploads/             fichiers envoyés par les utilisateurs (ignoré par git)
```

## À faire ensuite

- **Stripe Connect** pour reverser aux créateurs leur part des abonnements
  payés (aujourd'hui l'argent reste sur le compte Stripe du site — voir
  l'avertissement dans "Paiement (Stripe)")
- Vérification d'e-mail à l'inscription et réinitialisation de mot de passe
  (nécessite un service d'envoi d'e-mails, non configuré ici)
- Stockage des médias sur un service dédié (S3-compatible) plutôt que le
  disque local, avant tout déploiement multi-instance
- Passage en PostgreSQL pour la production
