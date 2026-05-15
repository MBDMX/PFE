import sys
import os
sys.path.append(os.getcwd())
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def query_checklists():
    sap_client.login_pf()
    # On tente de voir si l'entité Checklist existe globalement
    checklists = sap_client._pf_get("/odata/ProcessForce/Checklist?$top=5")
    print(f"--- Global Checklists ({len(checklists)} found) ---")
    for c in checklists:
        print(c)

if __name__ == "__main__":
    query_checklists()
