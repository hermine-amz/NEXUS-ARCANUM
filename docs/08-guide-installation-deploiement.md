# GUIDES D'INSTALLATION, D'ADMINISTRATION, DE MAINTENANCE & DÉPLOIEMENT

## 1. Guide d'installation locale
1. Installer les dépendances : `pnpm install`
2. Configurer `.env` à partir de `.env.example` avec une base **PostgreSQL** valide (`DATABASE_URL`).
3. Générer le client Prisma et appliquer les migrations :
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```
4. Peupler les 16 catégories, 32 produits de démo, rôles RBAC et 4 agrégateurs :
   ```bash
   npx prisma db seed
   ```
   *(Pour régénérer les 32 couvertures SVG, extraits PDF et fichiers privés : `npx tsx scripts/generate-demo-assets.ts`)*
5. Lancer en développement : `pnpm dev` -> `http://localhost:3000`

## 2. Comptes initiaux créés par le seed
- **Administrateur (`SUPER_ADMIN`) :** `admin@nexusarcanum.shop` / `NexusAdmin2026!` *(à changer immédiatement en production)*
- **Client de démonstration (`CUSTOMER`) :** `lecteur@nexusarcanum.shop` / `LecteurDemo2026!`

## 3. Guide d'administration
- **Catalogue & Démonstrations (`/admin` > Catalogue & Démos) :** Masquer/afficher du catalogue public, dupliquer, archiver, ou convertir un produit de démo en produit commercial après validation des droits.
- **Importation massive (`/admin` > Import CSV / Excel) :** Importer des centaines/milliers de produits via `.csv` ou `.xlsx` avec validation et contrôle des doublons.
- **Paiements (`/admin` > Gestion des Paiements) :** Basculer entre **Mode A** (unique), **Mode B** (choix client), **Mode C** (routage intelligent), activer/désactiver un agrégateur, chiffrer les clés API (AES-256-GCM) et tester les connexions.

## 4. Maintenance & Sauvegardes
- Sauvegarde quotidienne PostgreSQL : `pg_dump $DATABASE_URL > backup_$(date +%F).sql`
- Sauvegarde du dossier privé : synchroniser `storage/private/` vers un stockage objet chiffré.

## 5. Procédure de déploiement (après autorisation du propriétaire)
1. Provisionner un VPS Hostinger (Ubuntu 24.04 + Node.js 22 + PostgreSQL 16 + Nginx + Certbot HTTPS).
2. Déployer le code, renseigner `.env` avec des secrets 256 bits uniques (`JWT_SECRET`, `PAYMENT_ENCRYPTION_KEY`, `DOWNLOAD_SIGNING_SECRET`).
3. Exécuter `npx prisma migrate deploy && npx prisma db seed && pnpm build`.
4. Démarrer via `pm2 start pnpm --name nexusarcanum -- start` derrière Nginx HTTPS.

