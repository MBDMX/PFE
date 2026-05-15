import asyncio
from prisma import Prisma
import os
import shutil

async def apply_part_images():
    db = Prisma()
    await db.connect()

    # Chemins des images générées (à adapter selon les noms réels générés par l'outil)
    # Note: Je cherche les fichiers les plus récents dans le dossier brain
    brain_dir = r"C:\Users\Mohamed BR\.gemini\antigravity\brain\12f6b9eb-a6d9-4726-bbd3-0f1d0629333e"
    target_dir = os.path.join(os.getcwd(), "static", "parts")
    os.makedirs(target_dir, exist_ok=True)

    # Dictionnaire des mappings [Référence -> Préfixe du nom de fichier]
    mappings = {
        "EX0202EDV0202": "industrial_screw",
        "EX0211EM0203": "industrial_gearbox"
    }

    print("🖼️ Application des images aux pièces...")

    for ref, prefix in mappings.items():
        # Trouver le fichier généré le plus récent commençant par le préfixe
        files = [f for f in os.listdir(brain_dir) if f.startswith(prefix) and f.endswith(".png")]
        if not files:
            print(f"⚠️ Aucune image trouvée pour {prefix}")
            continue
        
        files.sort(reverse=True) # Plus récent en premier
        source_path = os.path.join(brain_dir, files[0])
        
        # Nom de fichier cible
        target_filename = f"{ref}.png"
        target_path = os.path.join(target_dir, target_filename)

        # Copier le fichier
        shutil.copy2(source_path, target_path)
        print(f"✅ Image copiée: {target_filename}")

        # Mettre à jour la base de données
        # On utilise le chemin relatif attendu par le frontend (/static/parts/...)
        db_path = f"/static/parts/{target_filename}"
        await db.stock.update_many(
            where={"reference": ref},
            data={"image": db_path}
        )
        print(f"🔗 Base de données mise à jour pour {ref}")

    await db.disconnect()
    print("\n✨ Opération terminée ! Les images sont prêtes.")

if __name__ == "__main__":
    asyncio.run(apply_part_images())
