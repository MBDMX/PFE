import asyncio
import os
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def check_field_link():
    if not sap_client.login_sl():
        return

    # On cherche la définition du champ U_ProblemCode dans la table CT_PF_MainOrder
    url = f"{os.getenv('SAP_SL_URL')}/UserFieldsMD?$filter=TableName eq 'CT_PF_MainOrder' and Name eq 'ProblemCode'"
    resp = sap_client._sl_session.get(url, verify=False)
    
    print("--- LIEN DU CHAMP PROBLEM CODE ---")
    if resp.status_code == 200:
        data = resp.json().get('value', [])
        if data:
            field = data[0]
            print(f"Champ: {field['Name']}")
            print(f"Table Liée: {field.get('LinkedTable', 'Aucune')}")
            print(f"Valid Values: {field.get('ValidValuesMD', 'Aucune')}")
        else:
            print("Champ non trouvé dans les métadonnées.")
    else:
        print(f"Erreur : {resp.status_code}")

if __name__ == "__main__":
    check_field_link()
