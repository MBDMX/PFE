
import asyncio
from prisma import Prisma
import os
import sys
sys.path.append(os.getcwd())

async def clean_and_seed_techs():
    db = Prisma()
    await db.connect()
    
    print("🧹 Nettoyage des techniciens...")
    
    # On supprime tous les utilisateurs ayant le rôle 'technician'
    # On fait attention aux dépendances (normalement vides après le reset_db_workorders)
    try:
        # On vide les sessions d'abord pour pouvoir supprimer les users
        await db.worksession.delete_many()
        # On supprime tous les techniciens
        await db.user.delete_many(where={"role": "technician"})
        print("✅ Tous les anciens techniciens ont été supprimés.")
    except Exception as e:
        print(f"⚠️ Erreur lors du nettoyage : {e}")

    techs = [
        {"name": "Marc Méca", "username": "marc_meca", "email": "marc.meca@gmao.tn", "team": "Maint-Meca"},
        {"name": "Henri Hydra", "username": "henri_hydra", "email": "henri.hydra@gmao.tn", "team": "Maint-Hydrique"},
        {"name": "Hubert HVAC", "username": "hubert_hvac", "email": "hubert.hvac@gmao.tn", "team": "Utility-Hvac"},
        {"name": "Éric Élec", "username": "eric_elec", "email": "eric.elec@gmao.tn", "team": "Maint-Elec"},
    ]

    print("🌱 Création des techniciens de démo officiels...")
    for t in techs:
        await db.user.create(data={
            "name": t["name"],
            "username": t["username"],
            "email": t["email"],
            "password_hash": "pbkdf2:sha256:260000$demo$hash", # password123
            "role": "technician",
            "team": t["team"]
        })
        print(f"✅ {t['name']} créé.")

    await db.disconnect()
    print("✨ Liste des techniciens nettoyée et prête !")

if __name__ == "__main__":
    asyncio.run(clean_and_seed_techs())
