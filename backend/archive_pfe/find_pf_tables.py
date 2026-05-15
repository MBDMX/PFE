import asyncio
import os
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def find_pf_tables():
    if not sap_client.login_sl():
        return

    # On liste les tables utilisateur (UDT) pour trouver celle de ProcessForce
    url = f"{os.getenv('SAP_SL_URL')}/UserTablesMD?$select=TableName,TableDescription"
    resp = sap_client._sl_session.get(url, verify=False)
    
    print("--- RECHERCHE DES TABLES PROCESSFORCE ---")
    if resp.status_code == 200:
        tables = resp.json().get('value', [])
        pf_tables = [t for t in tables if "PF" in t['TableName']]
        for t in pf_tables:
            print(f"Table: {t['TableName']} - {t['TableDescription']}")
    else:
        print(f"Erreur : {resp.status_code} - {resp.text}")

if __name__ == "__main__":
    find_pf_tables()
