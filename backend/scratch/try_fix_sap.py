import sys
import os
sys.path.append(os.getcwd())
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def try_fix_sap_status():
    print("🚀 Tentative de déblocage de l'OT #11 via changement de statut...")
    sap_client.login_pf()
    
    doc_entry = 11
    endpoint = f"/odata/ProcessForce/MaintenanceOrder({doc_entry})"
    
    # On essaie de passer l'ordre en "Opened" (Ouvert/En cours)
    # Dans le mapping c'est souvent 'Opened'
    payload = {
        "U_MOStatus": "Opened",
        "Tasks": [
            {
                "LineId": -1,
                "U_Sequence": 1,
                "U_TaskName": "Tâche débloquée via API"
            }
        ]
    }
    
    success = sap_client._pf_patch(endpoint, payload)
    
    if success:
        print("✅ Statut mis à jour et tâche envoyée !")
        # On vérifie si la tâche a persisté
        order = sap_client._pf_get(endpoint + "?$expand=Tasks")
        print(f"Tasks count: {len(order.get('Tasks', []))}")
    else:
        print("❌ Échec du déblocage. SAP refuse toujours l'ajout de tâches sur cet objet.")

if __name__ == "__main__":
    try_fix_sap_status()
