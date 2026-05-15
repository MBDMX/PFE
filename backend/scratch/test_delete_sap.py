
import os
import sys
import json
sys.path.append(os.getcwd())
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def test_delete():
    sap_client.login_pf()
    doc_entry = 12 # L'OT que tu viens de créer
    print(f"🧪 Tentative de suppression de l'OT #{doc_entry}...")
    
    # 1. Tester le DELETE physique
    success = sap_client.delete_maintenance_order(doc_entry)
    
    if success:
        print("✅ SAP a accepté la suppression physique (DELETE).")
    else:
        print("❌ SAP a refusé le DELETE (Normal pour un ERP).")
        print("🔄 Tentative d'annulation (PATCH Status=Cancelled)...")
        
        # 2. Tester l'annulation par statut
        payload = {"U_MOStatus": "Cancelled"}
        url = f"/odata/ProcessForce/MaintenanceOrder({doc_entry})"
        res = sap_client._pf_patch(url, payload)
        
        if res:
            print("✅ OT annulé avec succès dans SAP !")
        else:
            print("❌ Échec de l'annulation également.")

if __name__ == "__main__":
    test_delete()
