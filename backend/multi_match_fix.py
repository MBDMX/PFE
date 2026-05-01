import shutil
import os
import asyncio
from prisma import Prisma

SOURCE_DIR = r"C:\Users\Mohamed BR\.gemini\antigravity\brain\12f6b9eb-a6d9-4726-bbd3-0f1d0629333e"

async def multi_match_fix():
    db = Prisma()
    await db.connect()
    
    print(f"📂 Scan du dossier: {SOURCE_DIR}")
    try:
        files = os.listdir(SOURCE_DIR)
    except Exception as e:
        print(f"❌ Erreur: {e}")
        await db.disconnect()
        return

    target_dir = "static/parts"
    os.makedirs(target_dir, exist_ok=True)
    version = int(asyncio.get_event_loop().time())

    # On récupère TOUTES les pièces
    all_parts = await db.stock.find_many()
    
    mapping_count = 0

    for file_name in files:
        if not file_name.lower().endswith(('.png', '.jpg', '.jpeg')):
            continue
            
        clean_name = os.path.splitext(file_name)[0].lower().strip()
        # On ignore les noms trop courts
        if len(clean_name) < 3: continue

        print(f"\n🔍 Recherche pour le fichier: '{file_name}'")
        
        # On cherche TOUTES les pièces qui matchent
        matched_parts = [
            p for p in all_parts 
            if clean_name in p.name.lower() or p.name.lower() in clean_name
        ]
        
        if not matched_parts:
            # Test spécial pour "Résistance" sans le "s"
            if "résistance" in clean_name:
                matched_parts = [p for p in all_parts if "résistance" in p.name.lower() or "chauffage" in p.name.lower()]
            # Test spécial pour "Régulateur"
            if "régulateur" in clean_name:
                matched_parts = [p for p in all_parts if "régulateur" in p.name.lower()]

        for part in matched_parts:
            source_path = os.path.join(SOURCE_DIR, file_name)
            target_path = os.path.join(target_dir, f"part_{part.id}.jpg")
            
            try:
                shutil.copy2(source_path, target_path)
                new_url = f"/static/parts/part_{part.id}.jpg?v={version}"
                await db.stock.update(where={"id": part.id}, data={"image": new_url})
                print(f"   ✅ APPLIQUÉ à ID {part.id}: {part.name}")
                mapping_count += 1
            except Exception as e:
                print(f"   ⚠️ Erreur pour ID {part.id}: {e}")

    await db.disconnect()
    print(f"\n✨ Succès ! {mapping_count} pièces ont été mises à jour.")
    print("💡 Rafraîchis ta page (Ctrl+F5) !")

if __name__ == "__main__":
    asyncio.run(multi_match_fix())
