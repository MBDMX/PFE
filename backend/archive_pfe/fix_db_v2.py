import asyncio
from prisma import Prisma

async def fix_corrupted_orders_v2():
    print("Connexion à la base de données...")
    db = Prisma()
    await db.connect()
    
    # Trouver tous les OTs 
    orders = await db.workorder.find_many()
    
    count_prev = 0
    count_corr = 0
    
    for order in orders:
        data = {}
        
        # 1. Détecter le vrai TYPE grâce à la description qui a fait l'aller-retour depuis SAP
        # Quand on déclenche une prévention, le titre original ("Maintenance Préventive...") 
        # est envoyé dans le champ U_Remarks de SAP. Donc la description locale contient cette info !
        is_preventive = False
        if order.description and "Préventive" in order.description:
            is_preventive = True
            
        if order.title and "Préventive" in order.title:
            is_preventive = True
            
        # On corrige le type
        real_type = "preventive" if is_preventive else "corrective"
        if order.type != real_type:
            data["type"] = real_type
            
        # 2. Corriger la date si elle est 0001-01-01 (les dates manquantes de SAP)
        if order.planned_start_date and ("0001" in order.planned_start_date or "1899" in order.planned_start_date or "Date(-" in order.planned_start_date):
            # On restaure avec la date de création de l'enregistrement
            data["planned_start_date"] = order.created_at.isoformat() if order.created_at else "2026-05-02T10:00:00.000Z"
            
        if data:
            await db.workorder.update(where={"id": order.id}, data=data)
            if real_type == "preventive": count_prev += 1
            else: count_corr += 1
            print(f"✅ Réparé OT #{order.id} -> Vrai Type: {real_type.upper()}")
            
    await db.disconnect()
    print(f"\n🎉 Terminé ! {count_prev} remis en PREVENTIVE, et {count_corr} remis en CORRECTIVE !")

if __name__ == "__main__":
    asyncio.run(fix_corrupted_orders_v2())
