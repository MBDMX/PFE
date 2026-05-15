
import os
import sys
import json
sys.path.append(os.getcwd())
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def check_mo_13():
    sap_client.login_pf()
    doc_entry = 13
    print(f"🔍 Vérification de l'OT #{doc_entry} dans SAP...")
    
    order = sap_client._pf_get(f"/odata/ProcessForce/MaintenanceOrder({doc_entry})")
    if order:
        print(f"✅ OT trouvé !")
        print(f"Statut actuel (U_MOStatus): {order.get('U_MOStatus')}")
        print(f"Canceled (champ système): {order.get('Canceled')}")
    else:
        print(f"❌ OT #{doc_entry} introuvable dans SAP.")

if __name__ == "__main__":
    check_mo_13()
