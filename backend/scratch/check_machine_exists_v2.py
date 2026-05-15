
import os
import sys
import json
sys.path.append(os.getcwd())
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def check_machine_exists():
    sap_client.login_pf()
    # On cherche la machine avec le code que tu as essayé d'utiliser
    code_test = "EX0208SIL02"
    url = f"/odata/ProcessForce/MaintainableItem?$filter=Code eq '{code_test}'"
    res = sap_client._pf_get(url)
    
    if res:
        print(f"✅ Machine trouvée ! Nom: {res[0].get('Name')}")
    else:
        print(f"❌ AUCUNE machine trouvée avec le code '{code_test}'.")
        # On affiche les 5 premières machines pour voir le format des codes
        print("\nExemples de codes valides dans SAP :")
        items = sap_client._pf_get("/odata/ProcessForce/MaintainableItem?$top=5")
        for i in items:
            print(f" - Code: {i.get('Code')} | Nom: {i.get('Name')}")

if __name__ == "__main__":
    check_machine_exists()
