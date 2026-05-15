import asyncio
from prisma import Prisma

async def check_db():
    db = Prisma()
    try:
        print("📡 Tentative de connexion à la base de données...")
        await db.connect()
        print("✅ Connecté !")
        
        count = await db.workorder.count()
        print(f"📊 Nombre d'ordres de travail : {count}")
        
        machines = await db.machine.count()
        print(f"🚜 Nombre de machines : {machines}")
        
        await db.disconnect()
        print("🔌 Déconnecté.")
    except Exception as e:
        print(f"❌ Erreur DB : {e}")

if __name__ == "__main__":
    asyncio.run(check_db())
