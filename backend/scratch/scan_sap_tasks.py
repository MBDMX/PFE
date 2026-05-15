import sys
import os
sys.path.append(os.getcwd())
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def scan_for_tasks():
    print("🚀 Scan des 100 derniers ordres SAP pour trouver une checklist...")
    if not sap_client.login_pf():
        print("❌ Échec de la connexion")
        return

    url = "/odata/ProcessForce/MaintenanceOrder?$top=100&$orderby=DocEntry desc&$expand=Tasks"
    orders = sap_client._pf_get(url)
    
    if not orders:
        print("⚠️ Aucun ordre trouvé.")
        return

    found = False
    for order in orders:
        tasks = order.get("Tasks", [])
        if tasks and len(tasks) > 0:
            print(f"✅ TROUVÉ ! Ordre DocEntry: {order.get('DocEntry')} possède {len(tasks)} tâches.")
            print("🔬 Structure de la première tâche :")
            import json
            print(json.dumps(tasks[0], indent=3))
            found = True
            break
    
    if not found:
        print("❌ Aucun des 100 derniers ordres n'a de checklist. Impossible de copier le format.")
        print("💡 Suggestion : Crée une checklist manuellement dans SAP ProcessForce sur un ordre, puis relance ce script.")

if __name__ == "__main__":
    scan_for_tasks()
