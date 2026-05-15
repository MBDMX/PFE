import sys
import os
sys.path.append(os.getcwd())
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def verify():
    sap_client.login_pf()
    order = sap_client._pf_get("/odata/ProcessForce/MaintenanceOrder(11)?$expand=Tasks")
    if isinstance(order, list) and len(order) > 0:
        order = order[0]
    
    print(f"DocEntry: {order.get('DocEntry')}")
    tasks = order.get("Tasks", [])
    print(f"Tasks count: {len(tasks)}")
    for t in tasks:
        print(f" - Code: {t.get('Code')}, Name: {t.get('U_TaskName')}")

if __name__ == "__main__":
    verify()
