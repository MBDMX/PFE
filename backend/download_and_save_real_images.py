"""
Script pour rechercher, TÉLÉCHARGER physiquement et sauvegarder
les vraies images industrielles via DuckDuckGo.
"""
import asyncio
import time
import os
import urllib.request
from duckduckgo_search import DDGS
from app.db.session import prisma

# S'assurer que le dossier pour stocker les images existe
os.makedirs("static/parts", exist_ok=True)

def download_image(url: str, filepath: str) -> bool:
    """Télécharge l'image depuis l'URL vers le chemin spécifié."""
    try:
        # Faux User-Agent pour passer pour un vrai navigateur et éviter les blocages (403)
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as response, open(filepath, 'wb') as out_file:
            out_file.write(response.read())
        return True
    except Exception as e:
        print(f"      [!] Échec du téléchargement ({url[:40]}...): {e}")
        return False

def search_and_download_image(part_name: str, part_id: int) -> str:
    """
    Recherche une image technique précise avec logs de debug.
    """
    fallback = "/static/images/default.jpg"
    # On mixe français et anglais pour plus de résultats techniques précis
    query = f"industrial spare part {part_name} component"
    
    local_filename = f"part_{part_id}.jpg"
    local_filepath = os.path.join("static", "parts", local_filename)
    local_url = f"/static/parts/{local_filename}"

    FORBIDDEN = ["huile", "oil", "lubrifiant", "lubricant", "nettoyant", "spray", "grease", "graisse", "background", "wallpaper"]

    try:
        with DDGS() as ddgs:
            # On cherche 15 résultats pour avoir plus de choix
            results = list(ddgs.images(keywords=query, region="wt-wt", size="Medium", max_results=15))
        
        if results:
            for r in results:
                url = r.get("image", "")
                title = r.get("title", "").lower()
                
                # Log pour comprendre ce qui se passe
                print(f"      [🔍] Test: {title[:50]}...")

                if any(bad in title for bad in FORBIDDEN):
                    continue
                    
                if url and not any(ext in url for ext in [".svg", ".gif"]):
                    if download_image(url, local_filepath):
                        print(f"      [✅] Image choisie: {title[:40]}")
                        return local_url
                    
        return fallback
    except Exception as e:
        print(f"  ⚠️ Erreur recherche pour '{part_name}': {e}")
        return fallback


async def update_and_download_all_images():
    await prisma.connect()
    
    all_parts = await prisma.stock.find_many(order={"id": "asc"})
    total = len(all_parts)
    
    print(f"🚀 Lancement du téléchargement LOCAL pour {total} pièces...\n")
    
    updated = 0
    
    for i, part in enumerate(all_parts, 1):
        name = part.name or "pièce industrielle"
        print(f"\n[{i}/{total}] Traitement: {name}")
        
        local_url = search_and_download_image(name, part.id)
        
        # Mise à jour de la DB avec le chemin LOCAL (ex: /static/parts/part_12.jpg)
        await prisma.stock.update(
            where={"id": part.id},
            data={"image": local_url}
        )
        print(f"  ✅ Sauvegardé dans la DB: {local_url}")
        updated += 1
        
        # Pause pour éviter de se faire bloquer par DuckDuckGo
        time.sleep(1)
    
    await prisma.disconnect()
    
    print(f"\n🎉 EXCELLENT ! {updated} pièces ont maintenant des images téléchargées physiquement sur ton PC !")


if __name__ == "__main__":
    asyncio.run(update_and_download_all_images())
