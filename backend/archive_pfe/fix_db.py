import asyncio
from prisma import Prisma

async def fix_corrupted_orders():
    print("Connexion à la base de données...")
    db = Prisma()
    await db.connect()
    
    # Trouver tous les OTs corrompus par la date SAP 0001-01-01 ou 1899
    corrupted_orders = await db.workorder.find_many(where={
        "OR": [
            {"planned_start_date": {"contains": "0001"}},
            {"planned_start_date": {"contains": "1899"}},
            {"planned_start_date": {"contains": "Date(-"}}
        ]
    })
    
    print(f"Trouvé {len(corrupted_orders)} ordres de travail corrompus à réparer.")
    
    count = 0
    for order in corrupted_orders:
        # Comme l'erreur 0001-01-01 ne vient QUE du bouton "Déclencher Prévention" 
        # (car le payload SAP était sans date), on sait que ce sont des préventifs.
        
        # On restaure la date à partir de created_at
        new_date = order.created_at.isoformat() if order.created_at else "2026-05-02T10:00:00.000Z"
        
        await db.workorder.update(
            where={"id": order.id},
            data={
                "type": "preventive",
                "planned_start_date": new_date,
                "title": f"Maintenance Préventive (Restaurée) #{order.sap_order_id}"
            }
        )
        count += 1
        print(f"✅ Réparé OT #{order.id} -> Type: Preventive, Date: {new_date[:10]}")
        
    await db.disconnect()
    print(f"\n🎉 {count} OTs réparés avec succès !")

if __name__ == "__main__":
    asyncio.run(fix_corrupted_orders())
