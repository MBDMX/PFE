import asyncio
import os
import sys
import requests

sys.path.append(os.getcwd())

from prisma import Prisma

# Mapping manuel : Nom de la pièce -> URL d'image réelle haute qualité
MANUAL_FIXES = {
    "Cuve cristalisateur": "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&q=80",
    "Turbo d'air chaud": "https://images.unsplash.com/photo-159742324403d-c1a5098a12dc?w=600&q=80",
    "Ventilation air chaud": "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=600&q=80"
}

async def manual_repair():
    db = Prisma()
    await db.connect()
    
    print("🎯 [MANUAL FIX] Application des photos réelles pour la capture...")
    
    os.makedirs("static/parts", exist_ok=True)
    
    for name, url in MANUAL_FIXES.items():
        # On cherche la pièce par son nom (insensible à la casse)
        part = await db.stock.find_first(where={"name": {"contains": name}})
        
        if part:
            print(f"📦 Pièce trouvée: {part.name} (ID: {part.id})")
            file_path = f"static/parts/part_{part.id}.jpg"
            
            try:
                print(f"   📥 Téléchargement de la photo réelle...")
                headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
                resp = requests.get(url, headers=headers, timeout=15)
                if resp.status_code == 200:
                    with open(file_path, "wb") as f:
                        f.write(resp.content)
                    
                    # Mise à jour en base
                    local_url = f"/static/parts/part_{part.id}.jpg"
                    await db.stock.update(where={"id": part.id}, data={"image": local_url})
                    print(f"   ✅ Image forcée avec succès !")
                else:
                    print(f"   ❌ Erreur HTTP: {resp.status_code}")
            except Exception as e:
                print(f"   ⚠️ Erreur: {e}")
        else:
            print(f"   ❓ Pièce '{name}' non trouvée dans la base.")

    await db.disconnect()
    print("\n✨ C'est fait ! Rafraîchis ta page pour voir les vraies photos.")

if __name__ == "__main__":
    asyncio.run(manual_repair())
