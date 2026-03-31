from typing import List
from datetime import date
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import Machine, Stock, WorkOrder, User, WorkOrderPart
from app.api.deps import get_current_user, role_required
from app.schemas.schemas import Machine as MachineSchema, Stock as StockSchema, Stats, WorkOrder as WorkOrderSchema, ManagerStats

router = APIRouter()

@router.get("/ping")
def ping():
    return {"ping": "pong"}

@router.get("/machines", response_model=List[MachineSchema])
def get_machines(db: Session = Depends(get_db)):
    return db.query(Machine).all()


@router.get("/stock", response_model=List[StockSchema])
def get_stock(db: Session = Depends(get_db)):
    return db.query(Stock).all()

@router.get("/work-orders", response_model=List[WorkOrderSchema])
def get_work_orders(db: Session = Depends(get_db)):
    # Standard query, SQLAlchemy will handle relationship 'parts' automatically if configured
    return db.query(WorkOrder).all()

@router.get("/work-orders/{wo_id}", response_model=WorkOrderSchema)
def get_work_order(wo_id: int, db: Session = Depends(get_db)):
    order = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
    return order

@router.post("/work-orders", response_model=WorkOrderSchema)
def create_work_order(order_data: dict, db: Session = Depends(get_db)):
    # Generate a fake SAP ID for the V1 Demo (Simulating RPA/SAP sync)
    last_id = db.query(WorkOrder).count() + 1056
    sap_id = f"SAP-WO-{last_id}"
    
    new_wo = WorkOrder(
        sap_order_id=sap_id,
        title=order_data.get("title"),
        description=order_data.get("description"),
        type=order_data.get("type", "corrective"),
        priority=order_data.get("priority", "medium"),
        status="open",
        technical_location=order_data.get("location"),
        equipment_id=order_data.get("equipmentId"),
        team=order_data.get("team"),
        planned_start_date=order_data.get("startDate"),
        planned_end_date=order_data.get("endDate"),
    )
    db.add(new_wo)
    db.commit()
    db.refresh(new_wo)
    return new_wo

@router.get("/stats", response_model=Stats)
def get_stats(db: Session = Depends(get_db)):
    return {
        "totalMachines": db.query(Machine).count(),
        "operational": db.query(Machine).filter(Machine.status == "operational").count(),
        "openOrders": db.query(WorkOrder).filter(WorkOrder.status != "done").count(),
        "lowStock": db.query(Stock).filter(Stock.quantity <= 5).count(),
        "totalTechnicians": db.query(User).filter(User.role == "technician").count(),
    }

@router.get("/manager-stats", response_model=ManagerStats)
def get_manager_stats(db: Session = Depends(get_db)):
    from datetime import timedelta
    today_date = date.today()
    today = today_date.isoformat()
    warning_date = (today_date + timedelta(days=7)).isoformat()
    
    all_wos = db.query(WorkOrder).all()
    done_statuses = {"done", "closed"}
    active_wos = [o for o in all_wos if o.status not in done_statuses]

    total = len(all_wos)
    open_ot = sum(1 for o in all_wos if o.status == "open")
    in_progress = sum(1 for o in all_wos if o.status == "in_progress")
    done = sum(1 for o in all_wos if o.status in done_statuses)
    overdue = sum(
        1 for o in active_wos
        if o.planned_end_date and o.planned_end_date < today
    )
    critical = sum(
        1 for o in active_wos if o.priority == "critical"
    )
    low_stock = db.query(Stock).filter(Stock.quantity <= 5).count()
    machines = db.query(Machine).all()
    avg_health = round(
        sum(m.health_score or 0 for m in machines) / len(machines)
    ) if machines else 0
    resolution_rate = round((done / total) * 100) if total > 0 else 0

    due_maintenance = sum(
        1 for m in machines 
        if m.next_maintenance_date and m.next_maintenance_date <= warning_date
    )

    return {
        "totalOT": total,
        "openOT": open_ot,
        "inProgressOT": in_progress,
        "doneOT": done,
        "overdueOT": overdue,
        "criticalOT": critical,
        "lowStock": low_stock,
        "avgMachineHealth": avg_health,
        "resolutionRate": resolution_rate,
        "dueMaintenance": due_maintenance,
    }

@router.get("/kpi-reliability")
def get_reliability_kpis(db: Session = Depends(get_db)):
    """
    Compute MTBF and MTTR from work order history.
    
    MTTR = Mean Time To Repair
         = Average time_spent (hours) across closed corrective work orders
    
    MTBF = Mean Time Between Failures (per machine, averaged across fleet)
         = Average gap (days) between consecutive corrective OTs on the same equipment
    """
    from datetime import datetime

    corrective_types = {"corrective", "breakdown"}
    done_statuses = {"done", "closed"}
    
    all_wos = db.query(WorkOrder).all()
    corrective_wos = [w for w in all_wos if (w.type or "").lower() in corrective_types]
    closed_corrective = [w for w in corrective_wos if (w.status or "").lower() in done_statuses]
    
    # ── MTTR ─────────────────────────────────────────────────────────────────
    # Use time_spent if available, otherwise estimate from dates
    repair_times = []
    for wo in closed_corrective:
        if wo.time_spent and wo.time_spent > 0:
            repair_times.append(wo.time_spent)
        elif wo.planned_start_date and wo.planned_end_date:
            try:
                start = datetime.fromisoformat(wo.planned_start_date)
                end   = datetime.fromisoformat(wo.planned_end_date)
                hours = (end - start).total_seconds() / 3600
                if 0 < hours < 720:  # sanity cap at 30 days
                    repair_times.append(hours)
            except (ValueError, TypeError):
                pass

    mttr_hours = round(sum(repair_times) / len(repair_times), 2) if repair_times else 0
    
    # ── MTBF ─────────────────────────────────────────────────────────────────
    # Group corrective OTs by equipment_id, sort by start date, compute inter-failure gaps
    from collections import defaultdict
    equipment_ots = defaultdict(list)
    for wo in corrective_wos:
        eq = wo.equipment_id
        date_str = wo.planned_start_date or wo.actual_start_date
        if eq and date_str:
            try:
                dt = datetime.fromisoformat(date_str)
                equipment_ots[eq].append(dt)
            except (ValueError, TypeError):
                pass
    
    all_gaps_days = []
    machine_breakdown = []
    
    for eq, dates in equipment_ots.items():
        if len(dates) < 2:
            machine_breakdown.append({
                "equipment_id": eq,
                "failure_count": len(dates),
                "mtbf_days": None,
            })
            continue
        
        sorted_dates = sorted(dates)
        gaps = [(sorted_dates[i+1] - sorted_dates[i]).days for i in range(len(sorted_dates)-1)]
        valid_gaps = [g for g in gaps if g >= 0]
        avg_gap = round(sum(valid_gaps) / len(valid_gaps), 1) if valid_gaps else None
        all_gaps_days.extend(valid_gaps)
        
        machine_breakdown.append({
            "equipment_id": eq,
            "failure_count": len(dates),
            "mtbf_days": avg_gap,
        })
    
    # Sort by failure count desc for display
    machine_breakdown.sort(key=lambda x: x["failure_count"], reverse=True)
    
    global_mtbf = round(sum(all_gaps_days) / len(all_gaps_days), 1) if all_gaps_days else None
    
    # ── Reliability % ─────────────────────────────────────────────────────────
    # Simple approximation: if MTBF and MTTR are known, reliability = MTBF / (MTBF + MTTR)
    reliability_pct = None
    if global_mtbf and mttr_hours:
        mttr_days = mttr_hours / 24
        reliability_pct = round((global_mtbf / (global_mtbf + mttr_days)) * 100, 1)
    
    return {
        "mttr_hours": mttr_hours,
        "mtbf_days": global_mtbf,
        "reliability_pct": reliability_pct,
        "total_corrective_ots": len(corrective_wos),
        "closed_corrective_ots": len(closed_corrective),
        "machine_breakdown": machine_breakdown[:10],  # top 10 by failure count
    }



@router.post("/stock/order")
def order_stock(
    order_data: dict, 
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(["admin", "manager"]))
):
    item_id = order_data.get("itemId")
    qty = order_data.get("quantity", 1)
    
    item = db.query(Stock).filter(Stock.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Pièce introuvable")
    
    # Simulating order logic: in a real app, this would create a Purchase Order in SAP
    # Here we just log it and maybe increment the quantity for demo
    item.quantity += qty
    db.commit()
    
    return {
        "status": "success", 
        "message": f"Commande de {qty} {item.name} transmise à SAP",
        "sap_po": f"SAP-PO-{1000 + item.id}"
    }

@router.get("/machines/{machine_id}/work-orders", response_model=list[WorkOrderSchema])
def get_machine_work_orders(machine_id: int, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine introuvable")
    orders = db.query(WorkOrder).filter(WorkOrder.equipment_id == machine.reference).order_by(WorkOrder.id.desc()).all()
    return orders

@router.patch("/work-orders/{wo_id}", response_model=WorkOrderSchema)
def update_work_order(wo_id: int, update_data: dict, db: Session = Depends(get_db)):
    from datetime import datetime
    order = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Ordre de travail introuvable")

    prev_status = order.status

    if "status" in update_data:
        order.status = update_data["status"].lower()
    if "priority" in update_data:
        order.priority = update_data["priority"]

    # ── Auto-deduct stock when OT transitions to "done" ──────────────────────
    stock_updates = []
    new_status = update_data.get("status", "").lower()
    
    # Check if we are moving TO a completed state FROM an uncompleted state
    is_completed = new_status in ("done", "closed")
    was_completed = (prev_status or "").lower() in ("done", "closed")

    if is_completed and not was_completed:
        order.actual_end_date = datetime.utcnow().strftime("%Y-%m-%d")
        
        # Ensure we have the latest parts list from DB before deduction
        db.refresh(order)
        logging.info(f"Deducting remaining stock for OT #{wo_id} ({len(order.parts)} parts)")

        for part in order.parts:
            # Skip if already deducted (e.g. added via technician UI)
            if part.deducted:
                continue

            # Case-insensitive reference lookup
            p_code = (part.part_code or "").strip()
            p_name = (part.part_name or "").strip()
            
            item = db.query(Stock).filter(
                (Stock.reference.ilike(p_code)) | (Stock.name.ilike(p_name))
            ).first()
            
            if item:
                if item.quantity >= part.quantity:
                    item.quantity -= part.quantity
                    part.deducted = True # Mark as deducted
                    logging.info(f"Auto-deducted {part.quantity} of {item.name} on closure. New qty: {item.quantity}")
                    stock_updates.append({
                        "part": item.name,
                        "deducted": part.quantity,
                        "remaining": item.quantity,
                    })
                else:
                    logging.error(f"Insufficient stock for {p_code} on closure: need {part.quantity}, only have {item.quantity}")

    db.commit()
    db.refresh(order)
    # Attach stock_updates as a transient attribute for the response
    order.__dict__["_stock_updates"] = stock_updates
    return order

@router.post("/work-orders/{wo_id}/parts")
def add_work_order_part(wo_id: int, part_data: dict, db: Session = Depends(get_db)):
    order = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Ordre de travail introuvable")
    
    # Check if part exists in stock
    p_code = (part_data.get("part_code") or "").strip()
    qty = part_data.get("quantity", 1)
    
    item = db.query(Stock).filter(Stock.reference.ilike(p_code)).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cette pièce n'existe pas dans le stock SAP.")

    # Deduct stock immediately
    if item.quantity < qty:
        raise HTTPException(status_code=400, detail=f"Stock insuffisant : demandé {qty}, disponible {item.quantity}")
    
    item.quantity -= qty
    logging.info(f"Immediate deduction: {qty} of {item.name} for OT #{wo_id}. New stock: {item.quantity}")

    new_part = WorkOrderPart(
        work_order_id=wo_id,
        part_code=item.reference,
        part_name=item.name,
        quantity=qty,
        unit_price_at_consumption=item.unit_price,
        deducted=True # Mark as already deducted
    )
    db.add(new_part)
    db.commit()
    return {"status": "success", "part": item.name, "remaining": item.quantity}

# ─────────────────────────────────────────────────────────────────────────────
# PREVENTIVE MAINTENANCE AUTO-TRIGGER
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/machines/{machine_id}/maintenance-status")
def get_machine_maintenance_status(machine_id: int, db: Session = Depends(get_db)):
    """Returns the detailed maintenance status of a machine including overdue/due-soon flags."""
    from datetime import timedelta
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine introuvable")
    
    today = date.today()
    next_date = machine.next_maintenance_date
    
    if not next_date:
        return {
            "machine_id": machine_id,
            "machine_name": machine.name,
            "status": "not_planned",
            "next_maintenance_date": None,
            "last_maintenance_date": machine.last_maintenance_date,
            "frequency_days": machine.maintenance_frequency_days,
            "days_remaining": None,
        }
    
    try:
        next_dt = date.fromisoformat(next_date)
        days_remaining = (next_dt - today).days
        
        if days_remaining < 0:
            status = "overdue"
        elif days_remaining <= 7:
            status = "due_soon"
        else:
            status = "ok"
    except ValueError:
        status = "unknown"
        days_remaining = None

    return {
        "machine_id": machine_id,
        "machine_name": machine.name,
        "status": status,
        "next_maintenance_date": next_date,
        "last_maintenance_date": machine.last_maintenance_date,
        "frequency_days": machine.maintenance_frequency_days,
        "days_remaining": days_remaining,
    }


@router.post("/machines/{machine_id}/trigger-maintenance")
def trigger_preventive_maintenance(
    machine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(["admin", "manager"]))
):
    """Auto-generate a preventive maintenance Work Order for a machine.
    Also updates last_maintenance_date and computes next_maintenance_date
    based on the configured frequency."""
    from datetime import timedelta
    
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine introuvable")
    
    today = date.today()
    freq = machine.maintenance_frequency_days or 90
    
    # Compute next maintenance date using today as the new baseline
    next_maintenance = today + timedelta(days=freq)
    
    # Update machine maintenance dates
    machine.last_maintenance_date = today.isoformat()
    machine.next_maintenance_date = next_maintenance.isoformat()
    
    # Auto-generate a preventive Work Order
    last_id = db.query(WorkOrder).count() + 1056
    sap_id = f"SAP-WO-{last_id}-PM"
    
    new_wo = WorkOrder(
        sap_order_id=sap_id,
        title=f"Maintenance Préventive — {machine.name}",
        description=(
            f"Plan de maintenance préventive automatique (fréquence : tous les {freq} jours).\n"
            f"Équipement : {machine.name} [{machine.reference}]\n"
            f"Localisation : {machine.location}\n"
            f"Prochaine révision prévue : {next_maintenance.isoformat()}"
        ),
        type="preventive",
        priority="medium",
        status="open",
        technical_location=machine.location,
        equipment_id=machine.reference,
        team="Maint-Préventif",
        planned_start_date=today.isoformat(),
        planned_end_date=today.isoformat(),
    )
    
    db.add(new_wo)
    db.commit()
    db.refresh(new_wo)
    
    logging.info(f"Preventive OT #{sap_id} auto-generated for machine {machine.name}")
    
    return {
        "status": "success",
        "message": f"OT préventif créé pour {machine.name}",
        "work_order_id": new_wo.id,
        "sap_order_id": sap_id,
        "next_maintenance_date": next_maintenance.isoformat(),
    }

