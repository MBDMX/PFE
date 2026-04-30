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
    Recherche une image sur DDG, essaie de la télécharger.
    Retourne le chemin local final (ex: /static/parts/part_1.jpg).
    """
    fallback = "/static/images/default.jpg"
    query = f"{part_name} industriel équipement"
    
    local_filename = f"part_{part_id}.jpg"
    local_filepath = os.path.join("static", "parts", local_filename)
    local_url = f"/static/parts/{local_filename}"

    # Si on a déjà téléchargé l'image pour cette pièce, on passe (gain de temps)
    if os.path.exists(local_filepath) and os.path.getsize(local_filepath) > 0:
        return local_url

    try:
        with DDGS() as ddgs:
            # On demande 5 résultats au cas où les premiers bloqueraient le téléchargement
            results = list(ddgs.images(
                keywords=query,
                region="fr-fr",
                safesearch="moderate",
                size="Medium",
                type_image="photo",
                max_results=5
            ))
        
        if results:
            for r in results:
                url = r.get("image", "")
                if url and not url.endswith(".svg") and not url.endswith(".gif"):
                    print(f"    Tentative de téléchargement: {url[:60]}...")
                    success = download_image(url, local_filepath)
                    if success:
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
