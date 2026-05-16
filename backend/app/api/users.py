from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from prisma import Prisma
from app.db.session import get_db
from app.api.deps import role_required, get_current_user
from app.schemas.schemas import UserOut, WorkSession as WorkSessionSchema
from app.core.security import get_password_hash

router = APIRouter(tags=["users"])

@router.get("/technicians", response_model=List[UserOut])
async def get_technicians(db: Prisma = Depends(get_db)):
    """Returns all technicians for general use."""
    return await db.user.find_many(where={'role': "technician"})

@router.get("/technician/timer/active", response_model=Optional[WorkSessionSchema])
async def get_global_active_timer(db: Prisma = Depends(get_db), current_user = Depends(get_current_user)):
    """Finds if the current technician has ANY active timer session and calculates previous time."""
    active = await db.worksession.find_first(
        where={"technician_id": current_user.id, "end_time": None},
        include={"work_order": True}
    )
    if not active:
        return None
    
    # Calculate previous time spent on THIS work order
    previous_sessions = await db.worksession.find_many(
        where={
            "work_order_id": active.work_order_id,
            "end_time": {"not": None}
        }
    )
    total_previous_hours = sum(s.duration for s in previous_sessions)
    
    # Return everything in a custom dict to avoid schema constraints if needed, 
    # but we'll try to keep it compatible.
    res = active.dict()
    res["total_previous_seconds"] = int(total_previous_hours * 3600)
    res["work_order_title"] = active.work_order.title if active.work_order else "Intervention"
    return res

@router.get("/manager/technicians", response_model=List[UserOut])
async def get_manager_technicians(db: Prisma = Depends(get_db), current_user = Depends(role_required(["admin", "manager"]))):
    """Returns technicians for the manager supervision view."""
    return await db.user.find_many(where={'role': "technician"})

@router.get("/manager/technicians/{tech_id}/stats")
async def get_technician_individual_stats(tech_id: int, db: Prisma = Depends(get_db)):
    from datetime import date
    
    wos = await db.workorder.find_many(where={"technician_id": tech_id})
    total = len(wos)
    done = sum(1 for w in wos if w.status == "done")
    open_ot = sum(1 for w in wos if w.status == "open")
    in_progress = sum(1 for w in wos if w.status == "in_progress")
    
    today = date.today().isoformat()
    overdue = sum(1 for w in wos if w.status != "done" and w.planned_end_date and w.planned_end_date < today)
    
    rate = round((done / total) * 100) if total > 0 else 0
    
    # Avg repair time
    repair_times = [w.time_spent for w in wos if w.status == "done" and w.time_spent]
    avg_time = round(sum(repair_times) / len(repair_times), 1) if repair_times else 0
    
    return {
        "totalAssigned": total,
        "doneOT": done,
        "openOT": open_ot,
        "inProgressOT": in_progress,
        "overdueOT": overdue,
        "completionRate": rate,
        "avgRepairTime": avg_time
    }

@router.get("/manager/technicians/{tech_id}/work-orders")
async def get_tech_work_orders(tech_id: int, db: Prisma = Depends(get_db)):
    return await db.workorder.find_many(
        where={"technician_id": tech_id}, 
        include={"parts": True, "steps": True}, 
        order={'created_at': 'desc'}
    )

# ── Admin User Management ──────────────────────────────────────────────────

@router.get("/admin/users")
async def admin_list_users(
    db: Prisma = Depends(get_db),
    _=Depends(role_required(["admin"]))
):
    """List all users in the system (admin only)."""
    users = await db.user.find_many(order={"id": "asc"})
    return [
        {
            "id": u.id,
            "name": u.name or u.username,
            "username": u.username,
            "email": u.email or "",
            "role": u.role,
            "is_active": u.is_active,
            "permissions": u.permissions
        }
        for u in users
    ]

@router.delete("/admin/users/{user_id}")
async def admin_delete_user(
    user_id: int,
    db: Prisma = Depends(get_db),
    current_user=Depends(role_required(["admin"]))
):
    """Delete a user (admin only). Cannot delete yourself."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte.")
    user = await db.user.find_unique(where={"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")
    await db.user.delete(where={"id": user_id})
    return {"ok": True, "deleted_id": user_id}

@router.patch("/admin/users/{user_id}")
async def admin_update_user(
    user_id: int,
    data: dict,
    db: Prisma = Depends(get_db),
    _=Depends(role_required(["admin"]))
):
    """Update user properties (admin only)."""
    update_data = {}
    if "role" in data:
        update_data["role"] = data["role"]
    if "name" in data:
        update_data["name"] = data["name"]
    if "is_active" in data:
        update_data["is_active"] = data["is_active"]
    if "permissions" in data:
        update_data["permissions"] = data["permissions"]
    if "password" in data and data["password"]:
        update_data["password_hash"] = get_password_hash(data["password"])
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour.")
    
    updated = await db.user.update(where={"id": user_id}, data=update_data)
    return {
        "id": updated.id, 
        "name": updated.name, 
        "role": updated.role, 
        "is_active": updated.is_active,
        "permissions": updated.permissions
    }
