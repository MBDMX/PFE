
import os
import sys
import json
sys.path.append(os.getcwd())
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def inspect_mo():
    sap_client.login_pf()
    # On prend l'OT 11 qui existe
    order = sap_client._pf_get("/odata/ProcessForce/MaintenanceOrder(11)")
    if order:
        print("Maintenance Order Keys & Types:")
        for k, v in order.items():
            print(f"  {k}: {type(v).__name__} = {v}")
    else:
        print("Order 11 not found")

if __name__ == "__main__":
    inspect_mo()
