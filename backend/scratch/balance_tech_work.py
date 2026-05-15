import asyncio
from prisma import Prisma
import os
import sys

# Ajouter le chemin pour les imports internes
sys.path.append(os.getcwd())

async def balance_assignments():
    db = Prisma()
    await db.connect()

    print("⚖️ Équilibrage des ordres de travail...")
    
    # 1. Récupérer les IDs officiels des 4 techniciens
    techs = await db.user.find_many(where={"role": "technician"}, order={"id": "asc"})
    tech_ids = [t.id for t in techs]
    
    if not tech_ids:
        print("❌ Aucun technicien trouvé.")
        return

    print(f"👷 Techniciens disponibles: {len(tech_ids)} (IDs: {tech_ids})")

    # 2. Récupérer tous les ordres de travail actifs
    all_orders = await db.workorder.find_many(order={"id": "asc"})
    print(f"📋 Total des ordres de travail à distribuer: {len(all_orders)}")

    # 3. Distribution Round-Robin
    for i, order in enumerate(all_orders):
        # On fait tourner l'index du technicien
        target_tech_id = tech_ids[i % len(tech_ids)]
        
        await db.workorder.update(
            where={"id": order.id},
            data={"technician_id": target_tech_id}
        )
        # print(f"📍 OT #{order.id} -> Tech ID: {target_tech_id}")

    await db.disconnect()
    print(f"\n✨ Distribution terminée ! Chaque technicien a reçu environ {len(all_orders)//len(tech_ids)} OTs.")

if __name__ == "__main__":
    asyncio.run(balance_assignments())
