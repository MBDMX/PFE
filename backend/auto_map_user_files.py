import shutil
import os
import asyncio
from prisma import Prisma

# Dossier source où tu as mis tes photos
SOURCE_DIR = r"C:\Users\Mohamed BR\.gemini\antigravity\brain\12f6b9eb-a6d9-4726-bbd3-0f1d0629333e"

# Noms des pièces cibles
PIECE_NAMES = [
    "Cuve cristalisateur",
    "Turbo d'air chaud",
    "Résistances chauffage",
    "Ventilation air chaud",
    "RÉGULATEUR TEMPÉRATURE"
]

async def map_files_to_parts():
    db = Prisma()
    await db.connect()
    
    print(f"📂 Recherche des photos dans: {SOURCE_DIR}")
    
    target_dir = "static/parts"
    os.makedirs(target_dir, exist_ok=True)
    
    import time
    version = int(time.time())

    # Lister tous les fichiers du dossier source
    try:
        files = os.listdir(SOURCE_DIR)
    except Exception as e:
        print(f"❌ Impossible de lire le dossier: {e}")
        await db.disconnect()
        return

    for piece_name in PIECE_NAMES:
        print(f"\n🔍 Traitement de : {piece_name}")
        
        # Trouver la pièce en base (insensible à la casse)
        part = await db.stock.find_first(where={"name": {"contains": piece_name}})
        
        if not part:
            print(f"   ❓ Pièce non trouvée en base de données.")
            continue

        # Chercher un fichier qui correspond au nom (avec extensions possibles)
        found_file = None
        extensions = [".png", ".jpg", ".jpeg", ".PNG", ".JPG", ".JPEG"]
        
        for ext in extensions:
            potential_file = piece_name + ext
            if potential_file in files:
                found_file = potential_file
                break
        
        if found_file:
            source_path = os.path.join(SOURCE_DIR, found_file)
            target_path = os.path.join(target_dir, f"part_{part.id}.jpg")
            
            shutil.copy2(source_path, target_path)
            
            # Mise à jour avec cache-busting
            new_url = f"/static/parts/part_{part.id}.jpg?v={version}"
            await db.stock.update(where={"id": part.id}, data={"image": new_url})
            print(f"   ✅ Fichier '{found_file}' copié vers part_{part.id}.jpg")
        else:
            print(f"   ❌ Aucun fichier trouvé nommé '{piece_name}' (vérifie l'orthographe exacte du fichier)")

    await db.disconnect()
    print("\n✨ Terminé ! Relance ta page pour voir le résultat.")

if __name__ == "__main__":
    asyncio.run(map_files_to_parts())
