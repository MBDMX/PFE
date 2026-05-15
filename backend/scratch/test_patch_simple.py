import sys
import os
sys.path.append(os.getcwd())
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def test_patch_simple():
    print("🚀 Test PATCH simple sur U_Remarks...")
    sap_client.login_pf()
    
    doc_entry = 11
    endpoint = f"/odata/ProcessForce/MaintenanceOrder({doc_entry})"
    
    payload = {
        "U_Remarks": "Test de modification via OData - " + os.urandom(2).hex()
    }
    
    success = sap_client._pf_patch(endpoint, payload)
    
    if success:
        print("✅ PATCH simple réussi !")
        # On vérifie
        order = sap_client._pf_get(endpoint)
        print(f"Nouveaux Remarks: {order.get('U_Remarks')}")
    else:
        print("❌ Échec du PATCH simple.")

if __name__ == "__main__":
    test_patch_simple()
