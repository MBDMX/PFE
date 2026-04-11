from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from prisma import Prisma
from app.db.session import get_db
from app.api.deps import role_required, get_current_user
from app.schemas.schemas import WorkOrder as WorkOrderSchema, WorkOrderCreate, WorkSession as WorkSessionSchema, WorkOrderStepUpdate

router = APIRouter(prefix="/work-orders", tags=["work-orders"])

@router.get("", response_model=List[WorkOrderSchema])
async def get_work_orders(db: Prisma = Depends(get_db)):
    return await db.workorder.find_many(include={"parts": True, "steps": True}, order={'created_at': 'desc'})

@router.get("/{wo_id}", response_model=WorkOrderSchema)
async def get_work_order(wo_id: int, db: Prisma = Depends(get_db)):
    order = await db.workorder.find_unique(where={'id': wo_id}, include={"parts": True, "steps": True})
    if not order:
        raise HTTPException(status_code=404, detail="OT introuvable")
    return order

@router.post("", response_model=WorkOrderSchema)
async def create_work_order(wo: WorkOrderCreate, db: Prisma = Depends(get_db)):
    # Manually map frontend fields to Prisma field names
    # Frontend: location -> Prisma: technical_location
    # Frontend: equipmentId -> Prisma: equipment_id
    # Frontend: technicianId -> Prisma: technician_id
    
    data = {
        "title": wo.title,
        "description": wo.description,
        "type": wo.type,
        "priority": wo.priority,
        "technical_location": wo.location,
        "equipment_id": str(wo.equipmentId) if wo.equipmentId else None,
        "team": wo.team,
        "technician_id": int(wo.technicianId) if wo.technicianId and str(wo.technicianId).isdigit() else None,
        "responsible_person": wo.responsiblePerson,
        "planned_start_date": wo.startDate,
        "planned_end_date": wo.endDate,
        "status": "open"
    }
    
    new_order = await db.workorder.create(data=data)
    
    # Create steps if provided
    if wo.steps:
        for i, step_desc in enumerate(wo.steps):
            await db.workorderstep.create(data={
                "description": step_desc,
                "work_order_id": new_order.id,
                "is_done": False,
                "order_index": i
            })
    
    return await db.workorder.find_unique(where={"id": new_order.id}, include={"parts": True, "steps": True})

@router.patch("/{wo_id}", response_model=WorkOrderSchema)
async def update_work_order(wo_id: int, wo_data: dict, db: Prisma = Depends(get_db)):
    old_order = await db.workorder.find_unique(where={"id": wo_id})
    if not old_order:
        raise HTTPException(status_code=404, detail="OT introuvable")
    
    # Map frontend fields if present in the update dict
    mapping = {
        "location": "technical_location",
        "equipmentId": "equipment_id",
        "technicianId": "technician_id",
        "responsiblePerson": "responsible_person",
        "startDate": "planned_start_date",
        "endDate": "planned_end_date"
    }
    
    clean_data = {}
    for k, v in wo_data.items():
        prisma_key = mapping.get(k, k)
        # Handle specific types
        if prisma_key == "technician_id" and v:
            try: clean_data[prisma_key] = int(v)
            except: pass
        elif prisma_key == "equipment_id" and v:
            clean_data[prisma_key] = str(v)
        else:
            clean_data[prisma_key] = v

    # Remove fields not in Prisma model (like extra UI fields)
    prisma_fields = {"title", "description", "type", "priority", "status", "technical_location", "equipment_id", "serial_number", "team", "responsible_person", "technician_id", "planned_start_date", "planned_end_date", "actual_start_date", "actual_end_date", "time_spent", "work_log", "failure_cause", "solution_applied", "comments"}
    final_data = {k: v for k, v in clean_data.items() if k in prisma_fields}

    # Logic for stock deduction when transitioning to 'done'
    if final_data.get("status") == "done" and old_order.status != "done":
        # ... stay همان logic ...
        parts = await db.workorderpart.find_many(where={"work_order_id": wo_id})
        for p in parts:
            stock = await db.stock.find_unique(where={"id": p.stock_id})
            if stock:
                new_qty = max(0, stock.quantity - p.quantity)
                await db.stock.update(where={"id": p.stock_id}, data={"quantity": new_qty})
                await db.stockmovement.create(data={
                    "part_code": stock.reference, "part_name": stock.name,
                    "quantity": p.quantity, "type": "OUT", "work_order_id": wo_id
                })

    updated = await db.workorder.update(where={"id": wo_id}, data=final_data)
    return await db.workorder.find_unique(where={"id": wo_id}, include={"parts": True, "steps": True})

@router.patch("/steps/{step_id}/toggle")
async def toggle_step(step_id: int, data: WorkOrderStepUpdate, db: Prisma = Depends(get_db)):
    return await db.workorderstep.update(where={"id": step_id}, data={"is_done": data.is_done})

# TIMER ROUTES
@router.post("/{wo_id}/timer/start")
async def start_timer(wo_id: int, db: Prisma = Depends(get_db), current_user = Depends(get_current_user)):
    existing = await db.worksession.find_first(where={"technician_id": current_user.id, "end_time": None})
    if existing:
        raise HTTPException(status_code=400, detail="Vous avez déjà une session active.")
    
    return await db.worksession.create(data={
        "work_order_id": wo_id,
        "technician_id": current_user.id,
        "start_time": datetime.utcnow().isoformat() + "Z"
    })

@router.post("/{wo_id}/timer/stop")
async def stop_timer(wo_id: int, db: Prisma = Depends(get_db), current_user = Depends(get_current_user)):
    try:
        # 1. Try to find the session for this specific OT
        session = await db.worksession.find_first(
            where={"work_order_id": wo_id, "technician_id": current_user.id, "end_time": None}
        )
        
        # 2. Fallback: find ANY active session for this user
        if not session:
            session = await db.worksession.find_first(
                where={"technician_id": current_user.id, "end_time": None}
            )
            
        if not session:
            raise HTTPException(status_code=404, detail="Aucune session active trouvée.")
        
        now = datetime.utcnow()
        # Parse start time safely
        start_str = session.start_time.replace('Z', '')
        start = datetime.fromisoformat(start_str)
        
        diff = now - start
        duration_hours = round(diff.total_seconds() / 3600, 2)
        
        # Update the session
        await db.worksession.update(
            where={"id": session.id}, 
            data={
                "end_time": now.isoformat() + "Z", 
                "duration": duration_hours
            }
        )
        
        # Update the parent Work Order total time
        target_wo_id = session.work_order_id
        all_sessions = await db.worksession.find_many(
            where={"work_order_id": target_wo_id, "end_time": {"not": None}}
        )
        total_time = sum((s.duration or 0) for s in all_sessions)
        
        await db.workorder.update(
            where={"id": target_wo_id},
            data={"time_spent": total_time, "status": "in_progress"}
        )
        
        return {"status": "success", "duration": duration_hours, "total_time": total_time}

    except Exception as e:
        print(f"❌ Timer Stop Error: {str(e)}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=f"Erreur interne lors de l'arrêt du timer: {str(e)}")

@router.post("/{wo_id}/parts")
async def add_part_to_work_order(wo_id: int, part_data: dict, db: Prisma = Depends(get_db), current_user = Depends(get_current_user)):
    """Associates a part with an existing work order."""
    stock_id = part_data.get("stock_id") or part_data.get("stockId")
    part_code = part_data.get("part_code")
    qty = part_data.get("quantity", 1)
    
    stock = None
    if stock_id:
        stock = await db.stock.find_unique(where={"id": int(stock_id)})
    elif part_code:
        stock = await db.stock.find_first(where={"reference": part_code})
        
    if not stock:
        raise HTTPException(status_code=404, detail=f"Pièce introuvable (ID: {stock_id}, Code: {part_code})")
    
    new_wo_part = await db.workorderpart.create(data={
        "work_order": {"connect": {"id": wo_id}},
        "quantity": qty,
        "part_code": stock.reference,
        "part_name": stock.name,
        "unit_price_at_consumption": stock.unit_price or 0.0
    })
    
    # NEW: Create a PartsRequest automatically so the Storekeeper sees it!
    try:
        # Check current_user carefully
        user_id = None
        if hasattr(current_user, 'id'): user_id = current_user.id
        elif isinstance(current_user, dict): user_id = current_user.get('id')
        
        if user_id:
            new_pr = await db.partsrequest.create(data={
                "work_order": {"connect": {"id": wo_id}},
                "requester": {"connect": {"id": int(user_id)}},
                "status": "pending",
                "created_at": datetime.utcnow().isoformat() + "Z"
            })
            
            # Create the item detail
            await db.partsrequestitem.create(data={
                "request": {"connect": {"id": new_pr.id}},
                "part_code": stock.reference,
                "part_name": stock.name,
                "quantity_requested": qty
            })
            print(f"✅ Automatic PartsRequest & Item created for OT #{wo_id}")
    except Exception as e:
        print(f"⚠️ Could not create automatic PartsRequest: {str(e)}")
    
    return new_wo_part
