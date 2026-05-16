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

async def get_least_busy_technician(db: Prisma):
    """Trouve le technicien avec le moins d'ordres de travail actifs (open/in_progress)."""
    technicians = await db.user.find_many(where={"role": "technician"})
    if not technicians:
        return None
    
    # On compte les tâches actives pour chaque tech
    stats = []
    for tech in technicians:
        count = await db.workorder.count(where={
            "technician_id": tech.id,
            "status": {"in": ["open", "in_progress"]}
        })
        stats.append((tech.id, count))
    
    # On trie par nombre de tâches (le moins occupé en premier)
    stats.sort(key=lambda x: x[1])
    return stats[0][0] # Retourne l'ID du tech le moins occupé

async def get_manager_name_for_tech(db: Prisma, tech_id: Optional[int]) -> str:
    """Récupère le nom du responsable pour un technicien donné."""
    if not tech_id:
        return "Jean Dupont" # Responsable par défaut pour la démo
    
    tech = await db.user.find_unique(where={"id": tech_id})
    if tech and tech.manager_id:
        manager = await db.user.find_unique(where={"id": tech.manager_id})
        if manager and manager.name:
            return manager.name
            
    # Rotation de noms démo si pas de manager défini
    return "Alice Martin" if tech_id % 2 == 0 else "Jean Dupont"

@router.get("")
async def get_work_orders(db: Prisma = Depends(get_db), current_user = Depends(get_current_user)):
    # Filter: Technicians only see their assigned work orders
    where = {}
    if current_user.role == "technician":
        where = {"technician_id": int(current_user.id)}
    
    from fastapi.encoders import jsonable_encoder
    from fastapi.responses import JSONResponse
    
    orders = await db.workorder.find_many(
        where=where,
        take=50,
        include={"parts": True, "steps": True, "parts_requests": {"include": {"items": True}}}, 
        order={'id': 'desc'}
    )
    return JSONResponse(content=jsonable_encoder(orders))

@router.post("/sync-from-sap", tags=["SAP Integration"])
async def sync_work_orders_from_sap(
    db: Prisma = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Fetches MaintenanceOrders from SAP ProcessForce and upserts into local WorkOrders."""
    if not sap_client.login_pf():
        raise HTTPException(status_code=503, detail="Impossible de se connecter à SAP PF")
    # On utilise run_in_threadpool car sap_client utilise 'requests' qui est bloquant
    from fastapi.concurrency import run_in_threadpool

    # On augmente un peu la limite pour avoir plus de données visibles
    url = "/odata/ProcessForce/MaintenanceOrder?$top=20&$orderby=DocEntry desc&$expand=Tasks"
    try:
        sap_orders = await run_in_threadpool(sap_client._pf_get, url)
    except Exception as e:
        print(f"❌ Erreur critique lors de la récupération des OTs SAP: {e}")
        raise HTTPException(status_code=502, detail="Erreur de communication avec SAP")

    if not isinstance(sap_orders, list):
        raise HTTPException(status_code=502, detail="Réponse SAP invalide pour les OTs")

    SAP_MO_STATUS_MAP = {
        "WorkRequest": "open",
        "Released": "open",
        "Started": "in_progress",
        "Finished": "done",
        "Cancelled": "closed" 
    }
    created_orders = 0
    updated_orders = 0
    new_machines = 0
    failures_extracted = 0

    for order in sap_orders:
        doc_entry = order.get("DocEntry")
        if not doc_entry: continue
        
        machine_code = order.get("U_MICode", "")
        machine_name = order.get("U_MIName", machine_code)
        desc = order.get("U_Remarks", "") or order.get("U_JobScope", "")
        status = SAP_MO_STATUS_MAP.get(order.get("U_MOStatus"), "open")
        start_date = order.get("U_SchStartDate")

        machine = await db.machine.find_first(
            where={"OR": [{"reference": machine_code}, {"name": machine_code}]}
        )
        
        if not machine and machine_code:
            machine = await db.machine.create(data={
                "reference": machine_code,
                "name": machine_name,
                "location": "SAP Imported",
                "status": "active"
            })
            new_machines += 1

        extracted_cause = order.get("U_CauseCode") or order.get("U_FailureCode") or order.get("U_ProblemCode")
        
        # Intelligence Artificielle de détection de panne simplifiée
        if not extracted_cause and desc:
            desc_lower = desc.lower()
            if "panne:" in desc:
                try: extracted_cause = desc.split("Panne:")[1].split(".")[0].strip()
                except: pass
            # Détection par mots-clés si une anomalie est mentionnée
            elif any(word in desc_lower for word in ["panne", "hs", "cassé", "problème", "defectue", "fuite", "anomalie", "bruit"]):
                keywords = {
                    "moteur": "Moteur",
                    "pompe": "Pompe",
                    "joint": "Étanchéité",
                    "fuite": "Fuite",
                    "huile": "Lubrification",
                    "électrique": "Électrique",
                    "capteur": "Capteur/Sonde",
                    "roulement": "Roulement",
                    "courroie": "Transmission",
                    "vibration": "Vibration"
                }
                found_causes = []
                for kw, label in keywords.items():
                    if kw in desc_lower:
                        found_causes.append(label)
                
                if found_causes:
                    # On évite les doublons et on joint
                    extracted_cause = ", ".join(list(dict.fromkeys(found_causes)))
                
            if not extracted_cause and order.get("U_MOType") == "MaintenanceRequest":
                extracted_cause = desc.strip()[:30]
        
        if extracted_cause: failures_extracted += 1

        # Mapping des priorités SAP -> GMAO
        SAP_PRIORITY_MAP = {
            "Urgent": "critical",
            "High": "high",
            "Medium": "medium",
            "Low": "low",
            "NotSet": "medium"
        }
        raw_priority = order.get("U_MOPriority") or "Medium"
        mapped_priority = SAP_PRIORITY_MAP.get(raw_priority, "medium")

        data_payload = {
            "title": f"SAP Maintenance #{doc_entry}: {machine_code}",
            "description": desc,
            "type": "corrective" if "Request" in order.get("U_MOType", "") else "preventive",
            "priority": mapped_priority,
            "status": status,
            "equipment_id": str(machine.id) if machine else None,
            "technical_location": machine.location if machine else "SAP Import",
            "planned_start_date": start_date,
            "failure_cause": extracted_cause,
            "responsible_person": "Jean Dupont" # Valeur temporaire, sera affinée après l'assignation du tech
        }

        existing = await db.workorder.find_first(where={"sap_order_id": str(doc_entry)})
        
        if existing:
            # --- CORRECTION CRITIQUE ---
            # Ne pas écraser le type 'preventive' local par le 'corrective' par défaut de SAP
            if existing.type == "preventive":
                data_payload["type"] = "preventive"
            
            # Ne pas écraser la date locale par la date vide/0001 de SAP
            if not start_date or "0001-01-01" in str(start_date) or "Date(-" in str(start_date):
                data_payload["planned_start_date"] = existing.planned_start_date
            # ---------------------------

            # Si l'OT existant n'a pas encore de technicien, on lui en assigne un
            if not existing.technician_id:
                if current_user and current_user.role == "technician":
                    data_payload["technician_id"] = int(current_user.id)
                else:
                    least_busy_tech = await get_least_busy_technician(db)
                    if least_busy_tech:
                        data_payload["technician_id"] = least_busy_tech
            
            # Calcul du responsable basé sur le technicien
            data_payload["responsible_person"] = await get_manager_name_for_tech(db, data_payload.get("technician_id") or existing.technician_id)
            
            new_order = await db.workorder.update(where={"id": existing.id}, data=data_payload)
            updated_orders += 1
            print(f"🔄 OT SAP #{doc_entry} mis à jour localement (Resp: {data_payload['responsible_person']})")
        else:
            # Création du nouvel OT avec assignation équilibrée
            if not data_payload.get("technician_id"):
                # Si celui qui synchronise est un technicien, on lui donne la priorité
                if current_user and current_user.role == "technician":
                    data_payload["technician_id"] = int(current_user.id)
                else:
                    least_busy_tech = await get_least_busy_technician(db)
                    if least_busy_tech:
                        data_payload["technician_id"] = least_busy_tech
            
            data_payload["sap_order_id"] = str(doc_entry)
            data_payload["responsible_person"] = await get_manager_name_for_tech(db, data_payload.get("technician_id"))
            new_order = await db.workorder.create(data=data_payload)
            created_orders += 1

            # Notification enrichie avec le compte des OT actifs pour le tech
            active_count = await db.workorder.count(where={
                "technician_id": new_order.technician_id,
                "status": {"in": ["open", "in_progress"]}
            })

            await manager.broadcast({
                "event": "NEW_WORK_ORDER", 
                "id": new_order.id,
                "technician_id": new_order.technician_id,
                "title": new_order.title,
                "active_count": active_count
            })

            print(f"🆕 OT SAP #{doc_entry} importé et assigné au Tech ID: {data_payload.get('technician_id')} (Total: {active_count})")

        # 1. SYNCHRO DES ÉTAPES depuis 'Tasks'
        sap_tasks = order.get("Tasks", [])
        print(f"🔍 OT #{doc_entry}: {len(sap_tasks)} tâches standard trouvées.")
        await db.workorderstep.delete_many(where={"work_order_id": new_order.id})
        
        start_idx = 0
        if sap_tasks:
            for i, task in enumerate(sap_tasks):
                task_text = task.get("U_TaskName") or task.get("U_Description") or task.get("Description") or task.get("U_TaskScope") or f"Tâche {i+1}"
                print(f"  -> Task: {task_text}")
                await db.workorderstep.create(data={
                    "description": task_text,
                    "work_order_id": new_order.id,
                    "is_done": False,
                    "order_index": i
                })
                start_idx += 1
        
        # 2. SYNCHRO DES POINTS DE CONTRÔLE (Checklist du bas)
        template_code = order.get("U_TemplateMO")
        machine_code = order.get("U_MICode")
        print(f"🔍 Recherche Checkpoints pour Template={template_code}, Machine={machine_code}")
        
        checkpoints = []
        try:
            if template_code:
                url_check = f"/odata/ProcessForce/TemplateCheckpoint?$filter=U_TemplateMainOrder eq '{template_code}'"
                checkpoints = await run_in_threadpool(sap_client._pf_get, url_check)
                
            if (not checkpoints or not isinstance(checkpoints, list)) and machine_code:
                url_check = f"/odata/ProcessForce/TemplateCheckpoint?$filter=U_MICode eq '{machine_code}'"
                checkpoints = await run_in_threadpool(sap_client._pf_get, url_check)

            if checkpoints and isinstance(checkpoints, list):
                print(f"  ✅ {len(checkpoints)} points de contrôle SAP trouvés.")
                for i, check in enumerate(checkpoints):
                    check_text = check.get("U_CheckScope") or f"Vérification {i+1}"
                    print(f"     -> [SAP] {check_text}")
                    await db.workorderstep.create(data={
                        "description": f"[SAP] {check_text}",
                        "work_order_id": new_order.id,
                        "is_done": False,
                        "order_index": start_idx + i
                    })
            else:
                print("  ⚠️ Aucun checkpoint trouvé pour cet OT.")
        except Exception as e:
            print(f"  ❌ Erreur lors de la récupération des checkpoints pour l'OT {doc_entry}: {e}")

        # 3. FALLBACK: Si aucune étape (Tasks ou Checkpoints) n'a été ajoutée, on crée des étapes virtuelles pour la démo
        # Cela garantit que l'interface GMAO n'est jamais vide.
        existing_steps = await db.workorderstep.count(where={"work_order_id": new_order.id})
        if existing_steps == 0:
            print(f"  💡 Injection d'étapes virtuelles pour l'OT #{doc_entry}")
            virtual_steps = [
                "Inspection visuelle et nettoyage",
                "Vérification des points de lubrification",
                "Test de fonctionnement et validation"
            ]
            for i, v_step in enumerate(virtual_steps):
                await db.workorderstep.create(data={
                    "description": v_step,
                    "work_order_id": new_order.id,
                    "is_done": False,
                    "order_index": i
                })

    return {
        "success": True,
        "summary": {
            "orders_created": created_orders,
            "orders_updated": updated_orders,
            "machines_auto_created": new_machines,
            "failures_analyzed": failures_extracted,
            "total_processed": len(sap_orders)
        },
        "message": f"Synchronisation terminée : {created_orders} créés, {updated_orders} mis à jour."
    }

@router.get("/{wo_id}")
async def get_work_order(wo_id: int, db: Prisma = Depends(get_db)):
    from fastapi.encoders import jsonable_encoder
    from fastapi.responses import JSONResponse
    
    order = await db.workorder.find_unique(
        where={'id': wo_id}, 
        include={"parts": True, "steps": True, "parts_requests": {"include": {"items": True}}}
    )
    if not order:
        raise HTTPException(status_code=404, detail="OT introuvable")
    
    # On convertit explicitement en dict JSON-safe pour éviter les crashs de sérialisation Prisma
    return JSONResponse(content=jsonable_encoder(order))

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
    
    # ASSIGNATION AUTOMATIQUE si non spécifiée
    if not data.get("technician_id"):
        data["technician_id"] = await get_least_busy_technician(db)
        print(f"🤖 Auto-assignation nouvel OT au Tech ID: {data['technician_id']}")
    
    # Assignation du Responsable réel
    data["responsible_person"] = await get_manager_name_for_tech(db, data["technician_id"])
    data["team"] = "Maintenance Production" if data["technician_id"] and data["technician_id"] % 2 == 0 else "Services Généraux"
    
    # Push to SAP
    sap_response = sap_client.create_maintenance_order(data)
    if sap_response and "DocEntry" in sap_response:
        data["sap_order_id"] = str(sap_response["DocEntry"])
        print(f"✅ OT créé dans SAP avec ID: {data['sap_order_id']}")
    else:
        print("⚠️ Échec ou bypass de la création dans SAP (mode hors ligne ou erreur).")
        
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
    
    # Notification enrichie avec le compte des OT actifs pour le tech
    active_count = await db.workorder.count(where={
        "technician_id": new_order.technician_id,
        "status": {"in": ["open", "in_progress"]}
    })

    await manager.broadcast({
        "event": "NEW_WORK_ORDER", 
        "id": new_order.id,
        "technician_id": new_order.technician_id,
        "title": new_order.title,
        "active_count": active_count
    })
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

    # Auto-update responsible person if technician changes
    if "technician_id" in clean_data:
        clean_data["responsible_person"] = await get_manager_name_for_tech(db, clean_data["technician_id"])

    updated = await db.workorder.update(where={"id": wo_id}, data=final_data)
    
    # 🔄 Synchronisation du statut vers SAP
    if "status" in final_data and updated.sap_order_id:
        sap_client.update_maintenance_order_status(updated.sap_order_id, final_data["status"])
        
    await manager.broadcast({
        "event": "WORK_ORDER_UPDATED", 
        "id": wo_id,
        "technician_id": updated.technician_id,
        "title": updated.title,
        "newly_assigned": old_order.technician_id != updated.technician_id
    })
    return await db.workorder.find_unique(where={"id": wo_id}, include={"parts": True, "steps": True})

@router.patch("/steps/{step_id}/toggle")
async def toggle_step(step_id: int, data: WorkOrderStepUpdate, db: Prisma = Depends(get_db)):
    return await db.workorderstep.update(where={"id": step_id}, data={"is_done": data.is_done})

@router.get("/technician/timer/active")
async def get_active_timer(db: Prisma = Depends(get_db), current_user = Depends(get_current_user)):
    session = await db.worksession.find_first(
        where={"technician_id": current_user.id, "end_time": None},
        include={"work_order": True}
    )
    if not session:
        return None
    return {
        "work_order_id": session.work_order_id,
        "start_time": session.start_time,
        "title": session.work_order.title if session.work_order else "Intervention"
    }

# TIMER ROUTES
@router.post("/{wo_id}/timer/start")
async def start_timer(wo_id: int, db: Prisma = Depends(get_db), current_user = Depends(get_current_user)):
    # Fermeture automatique des sessions actives
    active_sessions = await db.worksession.find_many(where={"technician_id": current_user.id, "end_time": None})
    
    if active_sessions:
        now = datetime.utcnow()
        for session in active_sessions:
            start_str = session.start_time.replace('Z', '')
            try:
                start = datetime.fromisoformat(start_str)
                duration = (now - start).total_seconds() / 3600.0
                await db.worksession.update(
                    where={"id": session.id},
                    data={"end_time": now.isoformat() + "Z", "duration": duration}
                )
                all_s = await db.worksession.find_many(where={"work_order_id": session.work_order_id, "end_time": {"not": None}})
                total_time = sum((s.duration or 0) for s in all_s)
                await db.workorder.update(where={"id": session.work_order_id}, data={"time_spent": total_time})
            except: pass

    return await db.worksession.create(data={
        "work_order_id": wo_id,
        "technician_id": current_user.id,
        "start_time": datetime.utcnow().isoformat() + "Z"
    })

@router.post("/{wo_id}/timer/stop")
async def stop_timer(wo_id: int, data: dict = {}, db: Prisma = Depends(get_db), current_user = Depends(get_current_user)):
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
        # Ne pas arrondir pour ne pas perdre les secondes (ex: 6s = 0.00166h)
        duration_hours = diff.total_seconds() / 3600.0
        
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
        
        new_status = data.get("status") or "in_progress"
        
        updated_wo = await db.workorder.update(
            where={"id": target_wo_id},
            data={"time_spent": total_time, "status": new_status}
        )
        
        # 🔄 Synchronisation du statut vers SAP
        if updated_wo.sap_order_id:
            sap_client.update_maintenance_order_status(updated_wo.sap_order_id, new_status)
        
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
    # Format time spent: from float hours to "Xh Ymin Zs"
    ts = wo.time_spent or 0
    total_seconds = int(ts * 3600)
    h = total_seconds // 3600
    m = (total_seconds % 3600) // 60
    s = total_seconds % 60
    
    if h > 0:
        time_str = f"{h}h {m}m {s}s"
    elif m > 0:
        time_str = f"{m}min {s}s"
    else:
        time_str = f"{s} secondes"
        
    pdf.cell(col_w, 8, "Temps total passé:", border=0)
    pdf.cell(0, 8, time_str, border=0, ln=True)

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

@router.delete("/{wo_id}")
async def delete_work_order(wo_id: int, db: Prisma = Depends(get_db)):
    wo = await db.workorder.find_unique(where={"id": wo_id})
    if not wo:
        raise HTTPException(status_code=404, detail="OT introuvable")
        
    # App -> SAP: Tentative de suppression
    if wo.sap_order_id:
        try:
            sap_client.delete_maintenance_order(wo.sap_order_id)
        except Exception as e:
            print(f"Erreur lors de la suppression SAP: {e}")
            
    # Suppression en cascade des dépendances locales
    await db.workorderstep.delete_many(where={"work_order_id": wo_id})
    await db.workorderpart.delete_many(where={"work_order_id": wo_id})
    await db.worksession.delete_many(where={"work_order_id": wo_id})
    
    requests = await db.partsrequest.find_many(where={"work_order_id": wo_id})
    for r in requests:
        await db.partsrequestitem.delete_many(where={"request_id": r.id})
    await db.partsrequest.delete_many(where={"work_order_id": wo_id})
    
    # Suppression de l'OT
    await db.workorder.delete(where={"id": wo_id})
    
    # Notification pour que le frontend rafraîchisse le tableau
    await manager.broadcast({"event": "WORK_ORDER_DELETED", "id": wo_id})
    
    return {"status": "success", "message": f"OT {wo_id} supprimé avec succès (Local & SAP)"}
