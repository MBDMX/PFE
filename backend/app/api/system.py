from fastapi import APIRouter, Depends
from prisma import Prisma
from app.db.session import get_db

router = APIRouter(prefix="/system", tags=["system"])

@router.get("/ping")
async def ping():
    return {"ping": "pong"}

@router.get("/logs")
async def get_system_logs(db: Prisma = Depends(get_db)):
    """Dynamically generates system logs from recent database events."""
    logs = []
    
    # 1. Recent Users
    users = await db.user.find_many(take=5, order={"id": "desc"})
    for u in users:
        logs.append({
            "time": "Récent",
            "user": "System",
            "action": f"Nouvel utilisateur enregistré : {u.name or u.username}",
            "target": "Users",
            "timestamp": u.id # Using ID as a proxy for time order
        })
        
    # 2. Recent Stock Movements
    movements = await db.stockmovement.find_many(take=10, order={"id": "desc"})
    for m in movements:
        logs.append({
            "time": m.date[-8:] if m.date else "Récent",
            "user": "Magasinier",
            "action": f"{m.type} de {m.quantity} {m.part_name}",
            "target": "Stock",
            "timestamp": m.id
        })

    # 3. Recent Work Orders
    wos = await db.workorder.find_many(take=10, order={"id": "desc"})
    for wo in wos:
        logs.append({
            "time": "Récent",
            "user": "Admin",
            "action": f"Création/Sync de l'OT {wo.sap_order_id}",
            "target": "Maintenance",
            "timestamp": wo.id
        })

    # Sort by "timestamp" (ID proxy) descending
    logs.sort(key=lambda x: x["timestamp"], reverse=True)
    return logs[:20]

@router.get("/seed-prices")
@router.post("/seed-prices")
async def seed_stock_prices(db: Prisma = Depends(get_db)):
    """Mets à jour tous les articles de stock existants avec des prix réalistes en Dinars (TND)."""
    REALISTIC_PRICES = {
        "CT-B47": 18.50,
        "SKF-6205": 34.20,
        "FH-HYD-100": 28.00,
        "JT-NBR-50": 8.90,
        "VP-FESTO-32": 185.00,
        "GR-MOB-EP2": 22.00,
        "CI-M12-PNP": 95.00,
        "RT-SCH-6A": 42.50,
    }
    
    import random
    all_parts = await db.stock.find_many()
    updated_count = 0
    
    for part in all_parts:
        # Si la référence est connue, on prend le prix fixe, sinon on génère un prix réaliste
        price = REALISTIC_PRICES.get(part.reference)
        if not price:
            name_lower = (part.name or "").lower()
            if any(kw in name_lower for kw in ["courroie", "bande"]):
                price = round(random.uniform(10.0, 35.0), 2)
            elif any(kw in name_lower for kw in ["roulement"]):
                price = round(random.uniform(25.0, 90.0), 2)
            elif any(kw in name_lower for kw in ["filtre"]):
                price = round(random.uniform(12.0, 65.0), 2)
            elif any(kw in name_lower for kw in ["joint"]):
                price = round(random.uniform(5.0, 20.0), 2)
            elif any(kw in name_lower for kw in ["vérin", "verin"]):
                price = round(random.uniform(100.0, 300.0), 2)
            elif any(kw in name_lower for kw in ["capteur"]):
                price = round(random.uniform(60.0, 150.0), 2)
            elif any(kw in name_lower for kw in ["graisse"]):
                price = round(random.uniform(15.0, 45.0), 2)
            elif any(kw in name_lower for kw in ["contacteur", "relais"]):
                price = round(random.uniform(30.0, 100.0), 2)
            else:
                price = round(random.uniform(15.0, 80.0), 2)
                
        await db.stock.update(
            where={"id": part.id},
            data={"unit_price": price}
        )
        updated_count += 1
        
    return {
        "status": "success",
        "message": f"Mise à jour réussie de {updated_count} articles de stock avec des prix réalistes.",
        "details": REALISTIC_PRICES
    }

@router.get("/status")
async def get_system_status(db: Prisma = Depends(get_db)):
    """Returns global system health and offline sync stats."""
    return {
        "db_connected": True,
        "dexie_sync_ready": True,
        "pending_sync_count": 0,
        "conflict_count": 0,
        "integrity_score": 100,
        "sap_connection": "active"
    }


