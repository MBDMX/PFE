import asyncio
from prisma import Prisma
from datetime import date, timedelta

async def fix_dates():
    db = Prisma()
    await db.connect()

    # On fixe la date pour l'OT #15 (le préventif récent)
    # Prochaine date = 2026-06-16
    await db.workorder.update_many(
        where={"sap_order_id": "PM-LOC-44"}, # ou l'ID réel
        data={"planned_start_date": "2026-06-16"}
    )
    
    # On répare aussi l'ID 15 directement au cas où
    await db.workorder.update(
        where={"id": 15},
        data={"planned_start_date": "2026-06-16"}
    )

    # On répare l'OT #14 (le correctif) avec la date d'aujourd'hui
    await db.workorder.update(
        where={"id": 14},
        data={"planned_start_date": "2026-05-02"}
    )

    print("✅ Dates de l'historique réparées pour la machine 44.")
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(fix_dates())
