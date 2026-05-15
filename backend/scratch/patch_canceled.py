
import os
import sys
import json
sys.path.append(os.getcwd())
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def patch_canceled_field():
    sap_client.login_pf()
    doc_entry = 13
    print(f"🧪 Tentative de passage du champ système Canceled à 'Yes' pour l'OT #{doc_entry}...")
    
    payload = {"Canceled": "Yes"}
    url = f"/odata/ProcessForce/MaintenanceOrder({doc_entry})"
    res = sap_client._pf_patch(url, payload)
    
    if res:
        print("✅ Champ Canceled mis à jour avec succès !")
    else:
        print("❌ Rejeté (Le champ Canceled est probablement en lecture seule).")

if __name__ == "__main__":
    patch_canceled_field()
