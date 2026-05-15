
import os
import sys
import json
sys.path.append(os.getcwd())
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def inspect_mi_keys():
    sap_client.login_pf()
    items = sap_client._pf_get("/odata/ProcessForce/MaintainableItem?$top=1")
    if items:
        print("Maintainable Item Keys:", list(items[0].keys()))
        print("Exemple de Code machine:", items[0].get('Code') or items[0].get('U_Code') or items[0].get('MICode'))
    else:
        print("Aucune machine trouvée")

if __name__ == "__main__":
    inspect_mi_keys()
