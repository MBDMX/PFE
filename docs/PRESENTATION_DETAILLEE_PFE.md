# 📚 Présentation Détaillée : Fonctionnalités GMAO PRO Excellence

Ce document est conçu pour votre soutenance. Il détaille chaque module du projet sous deux angles : la vision stratégique (Théorie) et la réalisation technique (Pratique).

---

## 1. Intégration SAP Business One (CompuTec ProcessForce)
### 📘 Théorie
- **Concept** : Synchronisation bidirectionnelle entre la GMAO et l'ERP de l'usine.
- **Pourquoi ?** Pour éviter les erreurs d'inventaire et garantir que les ordres de travail (OT) sont basés sur des données financières réelles.
- **Avantages** : Intégrité des données, suppression de la paperasse, traçabilité totale.
- **Inconvénients** : Dépendance au réseau local pour la synchronisation initiale.

### 🛠️ Pratique
- **Implémentation** : Client Python utilisant `requests`, authentification JWT, et requêtes OData.
- **Erreurs rencontrées** : 
    - **SSL Error** : Le serveur SAP utilisait des certificats auto-signés. Résolu par `verify=False` et une gestion personnalisée des headers.
    - **Performance** : Trop de données à synchroniser d'un coup. Résolu par un système de **"UPSERT"** (Update if exists, else Insert) et de pagination.

---

## 2. IA Prédictive (Isolation Forest & XAI)
### 📘 Théorie
- **Concept** : Détecter les pannes avant qu'elles n'arrivent en analysant les anomalies statistiques.
- **Pourquoi ?** Passer d'une maintenance coûteuse (réparation après panne) à une maintenance rentable (prévention).
- **Avantages** : Réduction du MTTR, augmentation de la durée de vie des machines.
- **Inconvénients** : Nécessite des données historiques de qualité.

### 🛠️ Pratique
- **Implémentation** : Bibliothèque `scikit-learn`. Calcul du score de santé sur 100 via une pondération (30% IA, 70% Métier).
- **Erreurs rencontrées** : 
    - **Dates Invalides** : Les dates SAP `0001-01-01` faisaient planter les modèles. Résolu par un nettoyage rigoureux (Data Cleaning) en amont.
    - **Biais de score** : L'IA était parfois trop sévère. Résolu par l'ajout d'une couche d'IA explicable (XAI) qui justifie chaque baisse de point.

---

## 3. Authentification Biométrique (Face ID)
### 📘 Théorie
- **Concept** : Reconnaissance faciale pour la connexion au tableau de bord.
- **Pourquoi ?** En milieu industriel, les techniciens ont souvent des gants ou oublient leurs mots de passe.
- **Avantages** : Rapidité, sécurité renforcée (pas de partage de compte).

### 🛠️ Pratique
- **Implémentation** : Extraction des "Embeddings" faciaux via un modèle pré-entraîné et comparaison de similarité cosinus.
- **Erreurs rencontrées** : 
    - **Faux négatifs** : Éclairage trop faible en atelier. Résolu par un traitement d'image (ajustement du contraste) avant l'envoi au modèle.

---

## 4. Recherche Intelligente (Semantic AI Search)
### 📘 Théorie
- **Concept** : Recherche par intention plutôt que par mot-clé exact (ex: chercher "serrer" trouve "clé à molette").
- **Pourquoi ?** Les références SAP sont complexes. Le technicien doit trouver l'outil par sa fonction.

### 🛠️ Pratique
- **Implémentation** : Algorithme de **Fuzzy Matching** combiné à un dictionnaire technique sémantique (`TECHNICAL_KNOWLEDGE`).
- **Erreurs rencontrées** : 
    - **Bruit** : Trop de résultats non pertinents au début. Résolu par la mise en place d'un seuil de pertinence (Score > 35).

---

## 5. Digital Magasinier (QR Scanner & Stock)
### 📘 Théorie
- **Concept** : Gestion des pièces de rechange via scan de QR codes.
- **Pourquoi ?** Zéro erreur de saisie manuelle.

### 🛠️ Pratique
- **Implémentation** : Bibliothèque `react-qr-reader` côté frontend et mise à jour des stocks via API SAP en temps réel.
- **Erreurs rencontrées** : 
    - **Focus Caméra** : Difficulté à scanner des petits codes. Résolu par l'implémentation d'un zoom logiciel et d'un guide visuel à l'écran.

---

## 6. Real-Time Logistics (WebSockets)
### 📘 Théorie
- **Concept** : Notifications instantanées entre techniciens et magasiniers.
- **Pourquoi ?** Éviter les déplacements inutiles en usine pour vérifier la disponibilité d'une pièce.

### 🛠️ Pratique
- **Implémentation** : Protocole `WebSocket` avec FastAPI.
- **Erreurs rencontrées** : 
    - **Coupures réseaux** : Le tunnel se fermait si le technicien changeait de zone. Résolu par un système de **reconnexion automatique (Backoff)**.

---

## 7. Reporting Industriel PDF
### 📘 Théorie
- **Concept** : Génération de documents PDF officiels pour les ordres de travail.
- **Pourquoi ?** Obligation légale et d'audit (ISO).

### 🛠️ Pratique
- **Implémentation** : Moteur de rendu PDF côté backend.
- **Erreurs rencontrées** : 
    - **Mise en page** : Les tableaux débordaient. Résolu par un système de gestion dynamique des lignes et de pagination automatique.

---

## 8. Assistant Interactif (Tour Guide)
### 📘 Théorie
- **Concept** : Tutoriel interactif qui guide l'utilisateur sur l'interface.
- **Pourquoi ?** Réduire le temps de formation des nouveaux employés.

### 🛠️ Pratique
- **Implémentation** : Bibliothèque de gestion de focus contextuel sur le frontend.
- **Erreurs rencontrées** : 
    - **Conflits de clics** : Le guide bloquait parfois l'accès aux boutons. Résolu par une gestion fine du `z-index` et des évènements DOM.

---

## 9. Architecture Offline-First (PWA)
### 📘 Théorie
- **Concept** : L'application fonctionne même sans internet, puis synchronise quand la connexion revient.
- **Pourquoi ?** Les usines sont souvent des zones blanches (blindage métallique).

### 🛠️ Pratique
- **Implémentation** : **Service Workers** et mise en cache des données SAP dans le `LocalStorage`.
- **Erreurs rencontrées** : 
    - **Taille du cache** : Trop de photos de pièces saturaient la mémoire. Résolu par une compression automatique des images côté serveur avant la mise en cache.

---

### 💡 Message de conclusion pour le jury :
"Notre architecture n'est pas seulement un empilement de technologies, c'est une solution robuste qui répond aux contraintes réelles du terrain : le bruit, le manque de réseau, et le besoin de décisions rapides assistées par l'IA."
