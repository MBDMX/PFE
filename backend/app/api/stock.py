from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from prisma import Prisma
from app.db.session import get_db
from app.sap.client import sap_client
from app.api.deps import role_required, get_current_user
from app.schemas.schemas import Stock as StockSchema, PartsRequestOut, StockMovement as StockMovementSchema
from app.core.websocket import manager
from app.core.ai_search import perform_smart_search
from app.core.image_service import get_image_url_for_part

router = APIRouter(tags=["stock-pro"])

@router.get("/debug")
async def debug_stock_images(db: Prisma = Depends(get_db)):
    """Endpoint de diagnostic : retourne les 10 premières pièces avec leur champ image."""
    items = await db.stock.find_many(take=10, order={"id": "asc"})
    return [
        {
            "id": it.id,
            "name": it.name,
            "reference": it.reference,
            "image": it.image,
            "has_image": bool(it.image)
        }
        for it in items
    ]

@router.post("/order")
async def order_stock(data: dict, db: Prisma = Depends(get_db)):
    """Simule une commande d'achat dans SAP pour un article."""
    qty = data.get("quantity", 1)
    return {"status": "success", "message": f"Commande de {qty} unité(s) transmise à SAP"}

@router.post("/sync-images")
async def sync_stock_images(db: Prisma = Depends(get_db)):
    """Assigne les images à TOUTES les pièces du stock (synchrone)."""
    all_parts = await db.stock.find_many()
    updated = 0
    for part in all_parts:
        img = get_image_url_for_part(part.name or "")
        await db.stock.update(where={"id": part.id}, data={"image": img})
        updated += 1
        print(f"📸 {part.name} → {img[:60]}")
    return {"status": "success", "updated": updated, "message": f"{updated} images assignées."}

@router.post("/sync-from-sap")
async def sync_stock_from_sap(db: Prisma = Depends(get_db)):
    """Importe les articles SAP et assigne les images IMMÉDIATEMENT (synchrone)."""
    items = []
    source = "SAP"
    try:
        # On tente le login SAP
        if sap_client.login_sl():
            items = sap_client.get_items(top=50)
        else:
            print("⚠️ SAP injoignable (login failed), passage rapide en mode DEMO.")
    except Exception as e:
        print(f"⚠️ SAP hors-ligne, mode DEMO : {e}")

    if not items:
        source = "DEMO"
        items = [
            {"ItemCode": "MOT-001", "ItemName": "Moteur Électrique Triphasé", "SalesUnitHeight": 1250.0},
            {"ItemCode": "PMP-HYD", "ItemName": "Pompe Hydraulique Haute Pression", "SalesUnitHeight": 850.0},
            {"ItemCode": "VRN-50",  "ItemName": "Vérin Pneumatique Double Effet",    "SalesUnitHeight": 420.0},
            {"ItemCode": "JNT-TOR", "ItemName": "Joint Torique Haute Température",   "SalesUnitHeight": 15.0},
            {"ItemCode": "VSS-M8",  "ItemName": "Vis à Métaux M8 Inox",              "SalesUnitHeight": 2.5},
            {"ItemCode": "BRM-IND", "ItemName": "Roulement à Billes Industriel",     "SalesUnitHeight": 120.0},
            {"ItemCode": "CUV-001", "ItemName": "Cuve Cristalisateur Inox",          "SalesUnitHeight": 3500.0},
        ]

    count = 0
    try:
        from app.core.image_service import get_image_url_for_part
        for it in items:
            ref = it.get("ItemCode")
            if not ref:
                continue
            name = it.get("ItemName", "Article")
            try:
                price = float(it.get("SalesUnitHeight") or 0.0)
            except:
                price = 0.0

            # Assigner l'image immédiatement à la création
            image_url = get_image_url_for_part(name)

            await db.stock.upsert(
                where={"reference": ref},
                data={
                    "create": {
                        "reference": ref,
                        "name": name,
                        "quantity": 15,
                        "unit_price": price,
                        "image": image_url,
                    },
                    "update": {
                        "name": name,
                        "unit_price": price,
                        "image": image_url,
                    }
                }
            )
            count += 1
            print(f"✅ [{source}] {name} → image={image_url[:50]}...")

        # Mettre à jour TOUTES les pièces existantes (pour réparer les anciennes images)
        print("🔄 Assignation/Réparation des images de toutes les pièces...")
        existing = await db.stock.find_many()
        for part in existing:
            img = get_image_url_for_part(part.name or "")
            await db.stock.update(where={"id": part.id}, data={"image": img})
            print(f"  📸 {part.name} → {img[:50]}...")

        return {
            "status": "success",
            "source": source,
            "message": f"{count} articles synchronisés avec images."
        }
    except Exception as e:
        print(f"❌ Erreur sync : {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=List[StockSchema])
async def get_stock(db: Prisma = Depends(get_db)):
    items = await db.stock.find_many()
    # On s'assure que les liens locaux sont complets pour le frontend
    for item in items:
        if item.image and item.image.startswith("/static/"):
            item.image = f"http://localhost:5000{item.image}"
    return items

@router.post("/{part_id}/ensure-image")
async def ensure_part_image(part_id: int, force: bool = False, db: Prisma = Depends(get_db)):
    """Déclenche le téléchargement d'une image si elle manque."""
    part = await db.stock.find_unique(where={"id": part_id})
    if not part:
        raise HTTPException(status_code=404, detail="Pièce non trouvée")
    
    # On force la génération/téléchargement asynchrone
    from app.core.image_service import get_image_url_for_part
    new_path = await get_image_url_for_part(part.name or "", str(part_id), force)
    
    if new_path:
        await db.stock.update(where={"id": part_id}, data={"image": new_path})
        full_url = f"http://localhost:5000{new_path}" if new_path.startswith("/static/") else new_path
        return {"status": "success", "image": full_url}
    
    return {"status": "error", "message": "Échec du téléchargement"}

@router.post("/search-ai")
async def search_stock_ai(data: dict, db: Prisma = Depends(get_db)):
    query = data.get("query", "")
    if not query:
        return []
    
    all_items = await db.stock.find_many()
    results = perform_smart_search(query, all_items)
    
    # Transformation pour le format attendu par le frontend
    return [
        {
            **r["item"].dict(),
            "search_score": r["score"],
            "search_reason": r["reason"]
        }
        for r in results
    ]

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
    
    # Notify storekeepers in real-time
    await manager.broadcast({"event": "NEW_PARTS_REQUEST", "id": new_request.id})
        
    return await db.partsrequest.find_unique(where={"id": new_request.id}, include={"items": True})

@pr_router.patch("/{req_id}/approve")
async def approve_parts_request(req_id: int, db: Prisma = Depends(get_db), current_user = Depends(role_required(["admin", "magasinier"]))):
    pr = await db.partsrequest.find_unique(where={"id": req_id}, include={"items": True})
    if not pr: raise HTTPException(status_code=404, detail="Demande introuvable")
    
    for it in pr.items:
        stock = await db.stock.find_first(where={"reference": it.part_code})
        if stock:
            qty = it.quantity_requested or 0
            new_qty = max(0, (stock.quantity or 0) - qty)
            await db.stock.update(where={"id": stock.id}, data={"quantity": new_qty})
            
            await db.stockmovement.create(data={
                "part_code": stock.reference,
                "part_name": stock.name,
                "quantity": qty,
                "type": "OUT",
                "date": datetime.utcnow().isoformat() + "Z",
                "user": {"connect": {"id": int(current_user.id if hasattr(current_user, 'id') else current_user['id'])}},
                "work_order": {"connect": {"id": pr.work_order_id}} if pr.work_order_id else None
            })
            
            # WorkOrderPart is created only when magasinier approves
            await db.workorderpart.create(data={
                "work_order": {"connect": {"id": pr.work_order_id}},
                "part_code": it.part_code,
                "part_name": it.part_name,
                "quantity": qty,
                "unit_price_at_consumption": stock.unit_price or 0.0
            })
            
            # Alert if stock goes critical
            if new_qty < 5:
                await manager.broadcast({
                    "event": "LOW_STOCK_ALERT",
                    "part_code": stock.reference,
                    "part_name": stock.name,
                    "quantity": new_qty
                })

    updated = await db.partsrequest.update(
        where={"id": req_id}, 
        data={
            "status": "approved",
            "approved_at": datetime.utcnow().isoformat() + "Z",
            "approved_by": int(current_user.id if hasattr(current_user, 'id') else current_user['id'])
        }
    )
    
    # Broadcast rich event — frontend notifies the requester
    await manager.broadcast({
        "event": "PARTS_APPROVED",
        "id": req_id,
        "wo_id": pr.work_order_id,
        "requester_id": pr.requested_by
    })
    await manager.broadcast({"event": "PARTS_REQUEST_UPDATED", "id": req_id, "status": "approved"})
    await manager.broadcast({"event": "STOCK_UPDATED"})
    await manager.broadcast({"event": "WORK_ORDER_UPDATED", "id": pr.work_order_id})
    return updated

@pr_router.patch("/{req_id}/reject")
async def reject_parts_request(req_id: int, data: dict, db: Prisma = Depends(get_db), current_user = Depends(role_required(["admin", "magasinier"]))):
    pr = await db.partsrequest.find_unique(where={"id": req_id})
    updated = await db.partsrequest.update(where={"id": req_id}, data={
        "status": "rejected", 
        "rejection_reason": data.get("reason", ""),
        "approved_at": datetime.utcnow().isoformat() + "Z",
        "approved_by": int(current_user.id if hasattr(current_user, 'id') else current_user['id'])
    })
    await manager.broadcast({
        "event": "PARTS_REJECTED",
        "id": req_id,
        "wo_id": pr.work_order_id if pr else None,
        "requester_id": pr.requested_by if pr else None,
        "reason": data.get("reason", "")
    })
    await manager.broadcast({"event": "PARTS_REQUEST_UPDATED", "id": req_id, "status": "rejected"})
    return updated

@pr_router.get("/pending-count")
async def get_pending_parts_requests_count(db: Prisma = Depends(get_db), current_user = Depends(get_current_user)):
    """Returns the count of pending parts requests. Used for sidebar notification badges."""
    user_id = int(current_user.id if hasattr(current_user, 'id') else current_user['id'])
    role = current_user.role if hasattr(current_user, 'role') else current_user.get('role', '')
    
    if role in ('magasinier', 'admin'):
        # All pending requests
        count = await db.partsrequest.count(where={"status": "pending"})
    else:
        # My pending requests (as requester)
        count = await db.partsrequest.count(where={"requested_by": user_id, "status": "pending"})
    
    return {"count": count, "role": role}
