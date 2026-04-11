from typing import List
from fastapi import APIRouter, Depends, HTTPException
from prisma import Prisma
from app.db.session import get_db
from app.api.deps import role_required

router = APIRouter(prefix="/magasinier", tags=["magasinier"])

@router.get("/stats")
async def get_magasinier_stats(db: Prisma = Depends(get_db), current_user = Depends(role_required(["admin", "magasinier"]))):
    """General KPIs for the storekeeper dashboard."""
    total_items = await db.stock.count()
    low_stock = await db.stock.count(where={"quantity": {"lt": 5}})
    # Count from both table types if they coexist
    pending_pr = await db.partsrequest.count(where={"status": "pending"})
    approved_pr = await db.partsrequest.count(where={"status": "approved"})
    rejected_pr = await db.partsrequest.count(where={"status": "rejected"})
    
    total_out = await db.stockmovement.count(where={"type": "OUT"})
    stock_items = await db.stock.find_many()
    total_value = sum((i.quantity * (i.unit_price or 0)) for i in stock_items)
    
    return {
        "pending_requests": pending_pr,
        "approved_requests": approved_pr,
        "rejected_requests": rejected_pr,
        "critical_stock_alerts": low_stock,
        "total_items_out": total_out,
        "total_value": round(total_value, 2)
    }

@router.get("/dashboard")
async def get_magasinier_dashboard(db: Prisma = Depends(get_db), current_user = Depends(role_required(["admin", "magasinier"]))):
    """Returns combined data for the magasinier dashboard."""
    # Official requests from technicians
    reqs = await db.partsrequest.find_many(
        where={"status": "pending"},
        include={"items": True, "requester": True, "work_order": True},
        order={"created_at": "desc"}
    )
    
    # Enrichment
    enriched_reqs = []
    for r in reqs:
        enriched_reqs.append({
            **r.dict(),
            "requester_name": r.requester.name if r.requester else "Inconnu",
            "work_order_sap_id": r.work_order.sap_order_id if r.work_order else f"OT-{r.work_order_id}"
        })
    
    recent_movements = await db.stockmovement.find_many(
        take=15,
        order={"date": "desc"}
    )
    
    low_stock = await db.stock.find_many(
        where={"quantity": {"lt": 5}},
        take=10
    )
    
    return {
        "pendingRequests": enriched_reqs,
        "recentMovements": recent_movements,
        "lowStockItems": low_stock
    }
