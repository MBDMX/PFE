import asyncio
import os
import sys
import json
from dotenv import load_dotenv

# Ensure we can import from app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from app.sap.client import sap_client

async def inspect():
    load_dotenv()
    print("Connecting to SAP ProcessForce...")
    if not sap_client.login_pf():
        print("SAP Login Failed!")
        return

    print("Fetching more MaintainableItems from SAP...")
    sap_items = sap_client.get_maintainable_items(top=1000)
    
    unique_types = set()
    unique_classes = set()
    unique_categories = set()
    
    parts = []
    
    for item in sap_items:
        name = (item.get("Name") or "").lower()
        code = (item.get("Code") or "").lower()
        
        unique_types.add(item.get("U_MIType"))
        unique_classes.add(item.get("U_MIClass"))
        unique_categories.add(item.get("U_MICategory"))
        
        if "vice" in name or "ecrou" in name or "boulon" in name:
            parts.append({
                "Code": item.get("Code"),
                "Name": item.get("Name"),
                "Type": item.get("U_MIType"),
                "Class": item.get("U_MIClass"),
                "Category": item.get("U_MICategory")
            })

    print(f"\nTotal items fetched: {len(sap_items)}")
    print("\n--- Unique Fields ---")
    print(f"Types: {list(unique_types)}")
    print(f"Classes: {list(unique_classes)}")
    print(f"Categories: {list(unique_categories)}")
    
    print(f"\n--- Found {len(parts)} items matching 'vice/ecrou/boulon' ---")
    for p in parts[:10]:
        print(json.dumps(p, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(inspect())
