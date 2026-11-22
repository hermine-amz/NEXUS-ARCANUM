# RAPPORT DE SÉCURITÉ & TESTS (PHASES 14 & 15)

## 1. Mesures de sécurité implémentées
- **Authentification & RBAC :** Mots de passe hachés via `bcryptjs` (coût 12), sessions JWT signées (`jose` HS256) stockées en cookie `HttpOnly` + `SameSite=Lax`. Contrôle d'accès administrateur (`isAdminSession`) sur toutes les routes `/api/admin/*`.
- **Chiffrement des secrets :** Les clés API et secrets webhooks des agrégateurs (`payment_gateways.encrypted_secrets`) sont chiffrés en **AES-256-GCM** et ne sont jamais renvoyés en clair au navigateur.
- **Protection des paiements :**
  - Clés d'idempotence uniques sur les commandes et paiements (`idempotency_key`).
  - Vérification de signature webhook (`HMAC-SHA256` avec `crypto.timingSafeEqual`).
  - Contrôle strict montant/devise avant validation.
  - Interdiction de relancer automatiquement une transaction encore `PENDING` sur un autre agrégateur.
  - Blocage strict des produits de démonstration : aucun paiement réel ne peut être déclenché pour un produit `isDemo = true`.
- **Protection des fichiers payants :** Stockage hors `public/` (`storage/private/`), accès exclusif via jetons temporaires signés `HMAC-SHA256` (expiration 10 min), contrôle de quota (`downloadCount < maxDownloads`), journalisation (`downloads`) et filigrane PDF facultatif.
- **En-têtes HTTP, CSRF & Rate Limiting :**
  - `src/middleware.ts` : CSP (`Content-Security-Policy`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS en production, vérification `Origin`/`Host` anti-CSRF sur les mutations API, et défense en profondeur RBAC sur `/api/admin/*`.
  - `src/lib/security/rate-limit.ts` : limitation de débit sur `/api/auth/login` (10 req / 15 min) et `/api/auth/register` (5 req / 15 min) avec politique de mot de passe fort.
  - Protection anti-*path traversal* dans `download-service.ts` (`path.resolve` strict dans `storage/private/`) et validation taille/extension (10 Mo max, `.csv/.xlsx/.xls`) dans `/api/admin/import`.
  - Validation `zod` sur toutes les API, requêtes paramétrées Prisma ORM.

## 2. Vérifications techniques exécutées
- `npx tsx scripts/security-check.ts` : 5/5 tests de sécurité automatisés réussis (AES-256-GCM + détection d'altération, HMAC-SHA256 + expiration + altération, rate limiter, JWT + altération, bcryptjs).
- `npx prisma generate` : génération du client PostgreSQL validée.
- `npx prisma migrate diff` : migration SQL initiale PostgreSQL générée dans `prisma/migrations/0001_init/migration.sql`.
- `npx tsx scripts/generate-demo-assets.ts` : 32 couvertures SVG, 32 extraits PDF (4 pages) et 32 fichiers privés générés avec succès.
- `npx next build` : compilation TypeScript et build production Next.js vérifiés.

