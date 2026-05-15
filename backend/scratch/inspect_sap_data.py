import sys
import os
sys.path.append(os.getcwd())

import json
from dotenv import load_dotenv
from app.sap.client import sap_client

# Charger les variables d'environnement
load_dotenv()

def inspect_orders():
    print("🚀 Connexion à SAP ProcessForce...")
    if not sap_client.login_pf():
        print("❌ Échec de la connexion à SAP PF")
        return

    # On récupère les 5 derniers ordres avec leurs tâches
    url = "/odata/ProcessForce/MaintenanceOrder?$top=5&$orderby=DocEntry desc&$expand=Tasks"
    print(f"📡 Récupération de l'URL : {url}")
    
    try:
        orders = sap_client._pf_get(url)
        if not orders:
            print("⚠️ Aucun ordre trouvé ou réponse vide.")
            return

        print(f"✅ {len(orders)} ordres récupérés.\n")
        
        for i, order in enumerate(orders):
            doc_entry = order.get("DocEntry")
            order_id = order.get("U_MONumber", "N/A")
            print(f"--- Ordre #{i+1} (DocEntry: {doc_entry}, ID: {order_id}) ---")
            
            tasks = order.get("Tasks", [])
            print(f"📋 Nombre de tâches (Checklist) : {len(tasks)}")
            
            if tasks:
                for j, task in enumerate(tasks[:3]): # On montre les 3 premières tâches
                    print(f"   Task {j+1}: {task.get('U_TaskDescription')} (Done: {task.get('U_Finished')})")
                if len(tasks) > 3:
                    print(f"   ... ({len(tasks)-3} autres tâches)")
            else:
                print("   ❌ AUCUNE tâche trouvée pour cet ordre.")
            
            print("-" * 40)

    except Exception as e:
        print(f"❌ Erreur lors de l'inspection : {e}")

if __name__ == "__main__":
    inspect_orders()
