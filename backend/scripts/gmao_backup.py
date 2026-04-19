from typing import List, Optional
from datetime import date, datetime
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import Machine, Stock, WorkOrder, User, WorkOrderPart, WorkOrderStep, PartsRequest, PartsRequestItem, StockMovement, WorkSession
from app.api.deps import get_current_user, role_required
from app.schemas.schemas import UserOut, Machine as MachineSchema, Stock as StockSchema, Stats, WorkOrder as WorkOrderSchema, ManagerStats, PartsRequestOut, WorkOrderStep as WorkOrderStepSchema, WorkOrderStepUpdate, MagasinierStats, StockMovement as StockMovementSchema, WorkSession as WorkSessionSchema, WorkSessionCreate, WorkOrderCreate

router = APIRouter()

@router.get("/ping")
def ping():
    return {"ping": "pong"}

@router.post("/system/reset")
def reset_system(db: Session = Depends(get_db)):
    # Only allow resetting the database state completely
    db.query(StockMovement).delete()
    db.query(PartsRequestItem).delete()
    db.query(PartsRequest).delete()
    db.query(WorkOrderStep).delete()
    db.query(WorkOrderPart).delete()
    db.query(WorkOrder).delete()
    db.query(Stock).delete()
    db.query(Machine).delete()
    db.query(User).delete()
    db.commit()
    
    # Reload original seed data
    from app.db.seed import execute_seed_data
    execute_seed_data(db)
    
    return {"status": "success", "message": "Système GMAO réinitialisé à zéro avec succès."}

@router.get("/machines", response_model=List[MachineSchema])
def get_machines(db: Session = Depends(get_db)):
    return db.query(Machine).all()


@router.get("/stock", response_model=List[StockSchema])
def get_stock(db: Session = Depends(get_db)):
    return db.query(Stock).all()

@router.get("/technicians", response_model=List[UserOut])
def get_technicians(db: Session = Depends(get_db)):
    return db.query(User).filter(User.role == "technician").all()

@router.get("/work-orders", response_model=List[WorkOrderSchema])
def get_work_orders(db: Session = Depends(get_db)):
    # Standard query, SQLAlchemy will handle relationship 'parts' automatically if configured
    return db.query(WorkOrder).all()

@router.get("/work-orders/{wo_id}", response_model=WorkOrderSchema)
def get_work_order(wo_id: int, db: Session = Depends(get_db)):
    order = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
    return order

@router.post("/work-orders", response_model=WorkOrderSchema)
def create_work_order(
    order_data: WorkOrderCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # Generate a fake SAP ID for the V1 Demo (Simulating RPA/SAP sync)
        last_id = db.query(WorkOrder).count() + 1056
        sap_id = f"SAP-WO-{last_id}"
        
        # Cast technicianId to int if valid, else None
        tech_id = None
        if order_data.technicianId and order_data.technicianId.strip():
            try:
                tech_id = int(order_data.technicianId)
            except ValueError:
                pass

        new_wo = WorkOrder(
            sap_order_id=sap_id,
            title=order_data.title,
            description=order_data.description,
            type=order_data.type,
            priority=order_data.priority,
            status="open",
            technical_location=order_data.location,
            equipment_id=order_data.equipmentId,
            team=order_data.team,
            technician_id=tech_id,
            responsible_person=order_data.responsiblePerson,
            planned_start_date=order_data.startDate,
            planned_end_date=order_data.endDate,
            created_at=order_data.createdAt or datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
            created_by=current_user.id
        )
        db.add(new_wo)
        db.flush() # Secure the ID before adding related items
        
        # Handle initial spare parts if provided
        parts_list = order_data.parts or []
        for p in parts_list:
            p_code = p.get("part_code")
            qty = p.get("quantity", 1)
            if p_code:
                item = db.query(Stock).filter(Stock.reference == p_code).first()
                if item:
                    new_part = WorkOrderPart(
                        work_order_id=new_wo.id,
                        part_code=item.reference,
                        part_name=item.name,
                        quantity=qty,
                        unit_price_at_consumption=item.unit_price,
                        deducted=False 
                    )
                    db.add(new_part)
                    
        # Automatically create a PartsRequest for these initial parts
        if parts_list:
            pr = PartsRequest(
                work_order_id=new_wo.id,
                requested_by=current_user.id,
                status="pending",
                created_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M")
            )
            db.add(pr)
            db.flush() 
            for p in parts_list:
                if p.get("part_code"):
                    pr_item = PartsRequestItem(
                        request_id=pr.id,
                        part_code=p["part_code"],
                        part_name=p.get("part_name", ""),
                        quantity_requested=p.get("quantity", 1)
                    )
                    db.add(pr_item)
        
        # Handle initial steps if provided
        steps_list = order_data.steps or []
        for idx, s_desc in enumerate(steps_list):
            if s_desc:
                new_step = WorkOrderStep(
                    work_order_id=new_wo.id,
                    description=s_desc,
                    is_done=False,
                    order_index=idx
                )
                db.add(new_step)

        db.commit()
        db.refresh(new_wo)
        return new_wo
    except Exception as e:
        db.rollback()
        logging.error(f"Error creating work order: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur serveur lors de la création de l'OT: {str(e)}"
        )

@router.patch("/work-orders/steps/{step_id}/toggle", response_model=WorkOrderStepSchema)
def toggle_work_order_step(
    step_id: int, 
    update: WorkOrderStepUpdate,
    db: Session = Depends(get_db)
):
    step = db.query(WorkOrderStep).filter(WorkOrderStep.id == step_id).first()
    if not step:
        raise HTTPException(status_code=404, detail="Étape introuvable")
    
    step.is_done = update.is_done
    db.commit()
    db.refresh(step)
    return step

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
    avg_health = 0
    if machines:
        avg_health = round(sum(m.health_score or 0 for m in machines) / len(machines))
    
    # Simple resolution rate
    res_rate = 0
    if total > 0:
        res_rate = round((done / total) * 100)
    
    due_maint = sum(1 for m in machines if m.next_maintenance_date and m.next_maintenance_date <= warning_date)
    
    return {
        "totalOT": total,
        "openOT": open_ot,
        "inProgressOT": in_progress,
        "doneOT": done,
        "overdueOT": overdue,
        "criticalOT": critical,
        "lowStock": low_stock,
        "avgMachineHealth": avg_health,
        "resolutionRate": res_rate,
        "dueMaintenance": due_maint
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

# ─────────────────────────────────────────────────────────────────────────────
# MANAGER SUPERVISION ÉQUIPE ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/manager/technicians", response_model=List[UserOut])
def get_manager_technicians(
    db: Session = Depends(get_db), 
    current_user: User = Depends(role_required(["manager", "admin"]))
):
    """Returns technicians strictly assigned to the current manager/admin."""
    # Admins see all technicians, Managers see only their technicians
    if current_user.role == "admin":
        return db.query(User).filter(User.role == "technician").all()
    else:
        return db.query(User).filter(User.role == "technician", User.manager_id == current_user.id).all()

@router.get("/manager/technicians/{tech_id}/stats")
def get_technician_supervised_stats(
    tech_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(role_required(["manager", "admin"]))
):
    """Computes stats localized to a specific technician supervised by this manager."""
    tech = db.query(User).filter(User.id == tech_id, User.role == "technician").first()
    if not tech:
        raise HTTPException(status_code=404, detail="Technician not found")
        
    # Enforce supervisor check
    if current_user.role != "admin" and tech.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to supervise this technician")

    wos = db.query(WorkOrder).filter(WorkOrder.technician_id == tech_id).all()
    
    total = len(wos)
    done_wos = [w for w in wos if w.status in ["done", "closed"]]
    done_count = len(done_wos)
    open_count = sum(1 for w in wos if w.status == "open")
    in_progress = sum(1 for w in wos if w.status == "in_progress")
    
    # Calculate Completion Rate
    completion_rate = round((done_count / total * 100)) if total > 0 else 0
    
    # Calculate Overdue
    today = date.today().isoformat()
    overdue_count = sum(
        1 for w in wos 
        if w.status not in ["done", "closed"] and w.planned_end_date and w.planned_end_date < today
    )

    # Average repair time for this tech
    repair_times = [w.time_spent for w in done_wos if w.time_spent and w.time_spent > 0]
    avg_repair_time = round(sum(repair_times) / len(repair_times), 1) if repair_times else 0

    return {
        "totalAssigned": total,
        "doneOT": done_count,
        "openOT": open_count,
        "inProgressOT": in_progress,
        "overdueOT": overdue_count,
        "completionRate": completion_rate,
        "avgRepairTime": avg_repair_time
    }

@router.get("/manager/technicians/{tech_id}/work-orders", response_model=List[WorkOrderSchema])
def get_technician_supervised_wos(
    tech_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(role_required(["manager", "admin"]))
):
    """Returns specific work orders assigned to a technician."""
    tech = db.query(User).filter(User.id == tech_id, User.role == "technician").first()
    if not tech:
        raise HTTPException(status_code=404, detail="Technician not found")
        
    if current_user.role != "admin" and tech.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this technician's orders")

    return db.query(WorkOrder).filter(WorkOrder.technician_id == tech_id).order_by(WorkOrder.id.desc()).all()


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
    
    # Log movement (IN)
    movement = StockMovement(
        part_code=item.reference,
        part_name=item.name,
        quantity=qty,
        type="IN",
        date=datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
        user_id=current_user.id
    )
    db.add(movement)
    
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

# ── TIME TRACKING (WORK SESSIONS) ──

@router.get("/technician/timer/active", response_model=Optional[WorkSessionSchema])
def get_active_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(WorkSession).filter(
        WorkSession.technician_id == current_user.id,
        WorkSession.end_time == None
    ).first()
    
    if session:
        # Populate the title for the frontend UI
        session.work_order_title = session.work_order.title if session.work_order else "Intervention"
        
    return session

@router.post("/work-orders/{wo_id}/timer/start", response_model=WorkSessionSchema)
def start_work_session(
    wo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Rule 4.3: One active session only
    active_session = db.query(WorkSession).filter(
        WorkSession.technician_id == current_user.id,
        WorkSession.end_time == None
    ).first()
    
    if active_session:
        raise HTTPException(
            status_code=400, 
            detail=f"Session déjà active sur l'OT #{active_session.work_order_id}. Arrêtez-la d'abord."
        )

    order = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="OT introuvable")

    now = datetime.utcnow()
    session = WorkSession(
        work_order_id=wo_id,
        technician_id=current_user.id,
        start_time=now.isoformat(),
        is_synced=True
    )
    db.add(session)
    
    # Rule 4.7: Update OT status
    if order.status == "open":
        order.status = "in_progress"
    
    if not order.actual_start_date:
        order.actual_start_date = now.strftime("%Y-%m-%d")

    db.commit()
    db.refresh(session)
    
    # Populate for initial response
    session.work_order_title = order.title
    
    return session

@router.post("/work-orders/{wo_id}/timer/stop", response_model=WorkSessionSchema)
def stop_work_session(
    wo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(WorkSession).filter(
        WorkSession.work_order_id == wo_id,
        WorkSession.technician_id == current_user.id,
        WorkSession.end_time == None
    ).first()

    if not session:
        raise HTTPException(status_code=400, detail="Aucune session active sur cet OT.")

    now = datetime.utcnow()
    start_dt = datetime.fromisoformat(session.start_time)
    
    diff = now - start_dt
    duration_hours = round(diff.total_seconds() / 3600, 4) # High precision for small tasks
    
    session.end_time = now.isoformat()
    session.duration = duration_hours
    
    order = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
    if order:
        order.time_spent = (order.time_spent or 0.0) + duration_hours

    db.commit()
    db.refresh(session)
    return session


@router.patch("/work-orders/{wo_id}", response_model=WorkOrderSchema)
def update_work_order(
    wo_id: int, 
    update_data: dict, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Ordre de travail introuvable")

    # ── Permission Check ───────────────────────────────────────────────────
    # If the user is a technician, they can only edit their own creations
    if current_user.role == "technician" and order.created_by != current_user.id:
        raise HTTPException(
            status_code=403, 
            detail="Accès refusé : Vous ne pouvez modifier que les OT que vous avez créés."
        )
    # ───────────────────────────────────────────────────────────────────────

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
        # parts relation will be lazy-loaded with current data
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
                    
                    # Log Stock Movement
                    movement = StockMovement(
                        part_code=item.reference,
                        part_name=item.name,
                        quantity=part.quantity,
                        type="OUT",
                        date=datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
                        user_id=current_user.id,
                        work_order_id=order.id
                    )
                    db.add(movement)
                    
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

@router.delete("/work-orders/{wo_id}")
def delete_work_order(
    wo_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Ordre de travail introuvable")

    # If Manager/Admin: HARD DELETE immediately
    if current_user.role in ["manager", "admin"]:
        # Delete related items first to avoid integrity errors in simple setups
        db.query(WorkOrderPart).filter(WorkOrderPart.work_order_id == wo_id).delete()
        db.query(WorkOrderStep).filter(WorkOrderStep.work_order_id == wo_id).delete()
        db.query(WorkSession).filter(WorkSession.work_order_id == wo_id).delete()
        db.query(PartsRequest).filter(PartsRequest.work_order_id == wo_id).delete()
        
        db.delete(order)
        db.commit()
        return {"message": "Ordre de travail supprimé définitivement par le responsable."}

    # If Technician: MUST BE OWNER + SOFT DELETE (Pending Deletion)
    if current_user.role == "technician":
        if order.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Vous ne pouvez supprimer que vos propres OT.")
        
        # Change status to pending_deletion instead of deleting
        order.status = "pending_deletion"
        db.commit()
        return {"message": "Demande de suppression envoyée pour approbation au responsable.", "status": "pending_deletion"}

    raise HTTPException(status_code=403, detail="Action non autorisée.")

@router.post("/work-orders/{wo_id}/approve-deletion")
def approve_deletion(
    wo_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(["manager", "admin"]))
):
    order = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Ordre de travail introuvable")
    
    if order.status != "pending_deletion":
        raise HTTPException(status_code=400, detail="Cet OT n'est pas en attente de suppression.")

    # Hard delete
    db.query(WorkOrderPart).filter(WorkOrderPart.work_order_id == wo_id).delete()
    db.query(WorkOrderStep).filter(WorkOrderStep.work_order_id == wo_id).delete()
    db.query(WorkSession).filter(WorkSession.work_order_id == wo_id).delete()
    db.query(PartsRequest).filter(PartsRequest.work_order_id == wo_id).delete()
    db.delete(order)
    db.commit()
    return {"message": "Suppression approuvée et exécutée."}

@router.post("/work-orders/{wo_id}/reject-deletion")
def reject_deletion(
    wo_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(["manager", "admin"]))
):
    order = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Ordre de travail introuvable")

    if order.status != "pending_deletion":
        raise HTTPException(status_code=400, detail="Cet OT n'est pas en attente de suppression.")

    # Restore to open (or previous status if we had it, but open is safe default)
    order.status = "open"
    db.commit()
    return {"message": "Demande de suppression rejetée. L'OT est à nouveau ouvert.", "status": "open"}


@router.post("/work-orders/{wo_id}/parts")
def add_work_order_part(
    wo_id: int, 
    part_data: dict, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Ordre de travail introuvable")
    
    # Check if part exists in stock
    p_code = (part_data.get("part_code") or "").strip()
    qty = part_data.get("quantity", 1)
    
    item = db.query(Stock).filter(Stock.reference.ilike(p_code)).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cette pièce n'existe pas dans le stock SAP.")

    # INSTEAD OF IMMEDIATE DEDUCTION: Create a PartsRequest for the Magasinier
    pr = PartsRequest(
        work_order_id=wo_id,
        requested_by=current_user.id,
        status="pending",
        created_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M")
    )
    db.add(pr)
    db.flush() # Get PR ID
    
    pr_item = PartsRequestItem(
        request_id=pr.id,
        part_code=item.reference,
        part_name=item.name,
        quantity_requested=qty
    )
    db.add(pr_item)

    # Add to WO parts but mark as NOT deducted yet
    new_part = WorkOrderPart(
        work_order_id=wo_id,
        part_code=item.reference,
        part_name=item.name,
        quantity=qty,
        unit_price_at_consumption=item.unit_price,
        deducted=False, # MARK AS FALSE: Magasinier will deduct
    )
    db.add(new_part)
    db.commit()
    
    logging.info(f"Parts request created for {qty} of {item.name} for OT #{wo_id}.")
    return {"status": "request_created", "message": "Demande envoyée au magasinier"}

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


# ─────────────────────────────────────────────────────────────────────────────
# MAGASINIER — PARTS REQUEST WORKFLOW
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/parts-requests")
def create_parts_request(
    req_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Technicien submits a parts request for a specific work order."""
    from datetime import datetime

    wo_id = req_data.get("work_order_id")
    items = req_data.get("items", [])

    if not wo_id or not items:
        raise HTTPException(status_code=400, detail="work_order_id et items sont requis")

    wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Ordre de travail introuvable")

    pr = PartsRequest(
        work_order_id=wo_id,
        requested_by=current_user.id,
        status="pending",
        created_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
    )
    db.add(pr)
    db.flush()  # get pr.id

    for it in items:
        part_code = (it.get("part_code") or "").strip()
        stock_item = db.query(Stock).filter(Stock.reference.ilike(part_code)).first()
        pri = PartsRequestItem(
            request_id=pr.id,
            part_code=part_code,
            part_name=stock_item.name if stock_item else it.get("part_name", part_code),
            quantity_requested=it.get("quantity", 1),
        )
        db.add(pri)

    db.commit()
    db.refresh(pr)

    return {
        "status": "success",
        "request_id": pr.id,
        "message": f"Demande de {len(items)} pièce(s) envoyée au Magasinier",
    }

@router.get("/magasinier/stats", response_model=MagasinierStats)
def get_magasinier_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(["magasinier", "admin"]))
):
    pending = db.query(PartsRequest).filter(PartsRequest.status == "pending").count()
    approved = db.query(PartsRequest).filter(PartsRequest.status == "approved").count()
    rejected = db.query(PartsRequest).filter(PartsRequest.status == "rejected").count()
    
    # Total items out
    total_out = db.query(StockMovement).filter(StockMovement.type == "OUT").count()
    critical = db.query(Stock).filter(Stock.quantity <= 5).count()
    
    return {
        "pending_requests": pending,
        "approved_requests": approved,
        "rejected_requests": rejected,
        "total_items_out": total_out,
        "critical_stock_alerts": critical
    }

@router.get("/stock/movements", response_model=List[StockMovementSchema])
def get_stock_movements(
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(["magasinier", "admin"]))
):
    movements = db.query(StockMovement).order_by(StockMovement.id.desc()).all()
    # Enrich with user names
    results = []
    for m in movements:
        user = db.query(User).filter(User.id == m.user_id).first()
        m_dict = {
            "id": m.id,
            "part_code": m.part_code,
            "part_name": m.part_name,
            "quantity": m.quantity,
            "type": m.type,
            "date": m.date,
            "user_id": m.user_id,
            "work_order_id": m.work_order_id,
            "request_id": m.request_id,
            "user_name": user.name if user else "Inconnu"
        }
        results.append(m_dict)
    return results


@router.get("/parts-requests")
def get_parts_requests(
    status_filter: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns parts requests. Magasinier/Admin see all, Technicians see only their own."""
    query = db.query(PartsRequest)

    if current_user.role in ["magasinier", "admin", "manager"]:
        pass  # see all
    else:
        query = query.filter(PartsRequest.requested_by == current_user.id)

    if status_filter:
        query = query.filter(PartsRequest.status == status_filter)

    requests = query.order_by(PartsRequest.id.desc()).all()

    # Enrich with names
    results = []
    for r in requests:
        requester = db.query(User).filter(User.id == r.requested_by).first()
        wo = db.query(WorkOrder).filter(WorkOrder.id == r.work_order_id).first()
        data = {
            "id": r.id,
            "work_order_id": r.work_order_id,
            "requested_by": r.requested_by,
            "status": r.status,
            "rejection_reason": r.rejection_reason,
            "approved_by": r.approved_by,
            "created_at": r.created_at,
            "approved_at": r.approved_at,
            "items": [{
                "id": i.id,
                "part_code": i.part_code,
                "part_name": i.part_name,
                "quantity_requested": i.quantity_requested,
                "quantity_approved": i.quantity_approved,
            } for i in r.items],
            "requester_name": requester.name if requester else "Inconnu",
            "work_order_title": wo.title if wo else "—",
            "work_order_sap_id": wo.sap_order_id if wo else "—",
        }
        results.append(data)

    return results


@router.patch("/parts-requests/{req_id}/approve")
def approve_parts_request(
    req_id: int,
    approve_data: dict = {},
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(["magasinier", "admin"]))
):
    """Magasinier approves a parts request. Deducts stock and adds parts to the OT."""
    from datetime import datetime

    pr = db.query(PartsRequest).filter(PartsRequest.id == req_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Demande introuvable")
    if pr.status != "pending":
        raise HTTPException(status_code=400, detail=f"Demande déjà {pr.status}")

    wo = db.query(WorkOrder).filter(WorkOrder.id == pr.work_order_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="OT introuvable")

    errors = []
    deducted_parts = []

    for item in pr.items:
        qty = item.quantity_requested
        stock = db.query(Stock).filter(Stock.reference.ilike(item.part_code)).first()

        if not stock:
            errors.append(f"Pièce {item.part_code} introuvable en stock")
            continue

        if stock.quantity < qty:
            errors.append(f"Stock insuffisant pour {stock.name}: demandé {qty}, disponible {stock.quantity}")
            continue

        # Deduct stock
        stock.quantity -= qty
        item.quantity_approved = qty

        # Check if this part was already added to the WO (e.g. by technician) but not yet deducted
        existing_wo_part = db.query(WorkOrderPart).filter(
            WorkOrderPart.work_order_id == pr.work_order_id,
            WorkOrderPart.part_code == stock.reference,
            WorkOrderPart.deducted == False
        ).first()

        if existing_wo_part:
            existing_wo_part.deducted = True
            # In case the approved quantity changed (rare in this logic but good practice)
            existing_wo_part.quantity = qty 
            existing_wo_part.unit_price_at_consumption = stock.unit_price
        else:
            # Add part to the work order as new
            wo_part = WorkOrderPart(
                work_order_id=pr.work_order_id,
                part_code=stock.reference,
                part_name=stock.name,
                quantity=qty,
                unit_price_at_consumption=stock.unit_price,
                deducted=True,
            )
            db.add(wo_part)
        deducted_parts.append({"part": stock.name, "qty": qty, "remaining": stock.quantity})
        logging.info(f"Magasinier approved: {qty}x {stock.name} for OT #{pr.work_order_id}")

    pr.status = "approved"
    pr.approved_by = current_user.id
    pr.approved_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M")

    # Log Stock Movement for each approved item
    for item in pr.items:
        if item.quantity_approved and item.quantity_approved > 0:
            movement = StockMovement(
                part_code=item.part_code,
                part_name=item.part_name,
                quantity=item.quantity_approved,
                type="OUT",
                date=pr.approved_at,
                user_id=current_user.id,
                work_order_id=pr.work_order_id,
                request_id=pr.id
            )
            db.add(movement)

    db.commit()

    return {
        "status": "approved",
        "request_id": pr.id,
        "deducted": deducted_parts,
        "errors": errors,
        "message": f"{len(deducted_parts)} pièce(s) validée(s) et sortie(s) du stock",
    }


@router.patch("/parts-requests/{req_id}/reject")
def reject_parts_request(
    req_id: int,
    reject_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(["magasinier", "admin"]))
):
    """Magasinier rejects a parts request with a mandatory reason."""
    from datetime import datetime

    pr = db.query(PartsRequest).filter(PartsRequest.id == req_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Demande introuvable")
    if pr.status != "pending":
        raise HTTPException(status_code=400, detail=f"Demande déjà {pr.status}")

    reason = reject_data.get("reason", "").strip()
    if not reason:
        raise HTTPException(status_code=400, detail="Motif de refus obligatoire")

    pr.status = "rejected"
    pr.rejection_reason = reason
    pr.approved_by = current_user.id
    pr.approved_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M")

    db.commit()

    return {
        "status": "rejected",
        "request_id": pr.id,
        "reason": reason,
        "message": "Demande refusée",
    }
