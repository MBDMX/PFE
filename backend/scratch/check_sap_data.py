import json
from app.core.sap_client import sap_client

def check_data():
    print("📡 Connexion à SAP ProcessForce...")
    if not sap_client.login_pf():
        print("❌ Échec de la connexion SAP")
        return

    # 1. Vérifier les Ordres de Travail et leurs Tasks
    print("\n--- 🛠️  ANALYSE DES ORDRES DE TRAVAIL (MaintenanceOrder) ---")
    url_mo = "/odata/ProcessForce/MaintenanceOrder?$top=5&$expand=Tasks"
    mo_data = sap_client._pf_get(url_mo)
    
    if isinstance(mo_data, list) and len(mo_data) > 0:
        for mo in mo_data:
            doc_entry = mo.get("DocEntry")
            tasks = mo.get("Tasks", [])
            template = mo.get("U_TemplateMO", "N/A")
            print(f"OT #{doc_entry} | Template: {template} | Tâches standards: {len(tasks)}")
            for t in tasks:
                print(f"  - [Task] {t.get('U_Description')}")
    else:
        print("⚠️ Aucun Ordre de Travail trouvé ou format invalide.")

    # 2. Vérifier les Points de Contrôle (Checklists)
    print("\n--- 📋 ANALYSE DES CHECKLISTS (TemplateCheckpoint) ---")
    url_cp = "/odata/ProcessForce/TemplateCheckpoint?$top=10"
    cp_data = sap_client._pf_get(url_cp)
    
    if isinstance(cp_data, list) and len(cp_data) > 0:
        print(f"✅ {len(cp_data)} points de contrôle trouvés au total.")
        for cp in cp_data[:5]:
            scope = cp.get("U_CheckScope")
            tmpl = cp.get("U_TemplateMainOrder")
            mach = cp.get("U_MICode")
            print(f"  - Point: {scope} | Lié à Template: {tmpl} | Lié à Machine: {mach}")
    else:
        print("⚠️ Aucun point de contrôle trouvé dans TemplateCheckpoint.")

if __name__ == "__main__":
    check_data()
