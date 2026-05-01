import shutil
import os
import asyncio
from prisma import Prisma

SOURCE_DIR = r"C:\Users\Mohamed BR\.gemini\antigravity\brain\12f6b9eb-a6d9-4726-bbd3-0f1d0629333e"

# On cible précisément les 2 qui posent problème avec les bons artifacts
FINAL_FIXES = [
    {"id": 1, "artifact": "media__1777470275228.png", "name": "CUVE"},
    {"id": 173, "artifact": "media__1777471202347.png", "name": "RESISTANCES"}
]

async def final_push():
    db = Prisma()
    await db.connect()
    
    target_dir = "static/parts"
    os.makedirs(target_dir, exist_ok=True)
    version = int(asyncio.get_event_loop().time())

    for fix in FINAL_FIXES:
        source_path = os.path.join(SOURCE_DIR, fix["artifact"])
        target_path = os.path.join(target_dir, f"part_{fix['id']}.jpg")
        
        if os.path.exists(source_path):
            shutil.copy2(source_path, target_path)
            # On change l'URL avec un nouveau paramètre ?force= pour battre le cache
            new_url = f"/static/parts/part_{fix['id']}.jpg?force={version}"
            await db.stock.update(where={"id": fix["id"]}, data={"image": new_url})
            print(f"✅ {fix['name']} (ID {fix['id']}) forcé avec l'image correcte.")
        else:
            print(f"❌ Impossible de trouver l'image source pour {fix['name']}")

    await db.disconnect()
    print("\n🚀 Terminé ! Cette fois c'est la bonne. Rafraîchis la page !")

if __name__ == "__main__":
    asyncio.run(final_push())
