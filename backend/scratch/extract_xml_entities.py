import sys
import os

def extract_metadata():
    path = "scratch/sap_metadata.xml"
    if not os.path.exists(path):
        print("❌ Fichier introuvable.")
        return

    with open(path, "r", encoding="utf-8") as f:
        data = f.read()

    entities = ["MaintenanceOrder", "Task", "Checklist"]
    for entity in entities:
        print(f"\n--- Entity: {entity} ---")
        start_tag = f'<EntityType Name="{entity}"'
        start = data.find(start_tag)
        if start != -1:
            end = data.find("</EntityType>", start) + 13
            print(data[start:end])
        else:
            print(f"⚠️ Non trouvé.")

if __name__ == "__main__":
    extract_metadata()
