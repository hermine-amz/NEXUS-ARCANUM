# RAPPORT DE DÉMARRAGE — NEXUSARCANUM SHOP

**Version :** 1.0  
**Date :** 19 novembre 2026  
**Environnement :** Antigravity  

---

## 1. Analyse du projet
**NEXUSARCANUM SHOP** est une librairie numérique généraliste et plateforme e-commerce dédiée exclusivement aux produits dématérialisés (livres PDF/EPUB, livres audio, manuels, guides, formations, packs et ressources téléchargeables), ciblant le marché béninois, africain et international.
- **Périmètre strict :** 0 produit physique, 0 stock physique, 0 livraison physique.
- **Langues & Devise :** Français (principal), Anglais (secondaire), devise principale **FCFA (XOF)**.
- **Catalogue :** 16 catégories principales extensibles (sous-catégories, CRUD complet), avec un catalogue initial de **32 produits de démonstration** (2 par catégorie, extraits PDF réels de 3 à 5 pages, couvertures professionnelles, fichiers complets de démonstration téléchargeables, mention non commerciale, aucun paiement réel déclenché).
- **Cœur critique :** Expérience UX/UI haut de gamme (identité originale bleu nuit, or, blanc, gris clair), livraison numérique sécurisée (bibliothèque personnelle, liens temporaires signés, stockage privé), et module **Payment Gateway Manager** multi-agrégateurs interchangeable (Modes A, B, C).

---

## 2. Architecture proposée
Architecture modulaire, portable et indépendante de l'hébergeur :
- **Frontend & SSR / App Router :** Next.js (App Router) + TypeScript + Tailwind CSS.
- **Internationalisation (i18n) :** Routage et dictionnaires FR (défaut) / EN.
- **Backend API :** API Routes / Route Handlers Next.js structurés en couche services métier (`CatalogService`, `CartOrderService`, `PaymentGatewayManager`, `DigitalDeliveryService`, `AdminService`, `ImportService`), avec validation stricte (Zod).
- **Base de données :** PostgreSQL via Prisma ORM (migrations versionnées, index, contraintes d'intégrité).
- **Stockage des fichiers :** Stockage privé hors dossier public (`storage/private/` en local / S3-compatible ou volume privé en production) avec diffusion exclusive via URLs signées temporaires et streaming contrôlé.
- **Sécurité des secrets :** Chiffrement applicatif AES-256-GCM des clés API et secrets webhooks des agrégateurs stockés en base (`PAYMENT_ENCRYPTION_KEY`).

---

## 3. Faisabilité technique
- **Environnement local vérifié :** `Node.js v22.14.0`, `npm 10.9.2`, `pnpm 11.11.0`, `Git 2.52.0`, `Python 3.13.2` sont disponibles.
- **Point d'attention :** `psql` (PostgreSQL) et `docker` ne sont pas installés sur la machine locale. Pour le développement local, une instance PostgreSQL distante (ex. Neon, Supabase) ou l'installation locale de PostgreSQL sera utilisée ; le code et les migrations resteront 100 % standards PostgreSQL.
- **Génération des livrables de démo :** Python / Node permettront de générer automatiquement de véritables couvertures haute qualité et de véritables extraits PDF (3 à 5 pages) ainsi que des fichiers de démonstration complets (PDF/EPUB/MP3/ZIP).

---

## 4. Schéma de base de données (PostgreSQL)
Conformément à la section 30 du cahier des charges, le schéma couvre au minimum :
- **Accès & RBAC :** `users`, `roles`, `permissions` (+ tables de jointure `role_permissions`, `user_roles`).
- **Catalogue :** `categories` (auto-référencée `parent_id` pour les sous-catégories et `sort_order`), `authors`, `publishers`, `products`, `digital_assets` (plusieurs fichiers/formats par produit : extrait gratuit vs fichier payant).
- **Commerce :** `carts`, `cart_items`, `orders`, `order_items`, `coupons`.
- **Paiements multi-agrégateurs :** `payment_gateways` (configuration chiffrée, mode, devises, pays, opérateurs, frais, priorité), `payments`, `payment_transactions` (journal immuable + clé d'idempotence).
- **Livraison & Social :** `digital_entitlements` (droits d'accès, quota de téléchargements), `downloads` (historique IP/date/asset), `reviews`, `audit_logs`.

---

## 5. Stratégie UX/UI
- Approche *Mobile-First* et *Desktop-Rich* inspirée des meilleures librairies numériques internationales (sans copier le site de référence).
- Parcours d'achat réduit au minimum d'étapes (découverte -> fiche complète / extrait gratuit -> panier ou achat direct -> paiement -> bibliothèque personnelle).
- Accessibilité WCAG (contrastes, navigation clavier, états de focus visibles, labels ARIA, hiérarchie sémantique).
- Optimisation des performances (images Next/Image, pagination/filtrage rapide pour supporter plusieurs milliers de références).

---

## 6. Wireframes à produire (Phase 4)
1. Page d'accueil (Desktop & Mobile).
2. Page Catalogue / Catégorie avec filtres avancés et recherche.
3. Fiche produit complète (aperçu, sommaire, extrait gratuit, avis, similaires).
4. Panier & Tunnel de commande (avec sélection d'agrégateur en Mode B ou routage auto en Mode C).
5. Espace Client & Bibliothèque numérique personnelle.
6. Back-office Administration (Tableau de bord, Statistiques, Gestion des paiements & agrégateurs, Import CSV/Excel).

---

## 7. Design system proposé
- **Palette :**
  - Bleu nuit (primaire) : `#0B132B` / `#1C2541`
  - Or (accent / CTA premium) : `#D4AF37` / `#C59B27`
  - Blanc (surfaces) : `#FFFFFF`
  - Gris clair (fonds secondaires / bordures) : `#F4F6F9` / `#E2E8F0`
  - Sémantiques : Succès `#10B981`, Alerte `#F59E0B`, Erreur `#EF4444`.
- **Typographie :** Titres éditoriaux élégants (ex. *Playfair Display* ou *Cormorant Garamond*) + Corps UI ultra-lisible (*Inter* ou *Plus Jakarta Sans*).
- **Composants :** Design system unifié (boutons, badges format/démo, cartes produits, champs de formulaire, modales, états vides, skeletons de chargement, notifications toast).

---

## 8. Faisabilité de Maketou
**Faisable et documenté** (`https://docs-api.maketou.com/`) :
- **Authentification :** `Authorization: Bearer <API_KEY>` (clé rattachée à une boutique).
- **Checkout :** `POST https://api.maketou.net/api/v1/stores/cart/checkout` (`productDocumentId`, `email`, `firstName`, `lastName`, `phone`, `redirectURL`, `webhookUrl`, `meta`, `customerPrice`) -> retourne `id` du panier et `redirectUrl`.
- **Vérification & Statuts :** `GET https://api.maketou.net/api/v1/stores/cart/{cartId}` (soumis au *rate-limiting*, d'où la priorité aux webhooks). Statuts : `waiting_payment`, `completed`, `payment_failed`, `abandoned`.
- **Point d'architecture important :** L'API checkout Maketou actuelle prend un `productDocumentId` par appel. Pour un panier multi-produits sur NEXUSARCANUM SHOP, l'adaptateur Maketou devra soit mapper un produit générique à montant libre (`customerPrice`) avec `meta: { orderId, items }`, soit gérer la correspondance produit côté Maketou selon les règles du compte marchand.

---

## 9. Faisabilité des autres agrégateurs
- **SebPay (`sebpay.africa` / `sebpay.bj`) :** Faisable. Basé à Cotonou (Bénin), API REST Pay-in/Payout, supporte MTN MoMo, Moov Money, Celtiis (XOF), cartes et webhooks avec environnement sandbox.
- **SaaSPay :** Faisable sous réserve d'obtention de la documentation technique exacte du compte marchand cible (plusieurs acteurs utilisent des noms proches : *SasPay.me* en Afrique de l'Ouest/Centrale vs *SasaPay* au Kenya).
- **Geneci.ci :** **Alerte / Non vérifié publiquement.** Aucune passerelle de paiement publique documentée sous le nom `Geneci.ci` n'a été trouvée lors de l'audit initial (à ne pas confondre avec `oneci.ci` pour l'identité civile en Côte d'Ivoire). Conformément à la règle *« Ne jamais inventer d'API »*, le connecteur sera préparé via l'interface standard `IPaymentGateway` et activé uniquement après réception de la documentation officielle.

---

## 10. Système de téléchargement
1. Vérification serveur stricte du paiement (`completed` + montant + devise + signature webhook).
2. Création de l'enregistrement `digital_entitlements` lié à `user_id`, `order_id`, `product_id`.
3. Génération d'un jeton temporaire signé (HMAC-SHA256 avec expiration courte) pour le téléchargement.
4. Streaming serveur depuis le stockage privé (`Content-Disposition: attachment`, contrôle du compteur `download_count` vs `max_downloads`, journalisation dans `downloads`).
5. Option de filigrane PDF dynamique (nom/email/ID commande) activable par produit/admin.
6. Les extraits gratuits (3–5 pages) restent librement téléchargeables sans paiement.

---

## 11. Stratégie de sécurité
- HTTPS obligatoire en production, en-têtes HTTP sécurisés (CSP, HSTS, X-Frame-Options).
- Hachage des mots de passe via Argon2id ou bcrypt (coût >= 12), sessions JWT/HttpOnly sécurisées + protection CSRF.
- Validation systématique des entrées (Zod) et requêtes paramétrées Prisma (anti-SQLi).
- Protection des paiements : idempotence, verrouillage contre double commande/paiement, vérification serveur + validation de signature webhook + contrôle strict montant/devise, interdiction de relance automatique d'une transaction en attente sur un autre agrégateur.
- Chiffrement AES-256-GCM des clés API en base, journalisation (`audit_logs`) immuable des opérations sensibles et financières.

---

## 12. Calendrier de développement (19 phases obligatoires)
- **Lot A — Fondations (Phases 1 à 5) :** Audit & faisabilité -> Architecture & BDD -> Étude UX & IA -> Wireframes & User Flows -> Design System & UI.
- **Lot B — Vitrine & Catalogue (Phases 6 à 8) :** Page d'accueil & interfaces publiques -> 32 produits de démo (couvertures + extraits PDF + fichiers) -> Catalogue & fiches produits.
- **Lot C — Commerce & Paiements (Phases 9 à 11) :** Panier & Commandes -> Payment Gateway Manager (Modes A/B/C) -> Connecteurs agrégateurs (Maketou, SebPay, etc.).
- **Lot D — Livraison & Back-office (Phases 12 à 13) :** Bibliothèque personnelle & téléchargements protégés -> Administration complète, statistiques & import massif CSV/Excel.
- **Lot E — Qualité & Lancement (Phases 14 à 19) :** Sécurité & tests automatisés -> Tests UX/UI desktop & mobile -> Préproduction -> Présentation au propriétaire -> Comparatif Chariow / Hostinger -> Déploiement après autorisation.

---

## 13. Risques techniques
1. **Absence locale de PostgreSQL / Docker :** Nécessite une base PostgreSQL (locale ou cloud dev) pour exécuter les migrations et tests d'intégration.
2. **Documentation manquante pour `Geneci.ci` et précision sur `SaaSPay` :** Risque de blocage sur ces connecteurs spécifiques sans documentation officielle fournie par le propriétaire.
3. **Cartes multi-produits sur Maketou :** L'API checkout Maketou est centrée sur un `productDocumentId` ; la gestion d'un panier multi-articles nécessitera un produit passerelle `customerPrice` ou une validation avec Maketou.
4. **Compatibilité hébergement Chariow vs Hostinger :** Chariow est une plateforme SaaS fermée pour créateurs (incompatible avec l'hébergement d'une application Next.js + PostgreSQL sur mesure), contrairement à un VPS Hostinger (Node.js + PostgreSQL + stockage privé) — ce point sera détaillé en Phase 18.

---

## 14. Informations et accès nécessaires
Sans jamais redemander les décisions déjà tranchées dans le cahier des charges, voici les seuls éléments externes requis pour les phases d'intégration réelle et de base de données :
1. **Base de données PostgreSQL de développement :** Souhaitez-vous utiliser une base PostgreSQL cloud gratuite (ex. Neon/Supabase) ou installer PostgreSQL localement ?
2. **Documentation / URL officielle de `Geneci.ci`** (et confirmation s'il s'agit bien de *SasPay.me* pour `SaaSPay`).
3. **Clés API Sandbox / Test** (Maketou, SebPay, etc.) lorsque nous arriverons à la **Phase 11 (Intégrations des agrégateurs)**.

