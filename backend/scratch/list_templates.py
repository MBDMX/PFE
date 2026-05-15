import sys
import os
sys.path.append(os.getcwd())
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def list_templates():
    sap_client.login_pf()
    # On cherche l'entité qui gère les templates d'ordres de maintenance
    # Souvent MaintenanceOrderTemplate ou similaire
    templates = sap_client._pf_get("/odata/ProcessForce/MaintenanceOrderTemplate")
    print(f"--- Maintenance Order Templates ({len(templates)} found) ---")
    for t in templates:
        print(f"Code: {t.get('Code')}, Name: {t.get('Name')}")

if __name__ == "__main__":
    list_templates()
