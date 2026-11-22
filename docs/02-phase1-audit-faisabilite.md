# PHASE 1 — AUDIT ET FAISABILITÉ

**Projet :** NEXUSARCANUM SHOP  
**Statut :** Validé  

---

## 1. Audit fonctionnel du cahier des charges
- **Positionnement :** Grande librairie numérique généraliste (Bénin, Afrique, International).
- **Exclusivité numérique :** Aucun produit physique, aucun stock physique, aucune livraison physique.
- **Catalogue :** 16 catégories principales + sous-catégories illimitées + capacité d'accueil de plusieurs milliers de références.
- **Catalogue de démonstration :** 32 produits (2 par catégorie), avec couverture, fiche complète, extrait PDF 3–5 pages, fichier complet téléchargeable, mention obligatoire `« PRODUIT DE DÉMONSTRATION — CONTENU NON COMMERCIAL »`, prix fictifs en FCFA, aucun paiement réel déclenché.
- **Langues :** Français (principal), Anglais (secondaire).
- **Devise :** FCFA (XOF) principale.
- **Paiements :** Module central indépendant `Payment Gateway Manager` supportant 3 modes (A : unique, B : choix client, C : routage intelligent pays/devise/opérateur/frais/disponibilité) et connecteurs interchangeables (Maketou Pay, SaaSPay, SebPay, Geneci.ci, autres).

---

## 2. Audit technique de l'environnement
- **Runtime :** Node.js `v22.14.0`, pnpm `11.11.0`, npm `10.9.2`.
- **Langage & Outils :** TypeScript, Next.js (App Router), Tailwind CSS, Python `3.13.2`, Git `2.52.0`.
- **Base de données cible :** PostgreSQL.
  - *Constat local :* `psql` et `docker` ne sont pas installés sur la machine de développement.
  - *Décision :* Schéma Prisma configuré pour `postgresql`, migrations SQL standard générées et prêtes, et utilisation de PostgreSQL local via `prisma dev` (si supporté) ou instance PostgreSQL dédiée dès connexion.

---

## 3. Audit des passerelles de paiement
| Agrégateur | Statut documentaire | Faisabilité | Notes techniques |
|---|---|---|---|
| **Maketou Pay** | Documenté (`docs-api.maketou.com`) | Haute | Bearer API Key, `POST /api/v1/stores/cart/checkout`, `GET /api/v1/stores/cart/{cartId}`, webhooks (`completed`, `payment_failed`, `abandoned`). |
| **SebPay** | Documenté (`sebpay.africa` / `sebpay.bj`) | Haute | Basé à Cotonou (Bénin), REST Pay-in/Payout, Mobile Money (MTN, Moov, Celtiis), cartes, webhooks, sandbox. |
| **SaaSPay** | Partiellement vérifié (`SasPay.me` vs `SasaPay`) | Moyenne | Connecteur implémentable via l'interface standard dès confirmation du fournisseur exact et de ses clés sandbox. |
| **Geneci.ci** | Aucune API publique trouvée | En attente doc | Ne pas inventer d'API. Interface `IPaymentGateway` prête ; adaptateur bloqué jusqu'à réception de la documentation officielle. |

