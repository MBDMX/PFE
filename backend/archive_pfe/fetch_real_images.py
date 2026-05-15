"""
Script ultime : recherche des vraies images industrielles via DuckDuckGo
pour chaque pièce du stock et stocke les URLs directes dans la base de données.
"""
import asyncio
import time
from duckduckgo_search import DDGS
from app.db.session import prisma


def search_image_for_part(part_name: str) -> str:
    """
    Recherche une image réelle sur DuckDuckGo pour une pièce industrielle.
    Retourne l'URL directe de la première image trouvée.
    """
    fallback = "https://loremflickr.com/800/600/industrial,machinery,equipment"
    
    # Nettoyage du nom pour la recherche
    query = f"{part_name} industriel équipement"
    
    try:
        with DDGS() as ddgs:
            results = list(ddgs.images(
                keywords=query,
                region="fr-fr",
                safesearch="moderate",
                size="Medium",
                type_image="photo",
                max_results=3
            ))
        
        if results:
            # Prendre la 1ère image valide (filtre les SVG et GIF)
            for r in results:
                url = r.get("image", "")
                if url and not url.endswith(".svg") and not url.endswith(".gif"):
                    return url
        
        return fallback
    except Exception as e:
        print(f"  ⚠️ Erreur DDG pour '{part_name}': {e}")
        return fallback


async def update_all_images():
    """Met à jour toutes les pièces avec des images réelles trouvées par DuckDuckGo."""
    await prisma.connect()
    
    all_parts = await prisma.stock.find_many(order={"id": "asc"})
    total = len(all_parts)
    
    print(f"🚀 Recherche d'images pour {total} pièces via DuckDuckGo...\n")
    
    updated = 0
    errors = 0
    
    for i, part in enumerate(all_parts, 1):
        name = part.name or "pièce industrielle"
        print(f"[{i}/{total}] Recherche: {name}...")
        
        image_url = search_image_for_part(name)
        
        if image_url:
            await prisma.stock.update(
                where={"id": part.id},
                data={"image": image_url}
            )
            print(f"  ✅ → {image_url[:80]}...")
            updated += 1
        else:
            errors += 1
            print(f"  ❌ Pas d'image trouvée")
        
        # Pause pour éviter le rate-limiting DuckDuckGo
        time.sleep(0.5)
    
    await prisma.disconnect()
    
    print(f"\n🎉 Terminé ! {updated} pièces mises à jour, {errors} erreurs.")


if __name__ == "__main__":
    asyncio.run(update_all_images())
