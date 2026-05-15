
import re

def extract_mo_nav_props():
    path = "scratch/sap_metadata.xml"
    with open(path, "r", encoding="utf-8") as f:
        data = f.read()
    
    match = re.search(r'<EntityType Name="MaintenanceOrder">(.*?)</EntityType>', data)
    if match:
        content = match.group(1)
        print("--- NAVIGATION PROPERTIES ---")
        for nav in re.findall(r'<NavigationProperty Name="(.*?)" Type="(.*?)"', content):
            print(f"Name: {nav[0]} | Type: {nav[1]}")

if __name__ == "__main__":
    extract_mo_nav_props()
