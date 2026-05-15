
import asyncio
from prisma import Prisma
import os
import sys
sys.path.append(os.getcwd())
from app.core.security import get_password_hash

async def fix_tech_logins():
    db = Prisma()
    await db.connect()
    
    print("🧹 Nettoyage des techniciens...")
    await db.user.delete_many(where={"role": "technician"})

    techs = [
        {"name": "Marc Méca", "username": "tech_meca", "email": "marc.meca@gmao.tn", "team": "Maint-Meca"},
        {"name": "Henri Hydra", "username": "tech_hydra", "email": "henri.hydra@gmao.tn", "team": "Maint-Hydrique"},
        {"name": "Hubert HVAC", "username": "tech_hvac", "email": "hubert.hvac@gmao.tn", "team": "Utility-Hvac"},
        {"name": "Éric Élec", "username": "tech_elec", "email": "eric.elec@gmao.tn", "team": "Maint-Elec"},
    ]

    # Utilisation de ta fonction get_password_hash interne
    password_hash = get_password_hash("password")

    print("🌱 Création des techniciens officiels (username du README)...")
    for t in techs:
        await db.user.create(data={
            "name": t["name"],
            "username": t["username"],
            "email": t["email"],
            "password_hash": password_hash,
            "role": "technician",
            "team": t["team"]
        })
        print(f"✅ User: {t['username']} | Pass: password")

    await db.disconnect()
    print("✨ Opération réussie !")

if __name__ == "__main__":
    asyncio.run(fix_tech_logins())
