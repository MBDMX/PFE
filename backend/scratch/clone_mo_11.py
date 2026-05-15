
import os
import sys
import json
sys.path.append(os.getcwd())
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def clone_mo_11():
    print("🧪 Tentative de clonage de l'OT #11...")
    sap_client.login_pf()
    
    # 1. Récupérer l'original
    original = sap_client._pf_get("/odata/ProcessForce/MaintenanceOrder(11)")
    if not original:
        print("❌ Impossible de lire l'OT #11")
        return

    # 2. Nettoyer pour la création (enlever les IDs et champs calculés)
    # On ne garde que les champs U_... et les champs de base nécessaires
    payload = {}
    for k, v in original.items():
        if k.startswith("U_") or k in ["Series", "Handwrtten"]:
            payload[k] = v
            
    # 3. Modifier le titre pour le distinguer
    payload["U_Remarks"] = "CLONE DE L'OT 11 - TEST"
    
    print(f"Payload du clone: {json.dumps(payload, indent=2)}")
    
    # 4. Tenter le POST
    url = f"{os.getenv('SAP_PF_URL')}/odata/ProcessForce/MaintenanceOrder"
    resp = sap_client._pf_session.post(
        url, 
        json=payload, 
        headers=sap_client._pf_headers(), 
        timeout=30
    )
    
    print(f"\nRésultat du clonage: {resp.status_code}")
    if resp.status_code in [200, 201]:
        print(f"✅ CLONAGE RÉUSSI ! Nouvel OT: {resp.json().get('DocEntry')}")
    else:
        print(f"❌ Échec: {resp.text}")

if __name__ == "__main__":
    clone_mo_11()
