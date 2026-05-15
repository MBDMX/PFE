import shutil
import os
import asyncio
import time
from prisma import Prisma

# Dossier où sont tes photos
SOURCE_DIR = r"C:\Users\Mohamed BR\.gemini\antigravity\brain\12f6b9eb-a6d9-4726-bbd3-0f1d0629333e"

# Les 4 items demandés
TARGETS = [
    {"name": "Cuve cristalisateur", "file": "Cuve cristalisateur.png"},
    {"name": "Turbo d'air chaud", "file": "Turbo d'air chaud.png"},
    {"name": "Résistance", "file": "Résistances chauffage.png"}, # On cherche 'Résistance' ou 'Chauffage'
    {"name": "Ventilation air chaud", "file": "Ventilation air chaud.png"},
    {"name": "Chauffage cristalisateur", "file": "Chauffage cristalisateur.jfif"},
    {"name": "Sonde température", "file": "Sonde température.png"}
]

async def fix_only_these_items():
    db = Prisma()
    await db.connect()
    
    print(f"🚀 [START] Correction ciblée des 4 items prioritaires...")
    
    target_dir = "static/parts"
    os.makedirs(target_dir, exist_ok=True)
    version = int(time.time())

    # On récupère toutes les pièces pour le matching
    parts = await db.stock.find_many()
    
    for target in TARGETS:
        print(f"\n🔎 Recherche pour: {target['name']}")
        
        # Trouver toutes les pièces qui matchent le nom
        matched_parts = [p for p in parts if target['name'].lower() in p.name.lower()]
        
        # Fallback pour Résistances
        if target['name'] == "Résistance" and not matched_parts:
             matched_parts = [p for p in parts if "chauffage" in p.name.lower() and "pompe" not in p.name.lower()]

        if not matched_parts:
            print(f"   ❌ Aucune pièce trouvée en base pour '{target['name']}'")
            continue

        # Trouver le fichier source
        source_path = os.path.join(SOURCE_DIR, target['file'])
        # Tester aussi en .jpg si .png n'existe pas
        if not os.path.exists(source_path):
            source_path = source_path.replace(".png", ".jpg")
            
        if os.path.exists(source_path):
            for part in matched_parts:
                target_path = os.path.join(target_dir, f"part_{part.id}.jpg")
                shutil.copy2(source_path, target_path)
                
                # Mise à jour URL avec paramètre force pour le cache
                new_url = f"/static/parts/part_{part.id}.jpg?force={version}"
                await db.stock.update(where={"id": part.id}, data={"image": new_url})
                print(f"   ✅ APPLIQUÉ à ID {part.id}: {part.name}")
        else:
            print(f"   ❌ Fichier source introuvable: {target['file']}")

    await db.disconnect()
    print("\n✨ C'est fini ! Rafraîchis ta page (F5).")

if __name__ == "__main__":
    asyncio.run(fix_only_these_items())
