import asyncio
import sys
import os
sys.path.append(os.getcwd())
from prisma import Prisma

async def check_wo():
    db = Prisma()
    await db.connect()
    
    wo = await db.workorder.find_unique(
        where={'id': 1},
        include={'steps': True}
    )
    
    if wo:
        print(f"✅ OT local trouvé (ID: 1)")
        print(f"🔹 Titre : {wo.title}")
        print(f"🔹 SAP Order ID : {wo.sap_order_id}")
        print(f"🔹 Nombre d'étapes locales : {len(wo.steps)}")
        for step in wo.steps:
            print(f"   - {step.description} (Done: {step.is_done})")
    else:
        print("❌ OT local ID: 1 introuvable.")
        
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(check_wo())
