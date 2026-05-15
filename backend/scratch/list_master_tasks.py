import sys
import os
sys.path.append(os.getcwd())
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def list_master_tasks():
    sap_client.login_pf()
    tasks = sap_client._pf_get("/odata/ProcessForce/Task?$top=5")
    print(f"--- Master Data Tasks ({len(tasks)} found) ---")
    for t in tasks:
        print(f"Code: {t.get('Code')}, Name: {t.get('Name')}")

if __name__ == "__main__":
    list_master_tasks()
