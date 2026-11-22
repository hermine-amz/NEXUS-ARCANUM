# PHASE 4 — WIREFRAMES ET PARCOURS UTILISATEURS (USER FLOWS)

**Projet :** NEXUSARCANUM SHOP  
**Statut :** Validé  

---

## 1. Parcours utilisateurs critiques (User Flows)

### Flux 1 : Visiteur qui découvre un livre
`Accueil` -> Clic sur une catégorie / Nouveauté / Recherche -> `Catalogue` -> Clic sur carte produit -> `Fiche produit` -> Lecture description & sommaire.

### Flux 2 : Visiteur qui recherche un sujet
Barre de recherche globale (header) -> Saisie mot-clé (titre, auteur, thème) -> Résultats instantanés / `/catalogue?q=...` -> Filtrage par format/catégorie/prix.

### Flux 3 : Client qui télécharge un extrait
`Fiche produit` (ou carte produit) -> Clic `Télécharger l'extrait gratuit` -> Téléchargement immédiat du PDF (3–5 pages) sans inscription obligatoire.

### Flux 4 : Client qui achète son premier livre / plusieurs livres
`Fiche produit` -> `Ajouter au panier` (ou `Acheter maintenant`) -> `Panier` (application coupon éventuel) -> `Identification` (connexion/inscription rapide) -> `Validation commande` -> `Payment Gateway Manager` (Mode A/B/C) -> Redirection / Confirmation -> `Bibliothèque personnelle`.

### Flux 5 : Client qui consulte sa bibliothèque
`Header > Bibliothèque` (ou `Compte > Bibliothèque numérique`) -> Liste des ouvrages acquis -> Clic `Télécharger` -> Vérification entitlement + génération jeton temporaire -> Téléchargement sécurisé.

### Flux 6 : Administrateur qui ajoute un livre / gère une commande / modifie un agrégateur
- **Ajout livre :** `/admin/produits` -> Formulaire (ou import CSV/Excel `/admin/import`) -> Upload couverture + extrait + fichier payant privé -> Publication.
- **Gestion commande :** `/admin/commandes` -> Détail référence, statut paiement, agrégateur, journal transactions, accès reçu.
- **Agrégateur :** `/admin/parametres/paiements` -> Activation/désactivation Maketou/SebPay/SaaSPay, définition par défaut, bascule Mode A / B / C, test de connexion.

---

## 2. Wireframes structurels des pages principales

### A. Page d'accueil (Desktop)
```text
+-----------------------------------------------------------------------+
| [LOGO NEXUSARCANUM]  [ Recherche livres, auteurs, thèmes... ]  FR|EN  |
| Accueil | Catégories v | Nouveautés | Top Ventes | Promos | Biblio |Panier(2)|
+-----------------------------------------------------------------------+
| HERO BANNER : "Votre Grande Bibliothèque Numérique"  [Explorer] [Démo]|
| Badge: 100% Numérique • Livraison Instantanée • Paiement FCFA         |
+-----------------------------------------------------------------------+
| LES 16 CATÉGORIES PRINCIPALES (Grille icônes + titres + compteurs)    |
+-----------------------------------------------------------------------+
| NOUVEAUTÉS (Carrousel / Grille 4 colonnes avec cartes produits)       |
+-----------------------------------------------------------------------+
| MEILLEURES VENTES | COLLECTIONS THÉMATIQUES | LIVRES RECOMMANDÉS      |
+-----------------------------------------------------------------------+
| PROMOTIONS | LIVRES & EXTRAITS GRATUITS | AUTEURS À DÉCOUVRIR         |
+-----------------------------------------------------------------------+
| AVIS CLIENTS | NEWSLETTER | FOOTER (Liens légaux, Paiements, Contact) |
+-----------------------------------------------------------------------+
```

### B. Fiche Produit
```text
+-----------------------------------------------------------------------+
| Fil d'Ariane : Accueil > Catégorie > Titre du livre                   |
+---------------------------+-------------------------------------------+
| [ COUVERTURE HD ]         | Titre + Sous-titre                        |
| [ Badge: DÉMO NON COMM. ] | Auteur • Éditeur • Langue • Format • Pages|
|                           | Prix FCFA (ou Promo)                      |
|                           | [ Télécharger l'extrait gratuit (PDF) ]   |
|                           | [ Ajouter au panier ] [ Acheter maint. ]  |
+---------------------------+-------------------------------------------+
| Onglets : Description détaillée | Sommaire | Avis clients             |
+-----------------------------------------------------------------------+
| Produits similaires recommandés (4 cartes)                            |
+-----------------------------------------------------------------------+
```

### C. Administration > Paramètres > Gestion des Paiements
```text
+-----------------------------------------------------------------------+
| Mode actif : ( ) Mode A Unique  (•) Mode B Choix  ( ) Mode C Routage  |
+-----------------------------------------------------------------------+
| Agrégateur  | Statut | Défaut | Mode     | Devises | Actions          |
| Maketou Pay | Actif  | [x]    | Sandbox  | XOF     | Config | Tester  |
| SebPay      | Actif  | [ ]    | Sandbox  | XOF     | Config | Tester  |
| SaaSPay     | Inactif| [ ]    | Sandbox  | XOF     | Config | Tester  |
| Geneci.ci   | En att.| [ ]    | -        | XOF     | Doc requise      |
+-----------------------------------------------------------------------+
```

