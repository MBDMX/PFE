import sys
import os
sys.path.append(os.getcwd())
from app.sap.client import sap_client
from dotenv import load_dotenv
import json

load_dotenv()

def inspect_mo_11():
    sap_client.login_pf()
    # On demande TOUT le contenu de l'OT 11 avec expand
    # On teste plusieurs expands possibles
    url = "/odata/ProcessForce/MaintenanceOrder(11)?$expand=Tasks,Materials,Tools"
    order = sap_client._pf_get(url)
    
    print("--- RAW SAP DATA FOR MO 11 ---")
    print(json.dumps(order, indent=2))
    
    if "Tasks" in order:
        print(f"\n✅ Tasks key found! Count: {len(order['Tasks'])}")
    else:
        print("\n❌ Tasks key NOT found in the response.")
        # On affiche les clés disponibles pour trouver l'alternative
        print(f"Available keys: {list(order.keys())}")

if __name__ == "__main__":
    inspect_mo_11()
