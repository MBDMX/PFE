import sys
import os
sys.path.append(os.getcwd())
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def post_task_directly():
    print("🚀 Tentative de POST direct sur la collection Tasks...")
    sap_client.login_pf()
    
    doc_entry = 11
    # Note: L'URL pour poster dans une collection liée est souvent l'URL de l'entité parente + /Tasks
    endpoint = f"/odata/ProcessForce/MaintenanceOrder({doc_entry})/Tasks"
    
    # On tente de poster UNE seule tâche pour voir
    payload = {
        "U_TaskName": "Test POST Direct",
        "U_Done": "No"
    }
    
    # On utilise _pf_post
    success = sap_client._pf_post(endpoint, payload)
    
    if success:
        print("✅ POST réussi !")
    else:
        print("❌ Échec du POST direct.")

if __name__ == "__main__":
    post_task_directly()
