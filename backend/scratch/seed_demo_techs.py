
import asyncio
from prisma import Prisma
import os
import sys
sys.path.append(os.getcwd())

async def seed_demo_techs():
    db = Prisma()
    await db.connect()

    techs = [
        {"name": "Marc Méca", "username": "marc_meca", "email": "marc.meca@gmao.tn", "role": "technician", "team": "Maint-Meca"},
        {"name": "Henri Hydra", "username": "henri_hydra", "email": "henri.hydra@gmao.tn", "role": "technician", "team": "Maint-Hydrique"},
        {"name": "Hubert HVAC", "username": "hubert_hvac", "email": "hubert.hvac@gmao.tn", "role": "technician", "team": "Utility-Hvac"},
        {"name": "Éric Élec", "username": "eric_elec", "email": "eric.elec@gmao.tn", "role": "technician", "team": "Maint-Elec"},
    ]

    created_ids = []
    for t in techs:
        user = await db.user.find_unique(where={"email": t["email"]})
        if not user:
            user = await db.user.create(data={
                "name": t["name"],
                "username": t["username"],
                "email": t["email"],
                "password_hash": "pbkdf2:sha256:260000$demo$hash", # password123
                "role": t["role"],
                "team": t["team"]
            })
            print(f"✅ Technicien créé : {t['name']}")
        else:
            print(f"ℹ️ Technicien déjà existant : {t['name']}")
        created_ids.append(user.id)

    # Réassigner tous les OTs de manière cyclique
    orders = await db.workorder.find_many()
    if orders:
        print(f"🔄 Réassignation de {len(orders)} OT...")
        for i, order in enumerate(orders):
            tech_id = created_ids[i % len(created_ids)]
            await db.workorder.update(
                where={"id": order.id},
                data={"technician_id": tech_id}
            )
        print("✨ Tous les OT ont été réassignés !")
    
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(seed_demo_techs())
