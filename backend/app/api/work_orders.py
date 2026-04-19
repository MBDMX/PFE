from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from prisma import Prisma
import io
from fpdf import FPDF
from app.db.session import get_db
from app.api.deps import role_required, get_current_user
from app.schemas.schemas import WorkOrder as WorkOrderSchema, WorkOrderCreate, WorkSession as WorkSessionSchema, WorkOrderStepUpdate
from app.core.websocket import manager
from app.sap.client import sap_client

router = APIRouter(prefix="/work-orders", tags=["work-orders"])

@router.get("", response_model=List[WorkOrderSchema])
async def get_work_orders(db: Prisma = Depends(get_db), current_user = Depends(get_current_user)):
    # Filter: Technicians only see their assigned work orders
    where = {}
    if current_user.role == "technician":
        where = {"technician_id": int(current_user.id)}
    
    return await db.workorder.find_many(
        where=where,
        include={"parts": True, "steps": True}, 
        order={'created_at': 'desc'}
    )

@router.post("/sync-from-sap", tags=["SAP Integration"])
async def sync_work_orders_from_sap(
    db: Prisma = Depends(get_db),
    current_user = Depends(role_required(["admin", "manager"]))
):
    """Fetches MaintenanceOrders from SAP ProcessForce and upserts into local WorkOrders."""
    if not sap_client.login_pf():
        raise HTTPException(status_code=503, detail="Impossible de se connecter à SAP PF")

    sap_orders = sap_client.get_maintenance_orders(top=100)
    if not isinstance(sap_orders, list):
        raise HTTPException(status_code=502, detail="Réponse SAP invalide pour les OTs")

    created = 0
    updated = 0

    SAP_MO_STATUS_MAP = {
        "WorkRequest": "open",
        "Opened": "in_progress",
        "Finished": "done",
        "Canceled": "done"
    }

    for order in sap_orders:
        doc_entry = str(order.get("DocEntry"))
        machine_code = order.get("U_MICode", "")
        desc = order.get("U_Remarks", "") or order.get("U_JobScope", "")
        status = SAP_MO_STATUS_MAP.get(order.get("U_MOStatus"), "open")
        start_date = order.get("U_SchStartDate")

        if not doc_entry: continue

        # Find if machine exists locally to link it
        machine = None
        if machine_code:
            machine = await db.machine.find_first(where={"reference": machine_code})

        existing = await db.workorder.find_first(where={"sap_order_id": doc_entry})

        data_payload = {
            "title": f"SAP Maintenance #{doc_entry}: {machine_code}",
            "description": desc,
            "type": "corrective" if "Request" in order.get("U_MOType", "") else "preventive",
            "status": status,
            "equipment_id": str(machine.id) if machine else None,
            "technical_location": machine.location if machine else "SAP Import",
            "planned_start_date": start_date
        }

        if existing:
            await db.workorder.update(where={"id": existing.id}, data=data_payload)
            updated += 1
        else:
            data_payload["sap_order_id"] = doc_entry
            data_payload["priority"] = "medium"
            await db.workorder.create(data=data_payload)
            created += 1

    return {
        "success": True,
        "created": created,
        "updated": updated,
        "message": f"{created} OTs importés, {updated} mis à jour depuis SAP."
    }

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

    # Create PartsRequest if parts are requested at creation
    if wo.parts and len(wo.parts) > 0:
        req_items = []
        for part in wo.parts:
            part_code = part.get("part_code") or part.get("reference")
            qty = int(part.get("quantity", 1))
            if not part_code:
                continue
            stock = await db.stock.find_first(where={"reference": part_code})
            if not stock:
                continue
            req_items.append({
                "part_code": stock.reference,
                "part_name": stock.name,
                "quantity_requested": qty
            })
            
        if req_items:
            requester_id = int(wo.technicianId) if wo.technicianId and str(wo.technicianId).isdigit() else 1
            new_request = await db.partsrequest.create(data={
                "work_order": {"connect": {"id": new_order.id}},
                "requester": {"connect": {"id": requester_id}},
                "status": "pending",
                "created_at": datetime.utcnow().isoformat() + "Z",
                "items": { "create": req_items }
            })
            
            await manager.broadcast({
                "event": "NEW_PARTS_REQUEST",
                "id": new_request.id,
                "wo_id": new_order.id,
                "requester_id": requester_id,
                "part_name": f"{len(req_items)} référence(s)",
                "quantity": sum(it["quantity_requested"] for it in req_items)
            })
    
    res = await db.workorder.find_unique(where={"id": new_order.id}, include={"parts": True, "steps": True})
    await manager.broadcast({"event": "NEW_WORK_ORDER", "id": new_order.id})
    return res

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

    # Logic for stock deduction when transitioning to 'done' has been REMOVED.
    # Stock is now immediately deducted when a part is consumed via add_part_to_work_order,
    # ensuring real-time accurate inventory (per user request).

    updated = await db.workorder.update(where={"id": wo_id}, data=final_data)
    await manager.broadcast({"event": "WORK_ORDER_UPDATED", "id": wo_id})
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
    """Creates a parts request for the magasinier to approve. Stock NOT deducted until approval."""
    stock_id = part_data.get("stock_id") or part_data.get("stockId")
    part_code = part_data.get("part_code")
    qty = part_data.get("quantity", 1)
    
    stock = None
    if stock_id:
        stock = await db.stock.find_unique(where={"id": int(stock_id)})
    elif part_code:
        stock = await db.stock.find_first(where={"reference": part_code})
        
    if not stock:
        raise HTTPException(status_code=404, detail=f"Pièce introuvable (Code: {part_code})")
    
    if (stock.quantity or 0) < qty:
        raise HTTPException(status_code=400, detail=f"Stock insuffisant: {stock.quantity} dispo, {qty} demandé")

    user_id = int(current_user.id if hasattr(current_user, 'id') else current_user['id'])

    # Create a PartsRequest (status=pending) — magasinier will approve/reject
    new_request = await db.partsrequest.create(data={
        "work_order": {"connect": {"id": wo_id}},
        "requester": {"connect": {"id": user_id}},
        "status": "pending",
        "created_at": datetime.utcnow().isoformat() + "Z"
    })
    
    await db.partsrequestitem.create(data={
        "request": {"connect": {"id": new_request.id}},
        "part_code": stock.reference,
        "part_name": stock.name,
        "quantity_requested": qty,
    })

    # Broadcast to magasinier — they need to approve
    await manager.broadcast({
        "event": "NEW_PARTS_REQUEST",
        "id": new_request.id,
        "wo_id": wo_id,
        "part_name": stock.name,
        "quantity": qty,
        "requester_id": user_id
    })
    
    print(f"✅ Parts request #{new_request.id} created for OT #{wo_id} — awaiting magasinier approval")
    return {"status": "pending", "request_id": new_request.id, "message": "Demande envoyée au magasinier"}

@router.get("/{wo_id}/pdf")
async def generate_wo_report(wo_id: int, db: Prisma = Depends(get_db), current_user = Depends(get_current_user)):
    wo = await db.workorder.find_unique(
        where={"id": wo_id}, 
        include={"parts": True, "steps": True}
    )
    if not wo: raise HTTPException(status_code=404, detail="OT introuvable")

    pdf = FPDF()
    pdf.add_page()
    
    # Header
    pdf.set_fill_color(37, 99, 235) # Blue Azure
    pdf.rect(0, 0, 210, 40, 'F')
    pdf.set_font("helvetica", "B", 24)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 20, "RAPPORT D'INTERVENTION", ln=True, align='C')
    pdf.set_font("helvetica", "", 12)
    pdf.cell(0, 10, f"Ordre de Travail SAP #{wo.sap_order_id or wo.id}", ln=True, align='C')
    
    pdf.ln(20)
    pdf.set_text_color(0, 0, 0)
    
    # Main Info Grid
    pdf.set_font("helvetica", "B", 14)
    pdf.cell(0, 10, "Détails Généraux", ln=True)
    pdf.set_font("helvetica", "", 11)
    
    col_w = 45
    pdf.cell(col_w, 8, "Titre:", border=0)
    pdf.cell(0, 8, str(wo.title), border=0, ln=True)
    
    pdf.cell(col_w, 8, "Machine:", border=0)
    pdf.cell(0, 8, f"{wo.equipment_id or 'N/A'} - {wo.technical_location or ''}", border=0, ln=True)
    
    pdf.cell(col_w, 8, "Type / Priorité:", border=0)
    pdf.cell(0, 8, f"{wo.type} / {wo.priority}", border=0, ln=True)
    
    pdf.cell(col_w, 8, "Technicien:", border=0)
    pdf.cell(0, 8, f"ID: {wo.technician_id}" if wo.technician_id else "Non assigné", border=0, ln=True)

    pdf.ln(10)
    
    # Dates & Time
    pdf.set_font("helvetica", "B", 14)
    pdf.cell(0, 10, "Planification & Temps", ln=True)
    pdf.set_font("helvetica", "", 11)
    pdf.cell(col_w, 8, "Date prévue:", border=0)
    pdf.cell(0, 8, str(wo.planned_start_date or 'N/A'), border=0, ln=True)
    pdf.cell(col_w, 8, "Temps passé:", border=0)
    pdf.cell(0, 8, f"{wo.time_spent or 0} heures", border=0, ln=True)

    pdf.ln(10)

    # Steps execution
    pdf.set_font("helvetica", "B", 14)
    pdf.cell(0, 10, "Étapes de l'intervention", ln=True)
    pdf.set_font("helvetica", "", 10)
    for step in wo.steps:
        status = "[X]" if step.is_done else "[ ]"
        pdf.cell(0, 7, f"{status} {step.description}", ln=True)

    pdf.ln(10)

    # Parts Table
    if wo.parts:
        pdf.set_font("helvetica", "B", 14)
        pdf.cell(0, 10, "Pièces Remplacées", ln=True)
        pdf.set_font("helvetica", "B", 10)
        pdf.set_fill_color(240, 240, 240)
        pdf.cell(30, 8, "Code", border=1, fill=True)
        pdf.cell(100, 8, "Désignation", border=1, fill=True)
        pdf.cell(30, 8, "Quantité", border=1, fill=True)
        pdf.ln()
        pdf.set_font("helvetica", "", 10)
        for p in wo.parts:
            pdf.cell(30, 7, str(p.part_code), border=1)
            pdf.cell(100, 7, str(p.part_name), border=1)
            pdf.cell(30, 7, str(p.quantity), border=1)
            pdf.ln()

    # Footer / Signatures
    pdf.set_y(-50)
    pdf.set_font("helvetica", "I", 10)
    pdf.cell(90, 10, "Signature Technicien", ln=0, align='L')
    pdf.cell(0, 10, "Validation Responsable", ln=1, align='R')
    pdf.ln(15)
    pdf.cell(90, 0, "_______________________", ln=0, align='L')
    pdf.cell(0, 0, "_______________________", ln=1, align='R')

    pdf_out = pdf.output()
    return Response(
        content=bytes(pdf_out),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=Rapport_OT_{wo_id}.pdf",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )
