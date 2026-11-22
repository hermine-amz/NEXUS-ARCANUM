# PHASE 5 — DESIGN SYSTEM ET IDENTITÉ VISUELLE

**Projet :** NEXUSARCANUM SHOP  
**Statut :** Validé  

---

## 1. Identité visuelle originale
**NEXUSARCANUM SHOP** adopte une esthétique éditoriale moderne, raffinée et haut de gamme, évoquant le prestige d'une grande librairie numérique internationale :
- **Logo :** Monogramme géométrique stylisé (livre ouvert + compas / étoile d'orientation) accompagné de la typographie `NEXUSARCANUM` (serif noble) et `SHOP` (sans-serif espacé doré).

## 2. Palette de couleurs
| Rôle | Token | Valeur Hex | Usage |
|---|---|---|---|
| **Bleu nuit profond** | `navy-950` | `#070C1B` | En-tête, pied de page, bannières héro, fond sombre |
| **Bleu nuit primaire** | `navy-900` | `#0B132B` | Titres principaux, boutons secondaires, navigation |
| **Bleu nuit moyen** | `navy-800` | `#1C2541` | Survols sombres, cartes mises en avant |
| **Or impérial** | `gold-500` | `#D4AF37` | Boutons d'action principaux (CTA), accents, étoiles |
| **Or doux** | `gold-600` | `#B8901F` | Survol des boutons or, bordures actives |
| **Or pâle** | `gold-50` | `#FBF7E8` | Badges premium, encarts d'information |
| **Blanc pur** | `white` | `#FFFFFF` | Cartes produits, modales, fonds principaux |
| **Gris clair** | `slate-50` / `slate-100` | `#F8FAFC` / `#F1F5F9` | Arrière-plans de sections alternées |
| **Bordure subtile** | `slate-200` | `#E2E8F0` | Séparateurs, contours de cartes et champs |
| **Texte principal** | `slate-900` | `#0F172A` | Corps de texte haute lisibilité |
| **Texte secondaire** | `slate-600` | `#475569` | Sous-titres, métadonnées, descriptions |

## 3. Système typographique
- **Titres (`font-serif`) :** `Playfair Display` (graisses 600, 700) — confère un caractère littéraire et prestigieux.
- **Interface & Corps (`font-sans`) :** `Plus Jakarta Sans` / `Inter` (graisses 400, 500, 600, 700) — lisibilité optimale sur mobile et desktop, chiffres tabulaires pour les prix en `FCFA`.

## 4. Composants du Design System
- **Boutons :** `Primary` (Or `#D4AF37` sur texte Bleu Nuit `#070C1B`), `Secondary` (Bleu Nuit `#0B132B` sur texte Blanc), `Outline` (bordure `#CBD5E1`), `Ghost`. Taille tactile minimale `44px` sur mobile.
- **Cartes produits :** Ratio couverture `3:4`, badge de format (`PDF`, `EPUB`, `AUDIO`, `PACK`), badge `DÉMO` obligatoire sur les 32 produits initiaux, titre (2 lignes max), auteur, note moyenne, prix en `FCFA` (ou prix barré si promo), actions rapides (`Extrait gratuit`, `Ajouter au panier`).
- **États d'interface :**
  - *Chargement :* Skeletons animés aux proportions exactes des cartes.
  - *États vides :* Illustration vectorielle + message explicite + bouton de réinitialisation.
  - *Confirmations & Erreurs :* Bannières accessibles (`role="alert"`, `aria-live="polite"`) et modales de confirmation avec focus piégé (focus trap).

