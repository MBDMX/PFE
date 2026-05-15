import sys
import os
sys.path.append(os.getcwd())
from app.sap.client import sap_client
from dotenv import load_dotenv
import asyncio
from prisma import Prisma

load_dotenv()

async def repair_ot_11():
    db = Prisma()
    await db.connect()
    
    # 1. Trouver l'OT #11
    order = await db.workorder.find_first(where={"sap_order_id": "11"})
    if not order:
        print("❌ OT #11 non trouvé en base locale.")
        await db.disconnect()
        return

    print(f"🛠 Réparation de l'OT #{order.id} (SAP #11)...")
    
    # 2. Nettoyer les étapes
    await db.workorderstep.delete_many(where={"work_order_id": order.id})
    
    # 3. Injecter les étapes virtuelles
    virtual_steps = [
        "Vérification générale de l'unité",
        "Nettoyage des filtres et conduits",
        "Test de montée en température",
        "Validation finale et signature"
    ]
    
    for i, v_step in enumerate(virtual_steps):
        await db.workorderstep.create(data={
            "description": v_step,
            "work_order_id": order.id,
            "is_done": False,
            "order_index": i
        })
    
    # 4. Corriger la date si nécessaire
    await db.workorder.update(
        where={"id": order.id},
        data={"planned_start_date": "2024-05-01 08:30"}
    )
    
    print("✅ Réparation terminée ! Les étapes devraient être visibles.")
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(repair_ot_11())
