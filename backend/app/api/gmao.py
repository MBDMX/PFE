from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import Machine, Stock, WorkOrder
from app.schemas.schemas import Machine as MachineSchema, Stock as StockSchema, Stats

router = APIRouter()

@router.get("/machines", response_model=List[MachineSchema])
def get_machines(db: Session = Depends(get_db)):
    return db.query(Machine).all()

@router.get("/stock", response_model=List[StockSchema])
def get_stock(db: Session = Depends(get_db)):
    return db.query(Stock).all()

@router.get("/stats", response_model=Stats)
def get_stats(db: Session = Depends(get_db)):
    return {
        "totalMachines": db.query(Machine).count(),
        "operational": db.query(Machine).filter(Machine.status == "operational").count(),
        "openOrders": db.query(WorkOrder).filter(WorkOrder.status != "done").count(),
        "lowStock": db.query(Stock).filter(Stock.quantity <= Stock.min_quantity).count(),
    }
