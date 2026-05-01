from fastapi import APIRouter, Depends, HTTPException
from app.core.ml_service import ml_service
from app.db.session import get_db
from prisma import Prisma
from typing import List, Dict

router = APIRouter(prefix="/predictive", tags=["Predictive Maintenance"])

@router.get("/machine-health")
async def get_machines_health_ml(db: Prisma = Depends(get_db)):
    """
    Renvoie les scores de santé calculés par le modèle Isolation Forest
    en analysant l'historique réel des OT.
    """
    try:
        health_data = await ml_service.predict_health_scores(db)
        
        # Statistiques globales pour le dashboard
        total_machines = len(health_data)
        high_risk = len([m for m in health_data if m['risk'] == 'High'])
        
        return {
            "status": "success",
            "summary": {
                "total_monitored": total_machines,
                "at_high_risk": high_risk,
                "average_fleet_health": int(sum(m['score'] for m in health_data) / total_machines) if total_machines > 0 else 100
            },
            "data": health_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/alerts")
async def get_predictive_alerts(db: Prisma = Depends(get_db)):
    """
    Génère des alertes prédictives basées sur les anomalies détectées.
    """
    health_data = await ml_service.predict_health_scores(db)
    alerts = []
    
    for machine in health_data:
        if machine['risk'] == 'High':
            alerts.append({
                "machine_id": machine['id'],
                "machine_name": machine['name'],
                "severity": "CRITICAL",
                "message": f"Anomalie détectée sur {machine['name']}. Risque de panne élevé (Score: {machine['score']}%).",
                "type": "PREDICTIVE"
            })
            
    return {"status": "success", "alerts": alerts}
