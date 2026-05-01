import shutil
import os
import asyncio
from prisma import Prisma

# Dossier où sont TES images
SOURCE_DIR = r"C:\Users\Mohamed BR\.gemini\antigravity\brain\12f6b9eb-a6d9-4726-bbd3-0f1d0629333e"

# Mapping DIRECT par ID (plus sûr que le nom)
# Basé sur ton screenshot : 
# 1 = Cuve, 3 = Turbo, 2 = Chauffage, 6 = Régulateur (à confirmer par le listage)
FIXES = [
    {"id": 1, "artifact": "media__1777470275228.png", "label": "CUVE"},
    {"id": 3, "artifact": "media__1777471202347.png", "label": "TURBO/CHAUFFAGE"},
    {"id": 104, "artifact": "media__1777471202347.png", "label": "CHAUFFAGE POMPE"},
    {"id": 6, "artifact": "media__1777471527555.png", "label": "REGULATEUR"}
]

async def diagnostic_and_fix():
    db = Prisma()
    await db.connect()
    
    print("🔍 [STEP 1] Listage des pièces pour vérification des IDs...")
    parts = await db.stock.find_many()
    for p in parts:
        if any(word in p.name.lower() for word in ["cuve", "turbo", "regulateur", "chauffage"]):
            print(f"   📍 ID {p.id}: {p.name}")

    print("\n🚀 [STEP 2] Application forcée par ID...")
    target_dir = "static/parts"
    os.makedirs(target_dir, exist_ok=True)
    
    import time
    version = int(time.time())

    for fix in FIXES:
        source_path = os.path.join(SOURCE_DIR, fix["artifact"])
        target_path = os.path.join(target_dir, f"part_{fix['id']}.jpg")
        
        if os.path.exists(source_path):
            shutil.copy2(source_path, target_path)
            # On force l'URL en base avec un timestamp pour casser le cache
            new_url = f"/static/parts/part_{fix['id']}.jpg?t={version}"
            await db.stock.update(where={"id": fix["id"]}, data={"image": new_url})
            print(f"✅ ID {fix['id']} ({fix['label']}) : Image remplacée.")
        else:
            print(f"❌ Fichier source introuvable : {fix['artifact']}")

    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(diagnostic_and_fix())
