from fastapi import APIRouter, Depends
from prisma import Prisma
from app.db.session import get_db

router = APIRouter(prefix="/system", tags=["system"])

@router.get("/ping")
async def ping():
    return {"ping": "pong"}

@router.post("/reset")
async def reset_system(db: Prisma = Depends(get_db)):
    """Resets the entire database to the original seed state."""
    await db.stockmovement.delete_many()
    await db.partsrequestitem.delete_many()
    await db.partsrequest.delete_many()
    await db.workorderstep.delete_many()
    await db.workorderpart.delete_many()
    await db.workorder.delete_many()
    await db.stock.delete_many()
    await db.machine.delete_many()
    await db.user.delete_many()
    
    from app.db.seed import execute_seed_data
    await execute_seed_data(db)
    
    return {"status": "success", "message": "Système GMAO réinitialisé à zéro avec succès."}
