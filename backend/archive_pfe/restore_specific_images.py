import requests
import os
import asyncio
from prisma import Prisma

# On cible uniquement ces deux là pour remise à l'état "industriel propre"
RESTORE_TARGETS = [
    {"name": "Chauffage cristalisateur", "tag": "industrial,heater"},
    {"name": "Sonde température", "tag": "industrial,sensor"}
]

async def restore_specific_images():
    db = Prisma()
    await db.connect()
    
    print("🔄 Restauration des images pour Chauffage et Sonde...")
    
    target_dir = "static/parts"
    os.makedirs(target_dir, exist_ok=True)
    
    import time
    version = int(time.time())

    for target in RESTORE_TARGETS:
        part = await db.stock.find_first(where={"name": {"contains": target["name"]}})
        if part:
            print(f"   📦 Restauration de : {part.name} (ID {part.id})")
            file_path = f"static/parts/part_{part.id}.jpg"
            
            # On utilise LoremFlickr avec un tag industriel et le verrou de l'ID
            url = f"https://loremflickr.com/400/400/{target['tag']}?lock={part.id}"
            
            try:
                resp = requests.get(url, timeout=15)
                if resp.status_code == 200:
                    with open(file_path, "wb") as f:
                        f.write(resp.content)
                    
                    # Mise à jour URL en base avec cache-busting
                    new_url = f"/static/parts/part_{part.id}.jpg?v={version}"
                    await db.stock.update(where={"id": part.id}, data={"image": new_url})
                    print(f"   ✅ Image restaurée avec succès.")
                else:
                    print(f"   ❌ Erreur lors du téléchargement.")
            except Exception as e:
                print(f"   ⚠️ Erreur : {e}")
        else:
            print(f"   ❓ Pièce '{target['name']}' non trouvée.")

    await db.disconnect()
    print("\n✨ Terminé ! Le Chauffage et la Sonde sont revenus à la normale.")

if __name__ == "__main__":
    asyncio.run(restore_specific_images())
