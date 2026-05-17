import os
import glob
import asyncio
from prisma import Prisma

async def main():
    db = Prisma()
    await db.connect()
    
    print("🧹 Réinitialisation de la base de données (image=None, image_verified=False)...")
    await db.stock.update_many(
        where={},
        data={"image": None, "image_verified": False}
    )
    
    print("📂 Suppression des fichiers d'images physiques dans static/parts/...")
    files = glob.glob("static/parts/*.jpg")
    deleted_count = 0
    for f in files:
        try:
            os.remove(f)
            deleted_count += 1
            print(f"   🗑️ Supprimé : {f}")
        except Exception as e:
            print(f"   ❌ Impossible de supprimer {f}: {e}")
            
    print(f"\n✨ Terminé avec succès ! {deleted_count} images physiques supprimées de static/parts/ et base de données nettoyée.")
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
