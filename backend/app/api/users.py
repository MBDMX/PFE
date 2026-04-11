from typing import List, Optional
from fastapi import APIRouter, Depends
from prisma import Prisma
from app.db.session import get_db
from app.api.deps import role_required, get_current_user
from app.schemas.schemas import UserOut, WorkSession as WorkSessionSchema

router = APIRouter(tags=["users"])

@router.get("/technicians", response_model=List[UserOut])
async def get_technicians(db: Prisma = Depends(get_db)):
    """Returns all technicians for general use."""
    return await db.user.find_many(where={'role': "technician"})

@router.get("/technician/timer/active", response_model=Optional[WorkSessionSchema])
async def get_global_active_timer(db: Prisma = Depends(get_db), current_user = Depends(get_current_user)):
    """Finds if the current technician has ANY active timer session."""
    return await db.worksession.find_first(where={"technician_id": current_user.id, "end_time": None})

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
