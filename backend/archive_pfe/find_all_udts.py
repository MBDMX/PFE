import asyncio
import os
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def find_all_udts():
    if not sap_client.login_sl():
        return

    url = f"{os.getenv('SAP_SL_URL')}/UserTablesMD?$select=TableName,TableDescription"
    resp = sap_client._sl_session.get(url, verify=False)
    
    print("--- RECHERCHE GLOBALE DES TABLES ---")
    if resp.status_code == 200:
        tables = resp.json().get('value', [])
        # On cherche tout ce qui ressemble à PROB, FAIL, CAUSE, DEFECT
        keywords = ["PROB", "FAIL", "CAUSE", "DEFECT"]
        found = []
        for t in tables:
            name = t['TableName'].upper()
            desc = t['TableDescription'].upper()
            if any(k in name or k in desc for k in keywords):
                found.append(t)
        
        if not found:
            print("Aucune table trouvée avec ces mots-clés.")
            # On affiche tout pour être sûr
            print("\nListe complète des tables (@) :")
            for t in tables:
                print(f"  {t['TableName']} - {t['TableDescription']}")
        else:
            for t in found:
                print(f"✅ Table trouvée : {t['TableName']} - {t['TableDescription']}")
    else:
        print(f"Erreur : {resp.status_code}")

if __name__ == "__main__":
    find_all_udts()
