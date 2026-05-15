import asyncio
import os
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def debug_fields():
    if not sap_client.login_sl():
        return

    # On demande un seul type de problème pour voir les noms des champs
    url = f"{os.getenv('SAP_SL_URL')}/ServiceCallProblemTypes?$top=1"
    resp = sap_client._sl_session.get(url, verify=False)
    
    print("--- STRUCTURE SERVICE CALL PROBLEM TYPES ---")
    print(resp.text)

if __name__ == "__main__":
    debug_fields()
