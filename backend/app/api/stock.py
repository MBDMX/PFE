from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from prisma import Prisma
from app.db.session import get_db
from app.api.deps import role_required, get_current_user
from app.schemas.schemas import Stock as StockSchema, PartsRequestOut, StockMovement as StockMovementSchema

router = APIRouter(prefix="/stock", tags=["stock"])

@router.get("", response_model=List[StockSchema])
async def get_stock(db: Prisma = Depends(get_db)):
    return await db.stock.find_many()

@router.get("/movements", response_model=List[StockMovementSchema])
async def get_stock_movements(db: Prisma = Depends(get_db)):
    return await db.stockmovement.find_many(order={'date': 'desc'})

# PARTS REQUESTS MANAGEMENT
pr_router = APIRouter(prefix="/parts-requests", tags=["parts-requests"])

@pr_router.get("", response_model=List[dict])
async def get_parts_requests(status_filter: Optional[str] = None, db: Prisma = Depends(get_db)):
    where = {"status": status_filter} if status_filter else {}
    reqs = await db.partsrequest.find_many(
        where=where, 
        include={"items": True, "requester": True, "work_order": True}, 
        order={'created_at': 'desc'}
    )
    
    # Enrichment for the frontend
    enriched = []
    for r in reqs:
        enriched.append({
            **r.dict(),
            "requester_name": r.requester.name if r.requester else "Inconnu",
            "work_order_sap_id": r.work_order.sap_order_id if r.work_order else f"OT-{r.work_order_id}",
            "work_order_title": r.work_order.title if r.work_order else ""
        })
    return enriched

@pr_router.post("")
async def create_parts_request(data: dict, db: Prisma = Depends(get_db), current_user = Depends(get_current_user)):
    wo_id = data.get("work_order_id")
    items = data.get("items", [])
    
    new_request = await db.partsrequest.create(data={
        "work_order": {"connect": {"id": data.get("work_order_id")}},
        "requester": {"connect": {"id": int(current_user.id if hasattr(current_user, 'id') else current_user['id'])}},
        "status": "pending",
        "created_at": datetime.utcnow().isoformat() + "Z"
    })
    
    for it in items:
        await db.partsrequestitem.create(data={
            "request": {"connect": {"id": new_request.id}},
            "part_code": it.get("part_code") or it.get("reference"),
            "part_name": it.get("part_name") or it.get("name"),
            "quantity_requested": it.get("quantity") or it.get("quantity_requested")
        })
        
    return await db.partsrequest.find_unique(where={"id": new_request.id}, include={"items": True})

@pr_router.patch("/{req_id}/approve")
async def approve_parts_request(req_id: int, db: Prisma = Depends(get_db), current_user = Depends(role_required(["admin", "magasinier"]))):
    pr = await db.partsrequest.find_unique(where={"id": req_id}, include={"items": True})
    if not pr: raise HTTPException(status_code=404, detail="Demande introuvable")
    
    for it in pr.items:
        # Find the stock item by its code
        stock = await db.stock.find_first(where={"reference": it.part_code})
        if stock:
            qty = it.quantity_requested or 0
            new_qty = max(0, (stock.quantity or 0) - qty)
            await db.stock.update(where={"id": stock.id}, data={"quantity": new_qty})
            
            # Record movement
            await db.stockmovement.create(data={
                "part_code": stock.reference,
                "part_name": stock.name,
                "quantity": qty,
                "type": "OUT",
                "date": datetime.utcnow().isoformat() + "Z",
                "user": {"connect": {"id": int(current_user.id if hasattr(current_user, 'id') else current_user['id'])}},
                "work_order": {"connect": {"id": pr.work_order_id}} if pr.work_order_id else None
            })
            
            # Officially add to WorkOrder (WorkOrderPart)
            # Schema has: work_order_id, part_code, part_name, quantity, ...
            await db.workorderpart.create(data={
                "work_order": {"connect": {"id": pr.work_order_id}},
                "part_code": it.part_code,
                "part_name": it.part_name,
                "quantity": qty,
                "unit_price_at_consumption": stock.unit_price or 0.0
            })
            
    return await db.partsrequest.update(
        where={"id": req_id}, 
        data={
            "status": "approved",
            "approved_at": datetime.utcnow().isoformat() + "Z",
            "approved_by": int(current_user.id if hasattr(current_user, 'id') else current_user['id'])
        }
    )

@pr_router.patch("/{req_id}/reject")
async def reject_parts_request(req_id: int, data: dict, db: Prisma = Depends(get_db), current_user = Depends(role_required(["admin", "magasinier"]))):
    return await db.partsrequest.update(where={"id": req_id}, data={
        "status": "rejected", 
        "rejection_reason": data.get("reason", ""),
        "approved_at": datetime.utcnow().isoformat() + "Z", # Using this as 'processed_at'
        "approved_by": int(current_user.id if hasattr(current_user, 'id') else current_user['id'])
    })
