from typing import List, Optional
from datetime import date, datetime, timedelta
from collections import defaultdict
from fastapi import APIRouter, Depends
from prisma import Prisma
from app.db.session import get_db
from app.schemas.schemas import Stats as StatsSchema, ManagerStats

router = APIRouter(tags=["stats"])

@router.get("/stats", response_model=StatsSchema)
async def get_stats(db: Prisma = Depends(get_db)):
    return {
        "totalMachines": await db.machine.count(),
        "operational": await db.machine.count(where={"status": "operational"}),
        "openOrders": await db.workorder.count(where={"status": {"not": "done"}}),
        "lowStock": await db.stock.count(where={"quantity": {"lte": 5}}),
        "totalTechnicians": await db.user.count(where={"role": "technician"}),
    }

@router.get("/manager-stats", response_model=ManagerStats)
async def get_manager_stats(db: Prisma = Depends(get_db)):
    today_date = date.today()
    warning_date = (today_date + timedelta(days=7)).isoformat()
    today = today_date.isoformat()
    
    all_wos = await db.workorder.find_many()
    done_statuses = {"done", "closed"}
    active_wos = [o for o in all_wos if o.status not in done_statuses]

    total = len(all_wos)
    open_ot = sum(1 for o in all_wos if o.status == "open")
    in_progress = sum(1 for o in all_wos if o.status == "in_progress")
    done = sum(1 for o in all_wos if o.status in done_statuses)
    overdue = sum(1 for o in active_wos if o.planned_end_date and o.planned_end_date < today)
    critical = sum(1 for o in active_wos if o.priority == "critical")
    
    low_stock = await db.stock.count(where={"quantity": {"lte": 5}})
    machines = await db.machine.find_many()
    avg_health = 0
    if machines:
        avg_health = round(sum(m.health_score or 0 for m in machines) / len(machines))
    
    res_rate = round((done / total) * 100) if total > 0 else 0
    due_maint = sum(1 for m in machines if m.next_maintenance_date and m.next_maintenance_date <= warning_date)
    
    return {
        "totalOT": total, "openOT": open_ot, "inProgressOT": in_progress, 
        "doneOT": done, "overdueOT": overdue, "criticalOT": critical,
        "lowStock": low_stock, "avgMachineHealth": avg_health,
        "resolutionRate": res_rate, "dueMaintenance": due_maint
    }

@router.get("/kpi-reliability")
async def get_reliability_kpis(db: Prisma = Depends(get_db)):
    corrective_types = {"corrective", "breakdown"}
    done_statuses = {"done", "closed"}
    
    all_wos = await db.workorder.find_many(order={"id": "desc"})
    corrective_wos = [w for w in all_wos if w.type and w.type.lower() in corrective_types]
    closed_corrective = [w for w in corrective_wos if w.status and w.status.lower() in done_statuses]
    
    # MTTR
    repair_times = []
    for wo in closed_corrective:
        if wo.time_spent and wo.time_spent > 0:
            repair_times.append(wo.time_spent)
        elif wo.planned_start_date and wo.planned_end_date:
            try:
                start, end = datetime.fromisoformat(wo.planned_start_date), datetime.fromisoformat(wo.planned_end_date)
                hours = (end - start).total_seconds() / 3600
                if 0 < hours < 720: repair_times.append(hours)
            except: pass

    mttr_hours = round(sum(repair_times) / len(repair_times), 2) if repair_times else 0
    
    # MTBF
    equipment_ots = defaultdict(list)
    for wo in corrective_wos:
        date_str = wo.planned_start_date or wo.actual_start_date
        if wo.equipment_id and date_str:
            try: equipment_ots[wo.equipment_id].append(datetime.fromisoformat(date_str))
            except: pass
    
    all_gaps_days = []
    machine_breakdown = []
    for eq, dates in equipment_ots.items():
        if len(dates) < 2:
            machine_breakdown.append({"equipment_id": eq, "failure_count": len(dates), "mtbf_days": None})
            continue
        sorted_dates = sorted(dates)
        gaps = [(sorted_dates[i+1] - sorted_dates[i]).days for i in range(len(sorted_dates)-1)]
        valid_gaps = [g for g in gaps if g >= 0]
        avg_gap = round(sum(valid_gaps) / len(valid_gaps), 1) if valid_gaps else None
        all_gaps_days.extend(valid_gaps)
        machine_breakdown.append({"equipment_id": eq, "failure_count": len(dates), "mtbf_days": avg_gap})
    
    global_mtbf = round(sum(all_gaps_days) / len(all_gaps_days), 1) if all_gaps_days else None
    
    # Reliability %
    reliability_pct = None
    if global_mtbf is not None:
        mttr_days = mttr_hours / 24
        if (global_mtbf + mttr_days) > 0:
            reliability_pct = round((global_mtbf / (global_mtbf + mttr_days)) * 100, 1)
    
    return {
        "mttr_hours": mttr_hours, "mtbf_days": global_mtbf, "reliability_pct": reliability_pct,
        "total_corrective_ots": len(corrective_wos), "closed_corrective_ots": len(closed_corrective),
        "machine_breakdown": sorted(machine_breakdown, key=lambda x: x["failure_count"], reverse=True)[:10],
    }
