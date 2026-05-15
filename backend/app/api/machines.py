from typing import List
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from prisma import Prisma
from app.db.session import get_db
from app.api.deps import role_required
from app.schemas.schemas import Machine as MachineSchema, UserOut as UserSchema, WorkOrder as WorkOrderSchema
from app.sap.client import sap_client

router = APIRouter(prefix="/machines", tags=["machines"])


# ---------------------------------------------------------------------------
# SAP → Local DB SYNC
# Maps ProcessForce MaintainableItem fields to the local Machine schema:
#   Code       → reference
#   Name       → name
#   U_MIType   → location  (Location / Machine / Tool)
#   U_MIStatus → status    (AwaitingPurchase → operational, etc.)
# ---------------------------------------------------------------------------
SAP_STATUS_MAP = {
    "AwaitingPurchase": "operational",
    "Active":           "operational",
    "Inactive":         "maintenance",
    "Breakdown":        "breakdown",
    "UnderRepair":      "maintenance",
}

@router.post("/sync-from-sap", tags=["SAP Integration"])
async def sync_machines_from_sap(
    db: Prisma = Depends(get_db)
):
    """
    Fetches all MaintainableItems from SAP ProcessForce (CompuTec AppEngine)
    and upserts them into the local Machine table.
    Returns a summary of created / updated records.
    """
    # Login to AppEngine
    if not sap_client.login_pf():
        raise HTTPException(status_code=503, detail="Impossible de se connecter à SAP ProcessForce")

    sap_items = sap_client.get_maintainable_items(top=500)
    if not isinstance(sap_items, list):
        raise HTTPException(status_code=502, detail="Réponse SAP invalide")

    created_machines = 0
    updated_machines = 0
    created_parts = 0
    updated_parts = 0

    for item in sap_items:
        code   = item.get("Code", "")
        name   = item.get("Name", code)
        mi_type   = item.get("U_MIType", "")
        mi_status = item.get("U_MIStatus", "Active")
        if len(code) > 11:
            stock_existing = await db.stock.find_first(where={"reference": code})
            if stock_existing:
                await db.stock.update(
                    where={"id": stock_existing.id},
                    data={"name": name, "location": mi_type or "Magasin Principal"}
                )
                updated_parts += 1
            else:
                await db.stock.create(data={
                    "reference": code,
                    "name": name,
                    "location": mi_type or "Magasin Principal",
                    "quantity": 0,
                    "unit": "Unité",
                    "unit_price": 0.0,
                })
                created_parts += 1
            continue

        local_status = SAP_STATUS_MAP.get(mi_status, "operational")

        # Use Code as unique reference to detect existing records
        existing = await db.machine.find_first(where={"reference": code})

        if existing:
            await db.machine.update(
                where={"id": existing.id},
                data={
                    "name":     name,
                    "location": mi_type,
                    "status":   local_status,
                }
            )
            updated_machines += 1
        else:
            await db.machine.create(data={
                "reference":    code,
                "name":         name,
                "location":     mi_type,
                "status":       local_status,
                "health_score": 100,   # Default until real sensor data
                "maintenance_frequency_days": 45,
            })
            created_machines += 1

    return {
        "success": True,
        "total_sap":  len(sap_items),
        "created_machines": created_machines,
        "updated_machines": updated_machines,
        "created_parts": created_parts,
        "updated_parts": updated_parts,
        "message": f"{created_machines} machines / {created_parts} pièces importées. {updated_machines} machines / {updated_parts} pièces mises à jour depuis SAP."
    }

@router.get("", response_model=List[MachineSchema])
async def get_machines(db: Prisma = Depends(get_db)):
    return await db.machine.find_many()

@router.get("/{machine_id}/maintenance-status")
async def get_machine_maintenance_status(machine_id: int, db: Prisma = Depends(get_db)):
    machine = await db.machine.find_unique(where={'id': machine_id})
    if not machine:
        raise HTTPException(status_code=404, detail="Machine introuvable")
    
    # Logic for maintenance status calculation
    today = date.today()
    next_m = date.fromisoformat(machine.next_maintenance_date) if machine.next_maintenance_date else today
    days_remaining = (next_m - today).days
    
    return {
        "machine_id": machine_id,
        "last_maintenance": machine.last_maintenance_date,
        "next_maintenance": machine.next_maintenance_date,
        "days_remaining": days_remaining,
    }

@router.post("/{machine_id}/trigger-maintenance")
async def trigger_preventive_maintenance(
    machine_id: int, 
    db: Prisma = Depends(get_db),
    current_user = Depends(role_required(["admin", "manager", "technician"]))
):
    machine = await db.machine.find_unique(where={'id': machine_id})
    if not machine:
        raise HTTPException(status_code=404, detail="Machine introuvable")
    
    today = date.today()
    freq = machine.maintenance_frequency_days or 90
    next_m = today + timedelta(days=freq)
    
    await db.machine.update(
        where={"id": machine_id},
        data={
            "last_maintenance_date": today.isoformat(),
            "next_maintenance_date": next_m.isoformat()
        }
    )
    
    # Auto-generate a preventive Work Order and SYNC to SAP
    today_str = today.isoformat()
    title = f"Maintenance Préventive - {machine.name}"
    
    # 1. Create in SAP first to get a DocEntry/ID if possible
    sap_res = {}
    try:
        sap_res = sap_client.create_maintenance_order({
            "title": title,
            "equipment_id": machine.reference, # SAP needs the reference Code, not the local ID
            "type": "preventive"
        })
    except Exception as e:
        print(f"⚠️ SAP Sync failed during trigger: {e}")

    sap_id = sap_res.get("DocEntry") or sap_res.get("U_MONumber") or f"PM-LOC-{machine.id}"

    # 2. Create local WorkOrder
    await db.workorder.create(
        data={
            "sap_order_id": str(sap_id),
            "title": title,
            "type": "preventive",
            "priority": "medium",
            "status": "open",
            "equipment_id": str(machine_id),
            "planned_start_date": next_m.isoformat(), # On ajoute la date ici !
            "description": f"Intervention préventive automatique générée le {today_str}"
        }
    )
    
    return {
        "status": "success", 
        "message": "Maintenance préventive déclenchée et synchronisée avec SAP.",
        "sap_order_id": sap_id
    }

@router.get("/{machine_id}/work-orders", response_model=List[WorkOrderSchema])
async def get_machine_work_orders(machine_id: int, db: Prisma = Depends(get_db)):
    """Returns all work orders for a specific machine."""
    # Convert machine_id to string since equipment_id is a String in schema
    return await db.workorder.find_many(
        where={"equipment_id": str(machine_id)}, 
        order={'created_at': 'desc'},
        include={"parts": True} # On inclut les pièces pour le calcul des coûts
    )

@router.get("/{machine_id}/financials")
async def get_machine_financials(machine_id: int, db: Prisma = Depends(get_db)):
    """Calcule le coût total de maintenance (pièces) pour une machine."""
    work_orders = await db.workorder.find_many(
        where={"equipment_id": str(machine_id)},
        include={"parts": True}
    )
    
    total_cost = 0.0
    parts_count = 0
    
    for wo in work_orders:
        for p in wo.parts:
            cost = (p.quantity or 0) * (p.unit_price_at_consumption or 0.0)
            total_cost += cost
            parts_count += p.quantity

    return {
        "machine_id": machine_id,
        "total_maintenance_cost": round(total_cost, 3),
        "total_parts_used": parts_count,
        "currency": "TND",
        "last_updated": date.today().isoformat()
    }
