from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from prisma import Prisma
from app.db.session import get_db, prisma
from app.sap.client import sap_client
from app.api.deps import role_required, get_current_user
from app.schemas.schemas import Stock as StockSchema, PartsRequestOut, StockMovement as StockMovementSchema
from app.core.websocket import manager
from app.core.ai_search import perform_smart_search
from app.core.serpapi_image_service import get_part_image_b64

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

@router.post("/{part_id}/order-sap")
async def order_part_via_sap(part_id: int, quantity: float = 1.0, db: Prisma = Depends(get_db), current_user = Depends(get_current_user)):
    """Crée une vraie demande d'achat dans SAP pour cette pièce avec traçabilité."""
    part = await db.stock.find_unique(where={"id": part_id})
    if not part:
        raise HTTPException(status_code=404, detail="Pièce introuvable")
    
    # Récupération du nom de l'utilisateur (Traceability)
    user_name = getattr(current_user, 'name', 'Utilisateur GMAO')
    
    # Appel à SAP avec traçabilité
    result = sap_client.create_purchase_request(
        item_code=part.reference, 
        quantity=quantity,
        user_name=user_name,
        remarks=f"Commande urgente via GMAO"
    )
    
    if result:
        doc_num = result.get("DocNum")
        return {
            "status": "success", 
            "message": f"Demande d'achat SAP #{doc_num} créée avec succès !",
            "sap_doc": doc_num
        }
    
    raise HTTPException(status_code=500, detail="Échec de la création dans SAP. Vérifiez la connexion SAP.")

@router.post("/transfer-sap")
async def transfer_stock_via_sap(data: dict, db: Prisma = Depends(get_db), current_user = Depends(get_current_user)):
    """Crée un transfert de stock entre deux magasins SAP."""
    item_code = data.get("item_code")
    quantity = data.get("quantity", 1.0)
    from_wh = data.get("from_wh", "01") # Magasin Central par défaut
    to_wh = data.get("to_wh", "02")     # Magasin Maintenance par défaut
    
    user_name = getattr(current_user, 'name', 'Utilisateur GMAO')
    
    result = sap_client.create_stock_transfer(
        item_code=item_code,
        quantity=quantity,
        from_wh=from_wh,
        to_wh=to_wh,
        remarks=f"Transfert effectué par {user_name} via GMAO App"
    )
    
    if result:
        return {"status": "success", "message": "Transfert SAP validé !", "sap_doc": result.get("DocNum")}
    
    raise HTTPException(status_code=500, detail="Échec du transfert dans SAP.")

@router.post("/order")
async def order_stock(data: dict, db: Prisma = Depends(get_db)):
    """Simule une commande d'achat dans SAP pour un article."""
    qty = data.get("quantity", 1)
    return {"status": "success", "message": f"Commande de {qty} unité(s) transmise à SAP"}

_bg_running = False  # Verrou global pour éviter les doubles exécutions

async def _bg_download_all_images(force: bool = False):
    """Tâche de fond : télécharge les images Wikimedia (base64)."""
    global _bg_running
    if _bg_running:
        print("⏳ [BG] Téléchargement déjà en cours, on ignore.")
        return
    _bg_running = True
    print(f"🖼️ [BG] Démarrage du téléchargement Wikimedia (Base64) - Force={force}...")
    try:
        # Récupère les pièces (toutes si force, sinon seulement celles sans image)
        where_clause = {} if force else {"OR": [{"image": None}, {"image": ""}]}
        all_parts = await prisma.stock.find_many(
            where=where_clause,
            order={"id": "asc"}
        )
        total = len(all_parts)
        print(f"   🔍 {total} images à traiter...")
        
        done = 0
        for part in all_parts:
            # Safe access to category (prevents crash if DB migration is pending)
            cat = getattr(part, 'category', None)
            b64_data = await get_part_image_b64(part.name or "industrial part", cat)
            if b64_data:
                await prisma.stock.update(
                    where={"id": part.id},
                    data={"image": b64_data}
                )
            done += 1
            if done % 5 == 0 or done == total:
                print(f"   ✅ [{done}/{total}] Images traitées")
                
    except Exception as e:
        print(f"❌ [BG] Erreur: {e}")
    finally:
        _bg_running = False
        print("✅ [BG] Session SerpApi (Google Images) terminée.")


@router.post("/{part_id}/fetch-image")
async def fetch_image_for_part(part_id: int, force: bool = False, db: Prisma = Depends(get_db)):
    """Force le téléchargement de l'image pour une pièce spécifique."""
    part = await db.stock.find_unique(where={"id": part_id})
    if not part:
        raise HTTPException(status_code=404, detail="Pièce introuvable")
    
    if part.image and not force:
        return {"status": "skipped", "message": "Image déjà présente"}

    # Safe access to category
    cat = getattr(part, 'category', None)
    b64_data = await get_part_image_b64(part.name or "industrial part", cat)
    if b64_data:
        await db.stock.update(where={"id": part_id}, data={"image": b64_data})
        return {"status": "success", "message": "Image mise à jour"}
    
    raise HTTPException(status_code=404, detail="Aucune image trouvée sur Wikimedia")


@router.patch("/{part_id}/verify")
async def verify_part_image(part_id: int, db: Prisma = Depends(get_db)):
    """Boucle de Feedback : Marque l'image comme vérifiée par un humain."""
    part = await db.stock.find_unique(where={"id": part_id})
    if not part:
        raise HTTPException(status_code=404, detail="Pièce introuvable")
    
    updated = await db.stock.update(
        where={"id": part_id},
        data={"image_verified": True}
    )
    return {"status": "success", "message": "Image validée comme Source de Vérité", "item": updated}


@router.post("/sync-images")
async def sync_stock_images(background_tasks: BackgroundTasks, force: bool = False, db: Prisma = Depends(get_db)):
    """Lance le téléchargement des images en arrière-plan (ne bloque pas l'utilisateur)."""
    total = await db.stock.count()
    background_tasks.add_task(_bg_download_all_images, force=force)
    return {"status": "started", "message": f"Téléchargement de {total} images lancé en arrière-plan (Force={force})."}


@router.post("/sync-from-sap")
async def sync_stock_from_sap(background_tasks: BackgroundTasks, db: Prisma = Depends(get_db)):
    """Importe les articles SAP et lance le téléchargement des images en arrière-plan."""
    items = []
    source = "SAP"
    try:
        if sap_client.login_sl():
            items = sap_client.get_items(top=200)
        else:
            print("⚠️ SAP injoignable, mode DEMO.")
    except Exception as e:
        print(f"⚠️ SAP hors-ligne, mode DEMO : {e}")

    if not items:
        source = "DEMO"
        items = [
            {"ItemCode": "MOT-001", "ItemName": "Moteur Électrique Triphasé",       "SalesUnitHeight": 1250.0},
            {"ItemCode": "PMP-HYD", "ItemName": "Pompe Hydraulique Haute Pression",  "SalesUnitHeight": 850.0},
            {"ItemCode": "VRN-50",  "ItemName": "Vérin Pneumatique Double Effet",    "SalesUnitHeight": 420.0},
            {"ItemCode": "JNT-TOR", "ItemName": "Joint Torique Haute Température",   "SalesUnitHeight": 15.0},
            {"ItemCode": "VSS-M8",  "ItemName": "Vis à Métaux M8 Inox",              "SalesUnitHeight": 2.5},
            {"ItemCode": "BRM-IND", "ItemName": "Roulement à Billes Industriel",     "SalesUnitHeight": 120.0},
            {"ItemCode": "CUV-001", "ItemName": "Cuve Cristalisateur Inox",          "SalesUnitHeight": 3500.0},
        ]

    count = 0
    try:
        for it in items:
            ref = it.get("ItemCode")
            if not ref:
                continue
            name = it.get("ItemName", "Article")
            try:
                price = float(it.get("SalesUnitHeight") or 0.0)
            except Exception:
                price = 0.0

            # Upsert items from SAP/Demo. Images will be fetched in background.
            await db.stock.upsert(
                where={"reference": ref},
                data={
                    "create": {"reference": ref, "name": name, "quantity": 15, "unit_price": price, "image": None},
                    "update": {"name": name, "unit_price": price}
                }
            )
            count += 1

        # ✅ Répond immédiatement à l'utilisateur, images chargées en fond
        background_tasks.add_task(_bg_download_all_images)
        print(f"✅ [{source}] {count} articles synchronisés. Images en cours...")

        return {
            "status": "success",
            "source": source,
            "message": f"{count} articles synchronisés. Images en cours de téléchargement ⚙️"
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
    
    # Enrichment for the frontend (including stock_id for images)
    enriched = []
    for r in reqs:
        items_with_stock = []
        for it in r.items:
            stock = await db.stock.find_first(where={"reference": it.part_code})
            items_with_stock.append({
                **it.dict(),
                "stock_id": stock.id if stock else None
            })
            
        enriched.append({
            **r.dict(),
            "items": items_with_stock,
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
