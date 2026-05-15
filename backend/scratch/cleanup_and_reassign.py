import asyncio
from prisma import Prisma
import os
import sys

# Ajouter le chemin pour les imports internes
sys.path.append(os.getcwd())
from app.core.security import get_password_hash

async def cleanup_and_reassign():
    db = Prisma()
    await db.connect()

    print("🔍 Analyse de la base de données...")
    
    # 1. Créer/Vérifier les 4 techniciens officiels
    official_techs = [
        {"name": "Marc Méca", "username": "tech_meca", "team": "Maint-Meca"},
        {"name": "Henri Hydra", "username": "tech_hydra", "team": "Maint-Hydrique"},
        {"name": "Hubert HVAC", "username": "tech_hvac", "team": "Utility-Hvac"},
        {"name": "Éric Élec", "username": "tech_elec", "team": "Maint-Elec"},
    ]
    
    password_hash = get_password_hash("password")
    official_ids = {}

    for t in official_techs:
        user = await db.user.find_unique(where={"username": t["username"]})
        if not user:
            user = await db.user.create(data={
                "name": t["name"],
                "username": t["username"],
                "email": f"{t['username']}@gmao.tn",
                "password_hash": password_hash,
                "role": "technician",
                "team": t["team"]
            })
            print(f"✅ Créé: {t['username']} (ID: {user.id})")
        else:
            # S'assurer que le rôle est bon
            await db.user.update(where={"id": user.id}, data={"role": "technician"})
            print(f"ℹ️ Existant: {t['username']} (ID: {user.id})")
        official_ids[t['username']] = user.id

    # 2. Trouver tous les techniciens qui ne sont pas officiels
    all_techs = await db.user.find_many(where={"role": "technician"})
    official_id_list = list(official_ids.values())
    bad_techs = [u for u in all_techs if u.id not in official_id_list]
    
    print(f"🗑️ Trouvé {len(bad_techs)} techniciens obsolètes à nettoyer.")

    # 3. Réassigner les OT des "mauvais" vers les "bons"
    # On fait un mapping simple ou on redistribue
    target_tech_id = official_id_list[0] # Par défaut Marc Méca
    
    # Réassigner les OT orphelins (ID nuls ou IDs supprimés)
    updated = await db.workorder.update_many(
        where={
            "OR": [
                {"technician_id": {"not_in": official_id_list}},
                {"technician_id": None}
            ]
        },
        data={"technician_id": target_tech_id}
    )
    print(f"🔄 {updated} Ordres de Travail réassignés à Marc Méca (ID: {target_tech_id})")

    # 4. Supprimer les techniciens obsolètes
    for bt in bad_techs:
        try:
            await db.user.delete(where={"id": bt.id})
            print(f"❌ Supprimé technicien fantôme: {bt.username} (ID: {bt.id})")
        except Exception as e:
            print(f"⚠️ Impossible de supprimer {bt.id}: {e}")

    await db.disconnect()
    print("\n✨ Nettoyage terminé ! Les 4 techniciens sont propres et les OT sont assignés.")

if __name__ == "__main__":
    asyncio.run(cleanup_and_reassign())
