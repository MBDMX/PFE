import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score
from datetime import datetime, timedelta
from prisma import Prisma
import hashlib

class MLHealthService:
    """
    Service de maintenance prédictive basé sur Isolation Forest.
    
    Choix de l'algorithme : Isolation Forest (Liu et al., 2008)
    - Complexité O(n log n) vs O(n²) pour SVM → scalable sur grand parc
    - Non supervisé → pas besoin de labelliser "panne / pas panne"
    - Adapté aux anomalies rares (< 10% du parc en panne simultanée)
    - Meilleure interprétabilité via decision_function vs Autoencoders
    
    Pipeline : PostgreSQL → Pandas (Feature Engineering) → Scaler → IF → Score Hybride
    """

    def __init__(self):
        self.model = IsolationForest(
            contamination=0.05,
            n_estimators=100,
            random_state=42
        )
        self.scaler = StandardScaler()
        self.is_trained = False
        self.last_trained_at = None  # datetime or None
        self.training_samples: int = 0
        self.silhouette = None  # float or None
        self.feature_names = [
            "failure_rate_30d",
            "mttr_hours",
            "mtbf_days",
            "overdue_ratio",
            "urgency_rate"
        ]

    # ─────────────────────────────────────────────────────────────
    # Date parsing helper
    # ─────────────────────────────────────────────────────────────

    def _parse_date(self, date_str, min_valid, max_valid):
        """
        Parse robuste de dates SAP (plusieurs formats possibles).
        - ISO:       '2026-05-06T00:00:00' ou '2026-05-06'
        - SAP EU:    '06.05.2026' (format affiché dans ProcessForce)
        - Invalide:  '0001-01-01', '', None  → retourne None
        """
        if not date_str:
            return None
        raw = str(date_str).strip()
        d = None
        for fmt in ('%Y-%m-%d', '%d.%m.%Y', '%Y-%m-%dT%H:%M:%S', '%d/%m/%Y'):
            try:
                d = datetime.strptime(raw.split('T')[0], fmt)
                break
            except ValueError:
                continue
        if d is None:
            return None
        if d < min_valid or d > max_valid:
            return None
        return d

    # ─────────────────────────────────────────────────────────────
    # Feature Engineering helpers
    # ─────────────────────────────────────────────────────────────

    def _compute_mttr(self, ots: list):
        """Mean Time To Repair en heures (basé sur time_spent réel).
        Retourne None si aucune donnée réelle (pour affichage), 0.0 pour le vecteur ML.
        """
        done = [float(o.time_spent) for o in ots if o.time_spent and o.status == 'done']
        if done:
            return round(np.mean(done), 2)
        # Pas de donnée réelle : None pour affichage frontend (pas 0.0)
        return None

    def _compute_mtbf(self, breakdowns: list, now: datetime):
        """
        Mean Time Between Failures en jours.
        Capé à 365j (au-delà = donnée SAP corrompue).
        """
        if len(breakdowns) < 2:
            return None

        min_valid = datetime(2024, 1, 1)
        max_valid = now + timedelta(days=366)

        dates = []
        for ot in breakdowns:
            d = self._parse_date(ot.planned_start_date, min_valid, max_valid)
            if d:
                dates.append(d)

        dates.sort()
        if len(dates) < 2:
            return None

        deltas = [(dates[i+1] - dates[i]).days for i in range(len(dates)-1)]
        avg_delta = float(np.mean(deltas))

        if avg_delta <= 0 or avg_delta > 365:
            return None
        return round(avg_delta, 1)


    def _compute_failure_rate_30d(self, breakdowns: list, now: datetime) -> int:
        """Nombre de pannes sur les 30 derniers jours.
        Supporte les formats date SAP (YYYY-MM-DD et DD.MM.YYYY).
        """
        count = 0
        cutoff = now - timedelta(days=30)
        min_valid = datetime(2020, 1, 1)
        max_valid = now + timedelta(days=1)
        for ot in breakdowns:
            d = self._parse_date(ot.planned_start_date, min_valid, max_valid)
            if d and d >= cutoff:
                count += 1
        return count

    def _compute_overdue_ratio(self, ots: list, now: datetime) -> float:
        """Ratio OT dépassés / total OT."""
        if not ots:
            return 0.0
        overdue = 0
        for ot in ots:
            if ot.status != 'done' and ot.planned_end_date:
                try:
                    end = datetime.strptime(ot.planned_end_date.split('T')[0], '%Y-%m-%d')
                    if end < now:
                        overdue += 1
                except:
                    continue
        return round(overdue / len(ots), 3)

    def _compute_urgency_rate(self, ots: list) -> float:
        """% d'OT en priorité haute ou critique."""
        if not ots:
            return 0.0
        urgent = [o for o in ots if o.priority in ['high', 'critical', 'Urgent']]
        return round(len(urgent) / len(ots), 3)

    # ─────────────────────────────────────────────────────────────
    # Feature Extraction
    # ─────────────────────────────────────────────────────────────

    async def fetch_machine_features(self, db: Prisma) -> pd.DataFrame:
        try:
            machines = await db.machine.find_many()
            work_orders = await db.workorder.find_many()
            now = datetime.now()
            rows = []

            for m in machines:
                m_id_str = str(m.id)
                ots = [o for o in work_orders
                       if o.equipment_id == m_id_str or o.equipment_id == m.reference]
                breakdowns = [o for o in ots if o.type in ['corrective', 'breakdown']]

                rows.append({
                    "machine_id":        m.id,
                    "machine_name":      m.name or f"Machine {m.id}",
                    "failure_rate_30d":  self._compute_failure_rate_30d(breakdowns, now),
                    "mttr_hours":        self._compute_mttr(ots),
                    "mtbf_days":         self._compute_mtbf(breakdowns, now),
                    "overdue_ratio":     self._compute_overdue_ratio(ots, now),
                    "urgency_rate":      self._compute_urgency_rate(ots),
                    "breakdowns":        breakdowns, # Pour l'analyse de fréquence
                    # Contexte pour les explications
                    "pending_breakdowns":   len([o for o in breakdowns if o.status != 'done']),
                    "completed_breakdowns": len([o for o in breakdowns if o.status == 'done']),
                    "total_ots":            len(ots),
                })

            return pd.DataFrame(rows)
        except Exception as e:
            print(f"❌ [ML] Feature extraction error: {e}")
            return pd.DataFrame()

    # ─────────────────────────────────────────────────────────────
    # Training + Validation
    # ─────────────────────────────────────────────────────────────

    def _train(self, X_raw: np.ndarray):
        """Entraîne l'Isolation Forest et calcule le Silhouette Score."""
        X_scaled = self.scaler.fit_transform(X_raw)
        self.model.fit(X_scaled)
        self.is_trained = True
        self.last_trained_at = datetime.now()
        self.training_samples = len(X_raw)

        # Validation : Silhouette Score sur les labels d'anomalie prédits
        labels = self.model.predict(X_scaled)  # -1 = anomalie, 1 = normal
        if len(set(labels)) > 1:
            try:
                self.silhouette = round(silhouette_score(X_scaled, labels), 3)
            except:
                self.silhouette = None
        else:
            self.silhouette = None

        return X_scaled

    # ─────────────────────────────────────────────────────────────
    # Scoring
    # ─────────────────────────────────────────────────────────────

    async def predict_health_scores(self, db: Prisma) -> list:
        df = await self.fetch_machine_features(db)
        if df.empty:
            return []

        # Remplacer None par 0 pour le vecteur ML (None = pas de donnée, neutre pour l'IF)
        X_raw = df[self.feature_names].fillna(0).values

        if len(df) < 3:
            # Pas assez de données pour IF → règles métier seules
            return self._rule_based_scores(df)

        X_scaled = self._train(X_raw)
        anomaly_scores = self.model.decision_function(X_scaled)
        # CRITIQUE : nan/inf → 0.0 (sinon json.dumps() crash avec ValueError)
        anomaly_scores = np.nan_to_num(anomaly_scores, nan=0.0, posinf=0.0, neginf=0.0)

        results = []
        for idx, row in df.iterrows():
            # Calcul de la panne la plus fréquente (BI / Pareto)
            machine_breakdowns = [o for o in row.get('breakdowns', []) if o.failure_cause]
            failure_counts = {}
            for o in machine_breakdowns:
                cause = o.failure_cause
                failure_counts[cause] = failure_counts.get(cause, 0) + 1
            
            most_frequent = max(failure_counts, key=failure_counts.get) if failure_counts else "N/A"
            failure_freq = failure_counts.get(most_frequent, 0) if failure_counts else 0

            # ─── Score Hybride ───
            # 70% règles métier (transparent, défendable)
            rule_score = 100.0
            explanations = []

            if row['pending_breakdowns'] > 0:
                penalty = min(row['pending_breakdowns'] * 20, 60)
                rule_score -= penalty
                explanations.append({
                    "case": "Panne Active (Non résolue)",
                    "metric": f"{int(row['pending_breakdowns'])} OT en cours",
                    "coeff": "×20 pts",
                    "impact": f"-{int(penalty)}%"
                })

            if row['completed_breakdowns'] > 0:
                penalty = min(row['completed_breakdowns'] * 5, 25)
                rule_score -= penalty
                explanations.append({
                    "case": "Historique de Pannes (Clôturées)",
                    "metric": f"{int(row['completed_breakdowns'])} pannes passées",
                    "coeff": "×5 pts",
                    "impact": f"-{int(penalty)}%"
                })

            if row['overdue_ratio'] > 0:
                penalty = round(row['overdue_ratio'] * 30, 1)
                rule_score -= penalty
                explanations.append({
                    "case": "Retards d'Intervention (SAP Overdue)",
                    "metric": f"{int(row['overdue_ratio']*100)}% des OT en retard",
                    "coeff": "×30 pts",
                    "impact": f"-{int(penalty)}%"
                })

            if row['mtbf_days'] < 30 and row['total_ots'] > 1:
                penalty = round((30 - row['mtbf_days']) * 0.8, 1)
                rule_score -= penalty
                explanations.append({
                    "case": "MTBF Court (Instabilité Machine)",
                    "metric": f"MTBF = {row['mtbf_days']}j (norme: 30j)",
                    "coeff": "×0.8 pts/j",
                    "impact": f"-{int(penalty)}%"
                })

            if row['urgency_rate'] > 0.3:
                penalty = round(row['urgency_rate'] * 15, 1)
                rule_score -= penalty
                explanations.append({
                    "case": "Taux d'Urgence Élevé (SAP Priority)",
                    "metric": f"{int(row['urgency_rate']*100)}% d'OT urgents",
                    "coeff": "×15 pts",
                    "impact": f"-{int(penalty)}%"
                })

            rule_score = max(5.0, min(100.0, rule_score))

            # ─── Bonus de Stabilité (MTBF Passif) ───
            # Si la machine n'a PAS eu de panne depuis plus longtemps que son MTBF,
            # elle mérite un bonus de stabilité (jusqu'à +15 pts)
            stability_bonus = 0.0
            if row['mtbf_days'] and row['mtbf_days'] > 0:
                breakdowns_list = row.get('breakdowns', [])
                if breakdowns_list:
                    last_dates = []
                    for ot in breakdowns_list:
                        d = self._parse_date(ot.planned_start_date, datetime(2020,1,1), datetime.now()+timedelta(days=1))
                        if d:
                            last_dates.append(d)
                    if last_dates:
                        last_breakdown_date = max(last_dates)
                        days_since_last = (datetime.now() - last_breakdown_date).days
                        # Bonus progressif : 1 pt par jour au-delà du MTBF, max +15
                        if days_since_last > row['mtbf_days']:
                            extra_days = days_since_last - row['mtbf_days']
                            stability_bonus = min(extra_days * 1.0, 15.0)
                            explanations.append({
                                "case": "Bonus Stabilité (Machine Fiable)",
                                "metric": f"{int(days_since_last)}j sans panne (MTBF: {row['mtbf_days']}j)",
                                "coeff": "×1 pt/j",
                                "impact": f"+{int(stability_bonus)}%"
                            })

            rule_score = max(5.0, min(100.0, rule_score + stability_bonus))

            # 30% score d'anomalie IA (Isolation Forest)
            # Normalisé entre -10 et +10
            ia_adj = float(np.clip(anomaly_scores[idx] * 15, -10, 10))

            final_score = int(np.clip(rule_score * 0.70 + (rule_score + ia_adj) * 0.30, 5, 100))

            if not explanations:
                explanations.append({
                    "case": "Équipement Sain",
                    "metric": "Aucune anomalie détectée",
                    "coeff": "—",
                    "impact": "0%"
                })

            def safe_float(val):
                return float(val) if pd.notna(val) else None

            # ─── Génération du Résumé Textuel (XAI) ───
            summary_parts = []
            if final_score < 50:
                summary_parts.append("État critique détecté.")
            elif final_score < 75:
                summary_parts.append("Vigilance requise.")
            else:
                summary_parts.append("Équipement stable.")

            if row['pending_breakdowns'] > 0:
                summary_parts.append(f"{int(row['pending_breakdowns'])} panne(s) non résolue(s) impactent la disponibilité.")
            if row['overdue_ratio'] > 0.2:
                summary_parts.append("Le retard d'intervention SAP est anormalement élevé.")
            if row['mtbf_days'] and row['mtbf_days'] < 20:
                summary_parts.append("La fréquence des pannes s'accélère (MTBF court).")
            if ia_adj < -5:
                summary_parts.append("L'IA détecte une déviation statistique par rapport au parc.")

            human_summary = " ".join(summary_parts)

            results.append({
                "id": int(row['machine_id']),
                "name": str(row['machine_name']),
                "score": final_score,
                "risk": "High" if final_score < 50 else ("Medium" if final_score < 75 else "Low"),
                "mtbf_days": safe_float(row['mtbf_days']),
                "mttr_hours": safe_float(row['mttr_hours']),
                "most_frequent_failure": most_frequent,
                "failure_frequency": failure_freq,
                "explanations": explanations,
                "ia_contribution": round(ia_adj, 2),
                "human_summary": human_summary
            })

        return results

    def _rule_based_scores(self, df: pd.DataFrame) -> list:
        """Fallback si pas assez de données pour l'IA."""
        def safe_float(val):
            return float(val) if pd.notna(val) else None

        results = []
        for _, row in df.iterrows():
            score = max(5, 100 - int(row['pending_breakdowns']) * 20 - int(row['completed_breakdowns']) * 5)
            results.append({
                "id": int(row['machine_id']),
                "name": str(row['machine_name']),
                "score": score,
                "risk": "High" if score < 50 else ("Medium" if score < 75 else "Low"),
                "mtbf_days": safe_float(row['mtbf_days']),
                "mttr_hours": safe_float(row['mttr_hours']),
                "explanations": [],
                "ia_contribution": 0
            })
        return results

    def get_model_stats(self) -> dict:
        """Retourne les métriques du modèle pour l'API /model-stats."""
        return {
            "algorithm": "Isolation Forest (scikit-learn)",
            "is_trained": self.is_trained,
            "last_trained_at": self.last_trained_at.isoformat() if self.last_trained_at else None,
            "training_samples": self.training_samples,
            "silhouette_score": self.silhouette,
            "contamination": 0.05,
            "n_estimators": 100,
            "features": self.feature_names,
            "why_isolation_forest": (
                "Choisi pour sa complexité O(n log n), son fonctionnement non supervisé "
                "(pas de labels panne/sain requis) et son interprétabilité via decision_function. "
                "Supérieur à SVM (quadratique) et Autoencoder (black-box) pour ce cas d'usage."
            )
        }

ml_service = MLHealthService()
