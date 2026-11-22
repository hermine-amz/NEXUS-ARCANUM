# PHASE 18 — RAPPORT COMPARATIF CHARIOW VS HOSTINGER

**Projet :** NEXUSARCANUM SHOP  
**Objectif :** Choisir l'hébergement définitif pour une application indépendante Next.js + PostgreSQL + Stockage privé + Payment Gateway Manager.

---

## Tableau comparatif (10 critères du cahier des charges)

| Critère | Chariow | Hostinger (VPS KVM) |
|---|---|---|
| **1. Compatibilité applications personnalisées** | **Non** (plateforme SaaS fermée de création de boutique clé en main) | **Oui (100 %)** — contrôle total Node.js / Next.js |
| **2. Backend sur mesure (API Routes)** | **Non** | **Oui** — exécution complète des API Routes & webhooks |
| **3. PostgreSQL** | **Non** (base interne propriétaire) | **Oui** — PostgreSQL dédié + migrations Prisma |
| **4. Stockage privé sécurisé** | Géré uniquement dans leur SaaS | **Oui** — `storage/private/` ou S3-compatible hors accès public |
| **5. API & Payment Gateway Manager** | **Non** (paiements gérés uniquement par Chariow) | **Oui** — Maketou, SebPay, SaaSPay, Geneci.ci interchangeables |
| **6. Sécurité** | Gérée par le SaaS | Contrôle complet HTTPS (Let's Encrypt), pare-feu, AES-256-GCM |
| **7. Performances** | Dépend du SaaS | Ressources dédiées (CPU/RAM NVMe) + cache Next.js |
| **8. Sauvegardes** | Export limité | Snapshots VPS + `pg_dump` automatisé quotidien |
| **9. Coûts** | Commissions sur chaque vente | Coût mensuel fixe prévisible (à partir d'un VPS KVM 2) |
| **10. Évolutivité** | Limitée au modèle Chariow | Illimitée (milliers de références, microservices, CDN) |

---

## Recommandation
**Hostinger (VPS KVM)** est **indispensable et seul compatible** avec une application indépendante **Next.js + TypeScript + PostgreSQL + Payment Gateway Manager multi-agrégateurs**. Chariow est une solution SaaS fermée qui ne permet pas d'héberger du code Next.js personnalisé ni de piloter vos propres connecteurs de paiement.

