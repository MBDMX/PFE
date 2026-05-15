import os
import shutil

def force_apply_images():
    brain_dir = r"C:\Users\Mohamed BR\.gemini\antigravity\brain\12f6b9eb-a6d9-4726-bbd3-0f1d0629333e"
    target_dir = os.path.join(os.getcwd(), "static", "parts")

    # Mapping ID -> Prefix
    mappings = {
        "49": "industrial_screw",
        "190": "industrial_gearbox"
    }

    print("🚀 Écrasement des images par les versions premium...")

    for part_id, prefix in mappings.items():
        files = [f for f in os.listdir(brain_dir) if f.startswith(prefix) and f.endswith(".png")]
        if not files:
            print(f"⚠️ Image {prefix} non trouvée.")
            continue
        
        files.sort(reverse=True)
        source_path = os.path.join(brain_dir, files[0])
        
        # On force le nom part_X.jpg (même si c'est un PNG, le navigateur s'en sortira)
        target_filename = f"part_{part_id}.jpg"
        target_path = os.path.join(target_dir, target_filename)

        shutil.copy2(source_path, target_path)
        print(f"✅ Remplacé: {target_filename} avec {files[0]}")

    print("\n✨ Terminé ! Actualise ta page, les images devraient être là.")

if __name__ == "__main__":
    force_apply_images()
