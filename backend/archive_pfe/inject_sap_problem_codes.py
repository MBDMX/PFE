import asyncio
import os
import requests
from dotenv import load_dotenv
from app.sap.client import sap_client

load_dotenv()

def inject_codes():
    print("Connexion au Service Layer SAP...")
    if not sap_client.login_sl():
        print("ÉCHEC de connexion au Service Layer")
        return

    # URL pour les types de problèmes
    base_url = os.getenv('SAP_SL_URL')
    url = f"{base_url}/ServiceCallProblemTypes"
    
    codes_to_add = [
        {"Name": "Fuite d'huile"},
        {"Name": "Panne Électrique"},
        {"Name": "Moteur Surchauffé"},
        {"Name": "Usure Courroie"}
    ]

    print("\n--- INJECTION DES CODES DE PANNES ---")
    
    for code in codes_to_add:
        try:
            # On utilise la session existante du client SAP
            resp = sap_client._sl_session.post(url, json=code, verify=False, timeout=15)
            if resp.status_code in [201, 204]:
                print(f"✅ Succès : {code['Name']} ajouté.")
            elif resp.status_code == 400 and "already exists" in resp.text:
                print(f"ℹ️ Info : {code['Name']} existe déjà.")
            else:
                print(f"❌ Erreur pour {code['Name']} ({resp.status_code}): {resp.text}")
        except Exception as e:
            print(f"⚠️ Erreur de connexion : {e}")

if __name__ == "__main__":
    inject_codes()
