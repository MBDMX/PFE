import shutil
import os
import asyncio
from prisma import Prisma

# Chemins des images que TU as fournies (basés sur les artifacts de la session)
# Je vais les copier directement vers les dossiers du projet
SOURCE_DIR = r"C:\Users\Mohamed BR\.gemini\antigravity\brain\12f6b9eb-a6d9-4726-bbd3-0f1d0629333e"

# Mapping : Quel artifact va sur quelle pièce
FIXES = [
    {"name": "cuve", "artifact": "media__1777470275228.png"},
    {"name": "turbo", "artifact": "media__1777471202347.png"},
    {"name": "regulateur", "artifact": "media__1777471527555.png"},
    {"name": "chauffage", "artifact": "media__1777471202347.png"} # On utilise la même image pour le chauffage
]

async def apply_your_images():
    db = Prisma()
    await db.connect()
    
    print("🚀 [DIRECT COPY] Application de TES images réelles...")
    
    target_dir = "static/parts"
    os.makedirs(target_dir, exist_ok=True)
    
    import time
    version = int(time.time())
    
    for fix in FIXES:
        part = await db.stock.find_first(where={"name": {"contains": fix["name"]}})
        if part:
            source_path = os.path.join(SOURCE_DIR, fix["artifact"])
            target_path = os.path.join(target_dir, f"part_{part.id}.jpg")
            
            if os.path.exists(source_path):
                shutil.copy2(source_path, target_path)
                
                # Mise à jour URL en base avec cache-busting (?v=...)
                local_url = f"/static/parts/part_{part.id}.jpg?v={version}"
                await db.stock.update(where={"id": part.id}, data={"image": local_url})
                print(f"✅ {fix['name']} mis à jour avec TON image.")
            else:
                print(f"⚠️ Artifact source non trouvé: {fix['artifact']}")
        else:
            print(f"❓ Pièce '{fix['name']}' non trouvée.")

    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(apply_your_images())
