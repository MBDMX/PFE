import asyncio
import os
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def inspect_defect_table():
    if not sap_client.login_sl():
        return

    # On regarde la structure de la table CT_PF_ODEF
    url = f"{os.getenv('SAP_SL_URL')}/U_CT_PF_ODEF?$top=1"
    resp = sap_client._sl_session.get(url, verify=False)
    
    print("--- STRUCTURE TABLE DEFECTS (CT_PF_ODEF) ---")
    print(resp.text)

if __name__ == "__main__":
    inspect_defect_table()
