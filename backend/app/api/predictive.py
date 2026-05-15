from fastapi import APIRouter, Depends, HTTPException
from app.core.ml_service import ml_service
from app.db.session import get_db
from prisma import Prisma
from datetime import datetime, timedelta

router = APIRouter(prefix="/predictive", tags=["Predictive Maintenance"])


@router.get("/machine-health")
async def get_machines_health_ml(db: Prisma = Depends(get_db)):
    """
    Calcule les scores de santé via le pipeline ML :
    PostgreSQL → Feature Engineering (MTBF/MTTR) → Isolation Forest → Score Hybride
    """
    try:
        health_data = await ml_service.predict_health_scores(db)
        total = len(health_data)
        high_risk = len([m for m in health_data if m['risk'] == 'High'])
        avg = int(sum(m['score'] for m in health_data) / total) if total > 0 else 100

        return {
            "status": "success",
            "summary": {
                "total_monitored": total,
                "at_high_risk": high_risk,
                "average_fleet_health": avg
            },
            "data": health_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/model-stats")
async def get_model_stats():
    """
    Retourne les métriques de validation du modèle Isolation Forest.
    Utile pour justifier scientifiquement les prédictions (rapport PFE).
    - Silhouette Score : qualité de la séparation anomalie/normal (0=aléatoire, 1=parfait)
    - Features : indicateurs de fiabilité utilisés par le modèle
    """
    return {
        "status": "success",
        "model": ml_service.get_model_stats()
    }


@router.get("/health-history/{machine_id}")
async def get_health_history(machine_id: int, db: Prisma = Depends(get_db)):
    """
    Génère l'évolution du score de santé sur les 7 derniers jours.
    Utilise le vrai score ML comme base, ajusté par les événements de chaque jour.
    """
    try:
        work_orders = await db.workorder.find_many(
            where={"equipment_id": str(machine_id)}
        )
        machine = await db.machine.find_unique(where={"id": machine_id})
        if not machine:
            raise HTTPException(status_code=404, detail="Machine introuvable")

        # Obtenir le vrai score ML actuel comme référence de base
        all_health = await ml_service.predict_health_scores(db)
        base_score = next((m['score'] for m in all_health if m['id'] == machine_id), 75)

        now = datetime.now()
        history = []

        for i in range(6, -1, -1):
            day = now - timedelta(days=i)
            day_str = day.strftime('%Y-%m-%d')

            # Compter les pannes actives ce jour-là
            active_breakdowns = []
            for ot in work_orders:
                if ot.type in ['corrective', 'breakdown'] and ot.planned_start_date:
                    try:
                        start = datetime.strptime(ot.planned_start_date.split('T')[0], '%Y-%m-%d')
                        if start <= day and (ot.status != 'done' or (ot.actual_end_date and datetime.strptime(ot.actual_end_date.split('T')[0], '%Y-%m-%d') > day)):
                            active_breakdowns.append(ot)
                    except:
                        continue

            # Le graphique montre le vrai score ML comme référence stable.
            # Variation maximale : ±2pts selon les événements du jour.
            # Si plusieurs pannes actives ce jour-là : légère baisse, sinon stable.
            if len(active_breakdowns) > 1:
                day_score = max(5, base_score - 2)   # légère baisse si pannes multiples
            elif len(active_breakdowns) == 1:
                day_score = max(5, base_score - 1)   # baisse d'1pt
            else:
                day_score = min(100, base_score + 1) # légère hausse si jour calme
            score = int(day_score)

            history.append({
                "date": day_str,
                "score": int(score),
                "label": day.strftime('%d/%m')
            })

        return {
            "status": "success",
            "machine_id": machine_id,
            "machine_name": machine.name,
            "history": history
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts")
async def get_predictive_alerts(db: Prisma = Depends(get_db)):
    """Génère des alertes prédictives pour les machines à risque élevé."""
    health_data = await ml_service.predict_health_scores(db)
    alerts = []

    for m in health_data:
        if m['risk'] == 'High':
            alerts.append({
                "machine_id": m['id'],
                "machine_name": m['name'],
                "severity": "CRITICAL",
                "score": m['score'],
                "message": f"Anomalie critique détectée sur {m['name']} (Score: {m['score']}%). Intervention immédiate recommandée.",
                "type": "PREDICTIVE"
            })

    return {"status": "success", "count": len(alerts), "alerts": alerts}
