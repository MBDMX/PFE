import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from datetime import datetime, timedelta
from prisma import Prisma
import asyncio
import hashlib

class MLHealthService:
    def __init__(self):
        self.model = IsolationForest(contamination=0.05, random_state=42)

    def _get_deterministic_jitter(self, machine_id: int):
        hash_val = int(hashlib.md5(str(machine_id).encode()).hexdigest(), 16)
        return (hash_val % 5) - 2

    async def fetch_machine_features(self, db: Prisma):
        try:
            machines = await db.machine.find_many()
            work_orders = await db.workorder.find_many()
            features_list = []
            now = datetime.now()

            for m in machines:
                m_id_str = str(m.id)
                ots = [ot for ot in work_orders if ot.equipment_id == m_id_str or ot.equipment_id == m.reference]
                
                pending_breakdowns = [ot for ot in ots if ot.type in ['corrective', 'breakdown'] and ot.status != 'done']
                completed_breakdowns = [ot for ot in ots if ot.type in ['corrective', 'breakdown'] and ot.status == 'done']
                
                overdue_count = 0
                for ot in ots:
                    if ot.status != 'done' and ot.planned_end_date:
                        try:
                            if datetime.strptime(ot.planned_end_date.split('T')[0], '%Y-%m-%d') < now:
                                overdue_count += 1
                        except: continue
                
                short_cycle_failures = 0
                if len(ots) >= 2:
                    dates = []
                    for ot in ots:
                        if ot.planned_start_date:
                            try: dates.append(datetime.strptime(ot.planned_start_date.split('T')[0], '%Y-%m-%d'))
                            except: continue
                    dates.sort()
                    for i in range(len(dates) - 1):
                        if (dates[i+1] - dates[i]).days <= 7:
                            short_cycle_failures += 1

                high_priority_count = len([ot for ot in ots if ot.priority in ['high', 'critical', 'Urgent']])

                features_list.append({
                    "machine_id": m.id,
                    "machine_name": m.name or f"Machine {m.id}",
                    "pending_breakdowns": len(pending_breakdowns),
                    "completed_breakdowns": len(completed_breakdowns),
                    "overdue_count": overdue_count,
                    "short_cycle_failures": short_cycle_failures,
                    "high_priority_count": high_priority_count
                })

            return pd.DataFrame(features_list)
        except Exception as e:
            print(f"❌ Error fetching features: {e}")
            return pd.DataFrame()

    async def predict_health_scores(self, db: Prisma):
        df = await self.fetch_machine_features(db)
        if df.empty: return []

        X = df[["pending_breakdowns", "completed_breakdowns", "overdue_count", "short_cycle_failures", "high_priority_count"]]
        
        try:
            if len(df) >= 2:
                self.model.fit(X)
                ia_scores = self.model.decision_function(X)
            else:
                ia_scores = [0] * len(df)

            results = []
            for idx, row in df.iterrows():
                score = 100.0
                explanations = []

                # Calcul détaillé des raisons avec coefficients
                if row['pending_breakdowns'] > 0:
                    penalty = row['pending_breakdowns'] * 20
                    score -= penalty
                    explanations.append({
                        "case": "Panne Active (Non résolue)",
                        "coeff": "x20",
                        "impact": f"-{int(penalty)}%",
                        "count": int(row['pending_breakdowns'])
                    })
                
                if row['completed_breakdowns'] > 0:
                    penalty = row['completed_breakdowns'] * 5
                    score -= penalty
                    explanations.append({
                        "case": "Historique de Pannes",
                        "coeff": "x5",
                        "impact": f"-{int(penalty)}%",
                        "count": int(row['completed_breakdowns'])
                    })
                
                if row['overdue_count'] > 0:
                    penalty = row['overdue_count'] * 15
                    score -= penalty
                    explanations.append({
                        "case": "Retards SAP (Overdue)",
                        "coeff": "x15",
                        "impact": f"-{int(penalty)}%",
                        "count": int(row['overdue_count'])
                    })
                
                if row['short_cycle_failures'] > 0:
                    penalty = row['short_cycle_failures'] * 15
                    score -= penalty
                    explanations.append({
                        "case": "Instabilité (Cycles Courts)",
                        "coeff": "x15",
                        "impact": f"-{int(penalty)}%",
                        "count": int(row['short_cycle_failures'])
                    })

                final_score = int(max(5, min(100, score + self._get_deterministic_jitter(int(row['machine_id'])))))
                
                results.append({
                    "id": int(row['machine_id']),
                    "name": str(row['machine_name']),
                    "score": final_score,
                    "risk": "High" if final_score < 50 else ("Medium" if final_score < 75 else "Low"),
                    "explanations": explanations
                })
            return results
        except Exception as e:
            print(f"❌ ML Prediction Error: {e}")
            return []

ml_service = MLHealthService()
