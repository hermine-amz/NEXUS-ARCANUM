# PHASE 2 — ARCHITECTURE ET BASE DE DONNÉES

**Projet :** NEXUSARCANUM SHOP  
**Statut :** En cours d'implémentation  

---

## 1. Architecture logicielle
- **Monolithe modulaire Next.js App Router (TypeScript) :**
  - `src/app/` : Pages publiques (`/`), catalogue (`/catalogue`, `/categories/[slug]`, `/produit/[slug]`), tunnel (`/panier`, `/commande`), espace client (`/compte`, `/compte/bibliotheque`), administration (`/admin/*`), et routes API (`/api/*`).
  - `src/lib/services/` : Logique métier isolée :
    - `payment/gateway-manager.ts` : `PaymentGatewayManager` (Modes A, B, C, idempotence, vérification serveur, chiffrement AES-256-GCM des secrets).
    - `payment/connectors/` : Adaptateurs `MaketouConnector`, `SebPayConnector`, `SaaSPayConnector`, `GeneciConnector` (interface `IPaymentGateway`).
    - `delivery/download-service.ts` : Génération de jetons HMAC-SHA256, contrôle de quota, streaming depuis `storage/private/`.
    - `catalog/import-service.ts` : Import massif CSV/Excel avec validation, dédoublonnage et rapport d'erreurs.
  - `src/lib/i18n/` : Dictionnaires `fr` (défaut) et `en`.
  - `prisma/` : Schéma PostgreSQL complet (`schema.prisma`), migrations et script de seed des 16 catégories + 32 produits de démonstration.
  - `storage/private/` : Fichiers numériques complets protégés (jamais exposés directement via `public/`).
  - `public/demo-extracts/` & `public/covers/` : Extraits PDF gratuits (3 à 5 pages) et couvertures générées.

## 2. Modèle de données PostgreSQL (20+ tables)
Conforme à la section 30 du cahier des charges :
`users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `categories`, `authors`, `publishers`, `products`, `digital_assets`, `carts`, `cart_items`, `orders`, `order_items`, `payments`, `payment_gateways`, `payment_transactions`, `digital_entitlements`, `downloads`, `coupons`, `reviews`, `audit_logs`, `banners`, `cms_pages`, `site_settings`, `newsletter_subscribers`.

