import sys
import os
sys.path.append(os.getcwd())
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def add_tasks_to_sap():
    print("🚀 Connexion à SAP ProcessForce...")
    if not sap_client.login_pf():
        print("❌ Échec de la connexion")
        return

    # On cible l'OT avec DocEntry 11 (le plus récent trouvé)
    doc_entry = 11
    endpoint = f"/odata/ProcessForce/MaintenanceOrder({doc_entry})"
    
    # Structure simplifiée pour tester les champs reconnus
    payload = {
        "Tasks": [
            {
                "LineId": -1,
                "U_Sequence": 1,
                "U_TaskName": "Inspection visuelle du cristalisateur"
            }
        ]
    }
    
    print(f"📡 Envoi de la checklist vers SAP (DocEntry: {doc_entry})...")
    success = sap_client._pf_patch(endpoint, payload)
    
    if success:
        print("✅ Checklist créée avec succès dans SAP !")
        print("🔄 Tu peux maintenant relancer la synchro sur le frontend pour voir les étapes apparaître.")
    else:
        print("❌ Échec de l'ajout de la checklist. Vérifie si le DocEntry 1 existe dans SAP.")

if __name__ == "__main__":
    add_tasks_to_sap()
