# 🚀 Roadmap de Soutenance PFE - GMAO

## 📋 État des Lieux & Feedback
| Critère | Note Actuelle | Points d'Attention |
| :--- | :---: | :--- |
| **Innovation (IA/ML)** | 14/20 | Renforcer l'Anomaly Detection, résoudre la polysémie des images. |
| **UX/UI (Design)** | 15/20 | Éliminer les "placeholders" vides dans le stock. |
| **Intégration SAP** | En cours | Lier la logistique, les achats et les KPIs en temps réel. |

---

## 🎯 Plan d'Action : Innovation IA/ML (Objectif 18+/20)

### 1. Résolution de la polysémie des images (Le problème "Militaire")
*   **Problème** : Certaines références techniques renvoient des images de matériel militaire ou hors-sujet.
*   **Solution Planifiée** : 
    *   **Filtrage par IA (CLIP/Zero-shot)** : Utiliser un petit modèle de classification pour vérifier si l'image téléchargée contient bien des "industrial parts" ou "machinery" avant de la valider.
    *   **Prompt Engineering Dynamique** : Injecter systématiquement la catégorie (ex: "Hydraulique", "Électrique") dans la requête SerpApi pour contextualiser la recherche.

### 2. Renforcement de l'Anomaly Detection
*   **Problème** : L'Isolation Forest est basique et manque de données d'entraînement.
*   **Solution Planifiée** :
    *   **Modèle Prédictif (RUL)** : Passer d'une simple détection d'anomalie à une estimation du "Remaining Useful Life" (Durée de vie restante) en simulant des cycles de dégradation.
    *   **Données Synthétiques** : Générer un dataset plus riche basé sur des lois de fiabilité (Weibull) pour rendre le dashboard IA plus crédible aux yeux du jury.

---

## 🎨 Plan d'Action : UX/UI & "Zero-Empty-State"

### 1. Suppression des Placeholders Vides
*   **Stratégie** : 
    *   **Sync Massive** : Lancer le script SerpApi sur les 202 pièces.
    *   **Génération par IA (Fallback)** : Si une pièce est vraiment introuvable, utiliser un modèle de génération d'images (type Stable Diffusion ou DALL-E) pour créer une illustration "propre" sur fond blanc.
    *   **SVG Typés** : Créer une bibliothèque d'icônes SVG premium par catégorie pour les pièces sans photo réelle.

---

## 🔗 Plan d'Action : Intégration SAP B1

### 1. Cycle Logistique (Service Layer)
*   Implémenter `InventoryGenExits` pour la consommation automatique lors de la clôture des OTs.
*   Implémenter le bouton "Valider Réception" pour les entrées en stock.

### 2. KPIs Dynamiques
*   **MTTR (Mean Time To Repair)** : Calculé dynamiquement entre la date de création de l'alerte et la fin de l'OT dans SAP.
*   **Late WOs** : Alerte visuelle si la date actuelle > `DocDueDate` de SAP.
