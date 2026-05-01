import asyncio
from app.db.session import prisma
from app.core.image_service import get_image_url_for_part

async def main():
    await prisma.connect()
    
    print("🚀 Assignation des images pour toutes les pièces (Indépendant de SAP)...")
    all_parts = await prisma.stock.find_many()
    updated = 0
    
    for part in all_parts:
        img_url = get_image_url_for_part(part.name or "")
        await prisma.stock.update(where={"id": part.id}, data={"image": img_url})
        print(f"✅ {part.name} → {img_url}")
        updated += 1
        
    print(f"✨ Terminé ! {updated} pièces mises à jour.")
    await prisma.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
