import sys
import os
sys.path.append(os.getcwd())
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def scan_collections():
    sap_client.login_pf()
    # On prend les 20 derniers ordres
    orders = sap_client._pf_get("/odata/ProcessForce/MaintenanceOrder?$top=20&$orderby=DocEntry desc&$expand=Tasks,Materials,Tools")
    
    print(f"🔎 Scan de {len(orders)} ordres...")
    for o in orders:
        t_count = len(o.get("Tasks", []))
        m_count = len(o.get("Materials", []))
        to_count = len(o.get("Tools", []))
        if t_count > 0 or m_count > 0 or to_count > 0:
            print(f"✅ Ordre {o.get('DocEntry')} : Tasks={t_count}, Materials={m_count}, Tools={to_count}")
            if t_count > 0:
                print(f"   Payload exemple Tasks: {o.get('Tasks')[0]}")
                break
    else:
        print("❌ Aucun ordre trouvé avec des données dans les collections.")

if __name__ == "__main__":
    scan_collections()
