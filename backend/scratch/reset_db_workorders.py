
import asyncio
from prisma import Prisma
import os
import sys
sys.path.append(os.getcwd())

async def reset_work_orders():
    db = Prisma()
    await db.connect()
    
    print("🧹 Nettoyage de la base de données locale...")
    
    # Suppression dans l'ordre pour respecter les contraintes d'intégrité
    # Note: On utilise execute_raw pour vider plus vite ou delete_many
    try:
        await db.worksession.delete_many()
        await db.workorderstep.delete_many()
        await db.workorderpart.delete_many()
        await db.partsrequestitem.delete_many()
        await db.partsrequest.delete_many()
        await db.stockmovement.delete_many()
        await db.workorder.delete_many()
    except Exception as e:
        print(f"⚠️ Erreur lors du nettoyage: {e}")
    
    # Réinitialisation du compteur d'ID (Séquence PostgreSQL)
    try:
        # On tente de trouver le nom exact de la séquence
        await db.execute_raw('ALTER SEQUENCE IF EXISTS "WorkOrder_id_seq" RESTART WITH 1;')
        print("✅ Compteur d'ID réinitialisé à 1.")
    except Exception as e:
        print(f"⚠️ Erreur lors de la réinitialisation de la séquence : {e}")

    print("✨ Base de données prête pour une nouvelle synchronisation SAP !")
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(reset_work_orders())
