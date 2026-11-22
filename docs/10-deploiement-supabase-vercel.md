# GUIDE DE CONNEXION SUPABASE & DÉPLOIEMENT VERCEL

## 1. Informations à récupérer sur Supabase (`muxrjvxgpdnngacwovez`)
Dans votre tableau de bord Supabase (`https://supabase.com/dashboard`) :
1. **Project Settings → API :**
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://muxrjvxgpdnngacwovez.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = clé `anon` / `public`
   - `SUPABASE_SERVICE_ROLE_KEY` = clé `service_role` *(secrète, serveur uniquement)*
2. **Connect (en haut de page) → Session Pooler (port `5432`) :**
   - `DATABASE_URL` = URI de connexion de votre base Supabase *(Supabase utilise PostgreSQL dans le cloud — rien à installer sur votre PC)*.

## 2. Initialiser les tables, données et fichiers privés sur Supabase
Une fois ces 4 valeurs renseignées dans `.env` :
```powershell
npx prisma migrate deploy
npx prisma db seed
npx tsx scripts/upload-private-to-supabase.ts
```
- `prisma migrate deploy` crée toutes les tables dans votre projet Supabase.
- `prisma db seed` insère les 16 catégories, 32 produits de démo, comptes (`admin@nexusarcanum.shop` / `NexusAdmin2026!`) et passerelles de paiement.
- `upload-private-to-supabase.ts` crée le bucket privé `private-assets` sur Supabase Storage et y téléverse les 32 fichiers protégés (indispensable pour Vercel).

## 3. Déployer sur Vercel
1. Pousser le projet sur un dépôt **GitHub** (le fichier `.env` est ignoré par `.gitignore`).
2. Sur **https://vercel.com/new**, importer le dépôt GitHub.
3. Dans **Environment Variables** sur Vercel, ajouter :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_PRIVATE_BUCKET` = `private-assets`
   - `DATABASE_URL` (URI Session Pooler Supabase)
   - `JWT_SECRET` (clé aléatoire 32+ caractères)
   - `PAYMENT_ENCRYPTION_KEY` (clé hex 64 caractères)
   - `DOWNLOAD_SIGNING_SECRET` (clé aléatoire 32+ caractères)
   - `NEXT_PUBLIC_APP_URL` (votre URL Vercel, ex. `https://nexusarcanum-shop.vercel.app`)
4. Cliquer sur **Deploy** (le fichier `vercel.json` exécute automatiquement `npx prisma generate && npx next build`).
