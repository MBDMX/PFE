from typing import List
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from prisma import Prisma
from app.db.session import get_db
from app.api.deps import role_required
from app.schemas.schemas import Machine as MachineSchema, UserOut as UserSchema, WorkOrder as WorkOrderSchema

router = APIRouter(prefix="/machines", tags=["machines"])

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
    
    # Auto-generate a preventive Work Order
    last_id = await db.workorder.count() + 1056
    await db.workorder.create(
        data={
            "sap_order_id": f"PM-{last_id}",
            "title": f"Maintenance Préventive - {machine.name}",
            "type": "preventive",
            "priority": "medium",
            "status": "open",
            "equipment_id": machine_id,
            "description": f"Intervention préventive automatique générée le {today.isoformat()}"
        }
    )
    
    return {"status": "success", "message": "Maintenance préventive déclenchée et OT créé."}

@router.get("/{machine_id}/work-orders", response_model=List[WorkOrderSchema])
async def get_machine_work_orders(machine_id: int, db: Prisma = Depends(get_db)):
    """Returns all work orders for a specific machine."""
    # Convert machine_id to string since equipment_id is a String in schema
    return await db.workorder.find_many(where={"equipment_id": str(machine_id)}, order={'created_at': 'desc'})
