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
        deducted=True # Mark as already deducted
    )
    db.add(new_part)
    db.commit()
    return {"status": "success", "part": item.name, "remaining": item.quantity}
