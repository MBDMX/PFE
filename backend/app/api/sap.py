from fastapi import APIRouter, HTTPException
from app.sap.client import sap_client

router = APIRouter(prefix="/sap", tags=["SAP Integration"])


@router.get("/status")
async def get_sap_status():
    """Vérifie l'état des deux connexions SAP avec détails."""
    return sap_client.get_connection_status()


@router.get("/items")
async def get_sap_items(top: int = 50):
    """Récupère les articles via Service Layer (Port 50000)."""
    # Ensure we're logged in
    sap_client.login_sl()
    items = sap_client.get_items(top=top)
    return {"count": len(items) if isinstance(items, list) else 0, "data": items}


@router.get("/users")
async def get_sap_users():
    """Récupère les utilisateurs SAP via Service Layer."""
    sap_client.login_sl()
    users = sap_client.get_users()
    return {"count": len(users) if isinstance(users, list) else 0, "data": users}


@router.get("/machines")
async def get_sap_machines():
    """Récupère les machines via ProcessForce (Port 54001).
    
    IMPORTANT: Nécessite que la compagnie soit enregistrée dans le 
    ProcessForce Addon Manager côté SAP.
    """
    machines = sap_client.get_maintainable_items()
    if isinstance(machines, dict) and "error" in machines:
        raise HTTPException(status_code=503, detail=machines["error"])
    return {
        "count": len(machines) if isinstance(machines, list) else 0,
        "source": "ProcessForce Plant Maintenance",
        "data": machines
    }

