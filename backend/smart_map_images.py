import shutil
import os
import asyncio
import re
from prisma import Prisma

SOURCE_DIR = r"C:\Users\Mohamed BR\.gemini\antigravity\brain\12f6b9eb-a6d9-4726-bbd3-0f1d0629333e"

async def smart_map():
    db = Prisma()
    await db.connect()
    
    print(f"📂 Scan du dossier: {SOURCE_DIR}")
    try:
        files = os.listdir(SOURCE_DIR)
        print(f"📄 Fichiers détectés ({len(files)}): {', '.join(files[:10])}...")
    except Exception as e:
        print(f"❌ Erreur lecture dossier: {e}")
        await db.disconnect()
        return

    target_dir = "static/parts"
    os.makedirs(target_dir, exist_ok=True)
    version = int(asyncio.get_event_loop().time())

    # On récupère toutes les pièces pour faire un matching intelligent
    parts = await db.stock.find_many()
    
    mapping_count = 0

    for file_name in files:
        if not file_name.lower().endswith(('.png', '.jpg', '.jpeg')):
            continue
            
        # On nettoie le nom du fichier pour le matching (ex: "Cuve cristalisateur.png" -> "cuve cristalisateur")
        clean_name = os.path.splitext(file_name)[0].lower().strip()
        
        # On cherche une pièce dont le nom contient ce nom de fichier ou vice-versa
        matched_part = None
        for p in parts:
            p_name = p.name.lower()
            # Matching si le nom de la pièce contient le nom du fichier ou l'inverse
            if clean_name in p_name or p_name in clean_name:
                matched_part = p
                break
        
        if matched_part:
            source_path = os.path.join(SOURCE_DIR, file_name)
            target_path = os.path.join(target_dir, f"part_{matched_part.id}.jpg")
            
            try:
                shutil.copy2(source_path, target_path)
                new_url = f"/static/parts/part_{matched_part.id}.jpg?v={version}"
                await db.stock.update(where={"id": matched_part.id}, data={"image": new_url})
                print(f"✅ MATCH : '{file_name}' -> '{matched_part.name}' (ID {matched_part.id})")
                mapping_count += 1
            except Exception as e:
                print(f"⚠️ Erreur copie pour {file_name}: {e}")

    await db.disconnect()
    print(f"\n✨ Opération terminée : {mapping_count} images ont été affectées !")
    print("💡 Rafraîchis la page avec Ctrl+F5.")

if __name__ == "__main__":
    asyncio.run(smart_map())
