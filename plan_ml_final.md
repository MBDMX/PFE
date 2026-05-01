# MVP Machine Learning : Machine Health Monitoring

Ce module utilise l'historique des Ordres de Travail (OT) pour prédire l'état de santé des équipements de Boraplast.

## 1. Données Source (PostgreSQL)
Utilisation des données réelles disponibles dans la base de données :
- `WorkOrder.time_spent`
- `WorkOrder.type` (breakdown, corrective, preventive)
- `WorkOrder.planned_start_date`

## 2. Pipeline de Traitement

### A. Feature Engineering (Par machine)
Extraction des indicateurs clés :
- **failure_rate** : Nombre de pannes (breakdown) sur les 30 derniers jours.
- **avg_repair_time** : Moyenne du temps de réparation (`time_spent`).
- **mtbf_days** : Temps moyen entre pannes.
- **overdue_ratio** : Ratio d'OT en retard / total.
- **last_failure_days** : Nombre de jours depuis le dernier breakdown.

### B. Modèle ML (Scikit-Learn)
- **Algorithme** : Isolation Forest.
- **Paramètre** : `contamination = 0.1` (cible les 10% de machines les plus instables).
- **Entraînement** : Basé sur l'historique complet des OT.
- **Sortie** : Score de décision converti en **Health Score (0-100%)**.

## 3. Livraison & Intégration

### API Endpoint (FastAPI)
`GET /api/ml/machine-health`
Retourne :
- `machine_id`, `score` (0-100), `risk_level`, `top_features`, `prediction`.

### Interface Utilisateur (Next.js)
- **Dashboard Manager** : Widget **"Equipment At Risk"**.
- **Page Machines** : Overlay du score de santé.
