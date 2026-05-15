
import os
import sys
import json
sys.path.append(os.getcwd())
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def force_cancel():
    sap_client.login_pf()
    doc_entry = 13
    print(f"🧪 Tentative d'annulation SYSTÈME de l'OT #{doc_entry}...")
    
    # On tente l'action OData standard /Cancel
    url = f"{os.getenv('SAP_PF_URL')}/odata/ProcessForce/MaintenanceOrder({doc_entry})/Cancel"
    resp = sap_client._pf_session.post(url, headers=sap_client._pf_headers())
    
    print(f"Résultat: {resp.status_code}")
    if resp.status_code < 300:
        print("✅ OT annulé au niveau SYSTÈME SAP !")
    else:
        print(f"❌ Rejeté: {resp.text}")

if __name__ == "__main__":
    force_cancel()
