
import re

def extract_mo_definition():
    path = "scratch/sap_metadata.xml"
    with open(path, "r", encoding="utf-8") as f:
        data = f.read()
    
    # Trouver EntityType MaintenanceOrder
    match = re.search(r'<EntityType Name="MaintenanceOrder">(.*?)</EntityType>', data)
    if match:
        properties = match.group(1)
        print("--- PROPERTIES OF MaintenanceOrder ---")
        for p in re.findall(r'<Property Name="(.*?)" Type="(.*?)"(.*?)/>', properties):
            print(f"Name: {p[0]} | Type: {p[1]} | Extra: {p[2]}")
    else:
        print("EntityType MaintenanceOrder not found.")

if __name__ == "__main__":
    extract_mo_definition()
