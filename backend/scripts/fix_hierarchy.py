import asyncio
from prisma import Prisma

async def fix_demo_hierarchy():
    db = Prisma()
    await db.connect()
    
    print("🚀 Démarrage du nettoyage des données de démo...")
    
    # 1. Créer ou récupérer les responsables (Managers)
    managers = []
    for name in ["Jean Dupont", "Alice Martin"]:
        username = name.lower().replace(" ", ".")
        m = await db.user.find_first(where={"name": name})
        if not m:
            m = await db.user.create(data={
                "username": username,
                "email": f"{username}@demo.com",
                "password_hash": "dummy",
                "role": "manager",
                "name": name
            })
            print(f"✅ Manager créé : {name}")
        managers.append(m)
        
    # 2. Assigner des managers aux techniciens
    techs = await db.user.find_many(where={"role": "technician"})
    for i, tech in enumerate(techs):
        mgr = managers[i % len(managers)]
        await db.user.update(
            where={"id": tech.id},
            data={"manager_id": mgr.id}
        )
        print(f"🔗 Tech '{tech.username}' lié à Manager '{mgr.name}'")
        
    # 3. Mettre à jour les OT existants
    wos = await db.workorder.find_many()
    for wo in wos:
        resp = "Jean Dupont"
        if wo.technician_id:
            tech = await db.user.find_unique(where={"id": wo.technician_id})
            if tech and tech.manager_id:
                mgr = await db.user.find_unique(where={"id": tech.manager_id})
                if mgr: resp = mgr.name
        
        await db.workorder.update(
            where={"id": wo.id},
            data={"responsible_person": resp}
        )
        
    print(f"✅ Terminé ! {len(techs)} techniciens et {len(wos)} OT mis à jour.")
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(fix_demo_hierarchy())
