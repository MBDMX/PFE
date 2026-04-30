import asyncio
import os
import sys

# On ajoute le dossier parent au path pour importer nos modules
sys.path.append(os.getcwd())

from prisma import Prisma
from app.core.image_service import get_image_url_for_part

async def main():
    prisma = Prisma()
    await prisma.connect()
    
    print("🚀 Démarrage du téléchargement forcé des 202 images...")
    
    all_parts = await prisma.stock.find_many()
    total = len(all_parts)
    fixed = 0
    
    for i, part in enumerate(all_parts):
        print(f"🔄 [{i+1}/{total}] Traitement de : {part.name}")
        
        # On télécharge l'image quoi qu'il arrive (forçage)
        new_path = get_image_url_for_part(part.name or "", part.id)
        
        if new_path and new_path.startswith("/static/parts/"):
            await prisma.stock.update(where={"id": part.id}, data={"image": new_path})
            fixed += 1
            print(f"  ✅ Enregistré : {new_path}")
        else:
            print(f"  ❌ Échec pour {part.name}")
            
        # Petite pause pour ne pas saturer Unsplash
        await asyncio.sleep(0.1)
        
    await prisma.disconnect()
    print(f"\n🎉 TERMINÉ ! {fixed}/{total} images ont été téléchargées localement.")

if __name__ == "__main__":
    asyncio.run(main())
