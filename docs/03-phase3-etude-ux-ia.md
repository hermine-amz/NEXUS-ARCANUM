# PHASE 3 — ÉTUDE UX ET ARCHITECTURE DE L'INFORMATION

**Projet :** NEXUSARCANUM SHOP  
**Statut :** Validé  

---

## 1. Utilisateurs cibles (Personas)
1. **Lecteur / Étudiant / Chercheur (Afrique & Diaspora) :** Recherche des ouvrages académiques, guides pratiques, livres spirituels ou techniques accessibles immédiatement en FCFA via Mobile Money.
2. **Professionnel / Entrepreneur :** Achète des manuels business, finance, IA, agroalimentaire ou gestion avec facture/reçu et accès rapide sur mobile et ordinateur.
3. **Visiteur curieux :** Souhaite feuilleter un extrait gratuit (3 à 5 pages PDF) sans inscription obligatoire avant de décider d'acheter.
4. **Administrateur / Éditeur :** Gère le catalogue (ajout unitaire et import massif CSV/Excel), les couvertures, les prix, les promotions, les commandes, les agrégateurs de paiement et les statistiques.

---

## 2. Besoins des lecteurs
- Trouver un livre en moins de 3 clics (recherche globale instantanée + navigation par 16 catégories).
- Évaluer la qualité avant achat (couverture nette, sommaire détaillé, nombre de pages, format, langue, extrait PDF gratuit en un clic).
- Payer simplement dans sa devise (FCFA) avec son moyen habituel (Mobile Money / Carte) sans étapes superflues.
- Retrouver tous ses achats à vie dans une **Bibliothèque numérique personnelle** avec téléchargement sécurisé.

---

## 3. Arborescence complète (Sitemap)
- `/` : Page d'accueil éditoriale (Bannière, Catégories, Nouveautés, Meilleures ventes, Collections, Recommandés, Promotions, Gratuits, Auteurs, Avis, Newsletter).
- `/catalogue` : Catalogue complet filtrable (catégorie, sous-catégorie, format, langue, prix, gratuit/payant, tri).
- `/categories/[slug]` : Page dédiée d'une des 16 catégories et ses sous-catégories.
- `/produit/[slug]` : Fiche commerciale complète (extrait gratuit, sommaire, avis, produits similaires, Ajouter au panier, Acheter maintenant).
- `/panier` : Panier dynamique (coupons, promotions, récapitulatif, 0 frais de livraison).
- `/commande` : Tunnel de commande & sélection de paiement (Modes A/B/C du Payment Gateway Manager) + page de confirmation/retour `/commande/[reference]`.
- `/connexion` & `/inscription` : Authentification sécurisée.
- `/compte` : Espace client (Profil, Historique des achats, Reçus/Factures, Favoris, Avis, Assistance, Mot de passe).
- `/compte/bibliotheque` : Bibliothèque numérique personnelle et téléchargements protégés.
- `/admin` : Tableau de bord privé (Statistiques, Livres, Auteurs, Éditeurs, Catégories, Commandes, Paiements, Agrégateurs `ADMINISTRATION > PARAMÈTRES > GESTION DES PAIEMENTS`, Clients, Promotions, Avis, Bannières, Pages, Paramètres, Administrateurs, Import massif, Journal des opérations).
- `/pages/[slug]` : Pages légales (CGU/CGV, Confidentialité, Droits d'auteur, Licences numériques, Politique de remboursement).

---

## 4. Organisation des menus
- **En-tête Desktop :** Logo `NEXUSARCANUM SHOP` | Barre de recherche centrale | Liens rapides (`Catégories`, `Nouveautés`, `Meilleures ventes`, `Promotions`, `Gratuits`) | Sélecteur `FR / EN` | `Bibliothèque` | `Compte` | `Panier (badge)`.
- **Navigation Mobile :** Barre supérieure compacte (Menu drawer + Logo + Recherche + Panier) + barre d'accès rapide tactile en bas (`Accueil`, `Catégories`, `Recherche`, `Bibliothèque`, `Compte`).

