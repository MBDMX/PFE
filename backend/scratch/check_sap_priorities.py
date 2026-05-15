
import os
import sys
import json
sys.path.append(os.getcwd())
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def check_priorities():
    sap_client.login_pf()
    print("🔍 Analyse des priorités SAP pour les 10 derniers OT...")
    
    # On récupère les 10 derniers
    orders = sap_client._pf_get("/odata/ProcessForce/MaintenanceOrder?$top=10&$orderby=DocEntry desc")
    
    if orders and "value" in orders:
        for o in orders["value"]:
            doc_entry = o.get("DocEntry")
            priority = o.get("U_MOPriority")
            remarks = o.get("U_Remarks", "")[:30]
            print(f"OT #{doc_entry} | Priorité SAP: '{priority}' | Titre: {remarks}...")
    else:
        print("❌ Impossible de récupérer les ordres.")

if __name__ == "__main__":
    check_priorities()
