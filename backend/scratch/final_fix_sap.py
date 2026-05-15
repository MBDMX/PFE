import sys
import os
sys.path.append(os.getcwd())
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def final_fix_attempt():
    print("🚀 Ultime tentative : Passage en statut 'Released' (4) et ajout de tâche...")
    sap_client.login_pf()
    
    doc_entry = 11
    endpoint = f"/odata/ProcessForce/MaintenanceOrder({doc_entry})"
    
    # On utilise l'ENTIER 4 pour 'Released'
    payload = {
        "U_MOStatus": 4, 
        "Tasks": [
            {
                "LineId": -1,
                "U_Sequence": 1,
                "U_TaskName": "Tâche insérée après déblocage statut"
            }
        ]
    }
    
    success = sap_client._pf_patch(endpoint, payload)
    
    if success:
        print("✅ INCROYABLE ! SAP a accepté le changement et l'injection.")
        order = sap_client._pf_get(endpoint + "?$expand=Tasks")
        print(f"Tasks count in SAP: {len(order.get('Tasks', []))}")
    else:
        print("❌ Même avec le code numérique, SAP refuse. C'est un verrou métier (Business Logic) sur ton instance.")

if __name__ == "__main__":
    final_fix_attempt()
