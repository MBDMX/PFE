from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import Machine, Stock, WorkOrder, User
from app.api.deps import get_current_user, role_required
from app.schemas.schemas import Machine as MachineSchema, Stock as StockSchema, Stats, WorkOrder as WorkOrderSchema

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

@router.patch("/work-orders/{wo_id}", response_model=WorkOrderSchema)
def update_work_order(wo_id: int, update_data: dict, db: Session = Depends(get_db)):
    order = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Ordre de travail introuvable")
    
    if "status" in update_data:
        order.status = update_data["status"]
    if "priority" in update_data:
        order.priority = update_data["priority"]
        
    db.commit()
    db.refresh(order)
    return order
