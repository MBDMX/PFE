import os
import urllib.request
import asyncio
from app.db.session import prisma

# S'assurer que le dossier existe
os.makedirs("static/images", exist_ok=True)

IMAGE_CATALOG = {
    "moteur": "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80",
    "pompe": "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800&q=80",
    "cuve": "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=800&q=80",
    "verin": "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&q=80",
    "joint": "https://images.unsplash.com/photo-1611078810243-d8bf0e620583?w=800&q=80",
    "vis": "https://images.unsplash.com/photo-1565514020179-026b92b84bb6?w=800&q=80",
    "roulement": "https://images.unsplash.com/photo-1565514020179-026b92b84bb6?w=800&q=80",
    "capteur": "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800&q=80",
    "vanne": "https://images.unsplash.com/photo-1611078810243-d8bf0e620583?w=800&q=80",
    "engrenage": "https://images.unsplash.com/photo-1565514020179-026b92b84bb6?w=800&q=80",
    "filtre": "https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=800&q=80",
    "resistance": "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80",
    "ventilateur": "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&q=80",
    "turbine": "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&q=80",
    "tuyau": "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800&q=80",
    "cable": "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800&q=80",
    "variateur": "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80",
    "courroie": "https://images.unsplash.com/photo-1565514020179-026b92b84bb6?w=800&q=80",
    "default": "https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=800&q=80"
}

# Fonction pour télécharger les images
def download_all():
    print("📥 Téléchargement des images en local...")
    for name, url in IMAGE_CATALOG.items():
        filepath = f"static/images/{name}.jpg"
        if not os.path.exists(filepath):
            try:
                # Ajout d'un User-Agent pour éviter d'être bloqué par Wikimedia
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req) as response, open(filepath, 'wb') as out_file:
                    out_file.write(response.read())
                print(f"  ✅ {name}.jpg téléchargé")
            except Exception as e:
                print(f"  ❌ Erreur pour {name}: {e}")
        else:
            print(f"  ⚡ {name}.jpg existe déjà")

# Mettre à jour la DB pour pointer vers le dossier local
async def update_db():
    print("\n🔄 Mise à jour de la base de données...")
    await prisma.connect()
    all_parts = await prisma.stock.find_many()
    
    updated = 0
    import re
    
    for part in all_parts:
        name_clean = re.sub(r'[^a-z0-9\s]', ' ', (part.name or "").lower())
        matched_key = "default"
        
        # Chercher le bon mot-clé
        for kw in IMAGE_CATALOG.keys():
            if kw != "default" and kw in name_clean:
                matched_key = kw
                break
                
        # Les alias
        if "cristalisateur" in name_clean: matched_key = "cuve"
        if "cylindre" in name_clean: matched_key = "verin"
        if "ecrou" in name_clean: matched_key = "vis"
        if "sonde" in name_clean: matched_key = "capteur"
        if "clapet" in name_clean: matched_key = "vanne"
        if "reducteur" in name_clean: matched_key = "engrenage"
        if "chauffage" in name_clean: matched_key = "resistance"
        if "conduite" in name_clean: matched_key = "tuyau"
        if "transmission" in name_clean: matched_key = "courroie"
                
        local_url = f"/static/images/{matched_key}.jpg"
        
        await prisma.stock.update(where={"id": part.id}, data={"image": local_url})
        updated += 1
        
    print(f"✨ Terminé ! {updated} pièces pointent maintenant vers des images locales.")
    await prisma.disconnect()

if __name__ == "__main__":
    download_all()
    asyncio.run(update_db())
